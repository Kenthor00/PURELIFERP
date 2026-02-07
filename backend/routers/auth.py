"""
PURE LIFE OS - Authentication Router
Login sicuro con rate limiting, audit e game_name obbligatorio
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import logging

from database import get_db
from models import User, Sector, AuditAction, SystemConfig
from auth import create_access_token, create_refresh_token, get_current_user
from services.audit_service import audit_service
from services.security_service import security_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


# ==========================================
# SCHEMAS
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    sector: str
    grade: str
    hierarchy_level: int
    is_sector_chief: bool
    game_name: Optional[str]
    needs_game_name: bool


class SetGameNameRequest(BaseModel):
    game_name: str


class PublicRegisterRequest(BaseModel):
    """Registrazione pubblica per cittadini"""
    email: EmailStr
    password: str
    game_name: str  # Nome in game obbligatorio


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    game_name: Optional[str]
    sector: str
    grade: str
    hierarchy_level: int
    is_sector_chief: bool
    badge_number: Optional[str]
    department: Optional[str]
    presence: str
    needs_game_name: bool
    permissions: list


# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login con rate limiting e audit.
    Se game_name mancante, needs_game_name = true.
    """
    ip_address = _get_client_ip(request)
    user_agent = request.headers.get("user-agent", "")
    
    # Rate limit check
    is_allowed, error_msg = await security_service.check_rate_limit(
        db, login_data.email, ip_address
    )
    if not is_allowed:
        # Log tentativo bloccato
        await audit_service.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            description=f"Rate limit: {error_msg}",
            metadata={"email": login_data.email, "reason": "rate_limit"},
            request=request
        )
        raise HTTPException(status_code=429, detail=error_msg)
    
    # Cerca utente
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Record tentativo fallito
        await security_service.record_login_attempt(
            db, login_data.email, ip_address, success=False, user_agent=user_agent
        )
        await audit_service.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            description="Email non trovata",
            metadata={"email": login_data.email},
            request=request
        )
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Check account lock
    is_locked, lock_msg = await security_service.check_account_lock(db, user)
    if is_locked:
        await audit_service.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            user=user,
            description=lock_msg,
            metadata={"reason": "account_locked"},
            request=request
        )
        raise HTTPException(status_code=403, detail=lock_msg)
    
    # Verifica password
    if not pwd_context.verify(login_data.password, user.password_hash):
        await security_service.record_login_attempt(
            db, login_data.email, ip_address, success=False, user_agent=user_agent
        )
        await security_service.handle_failed_login(db, user)
        await audit_service.log(
            db,
            action=AuditAction.LOGIN_FAILED,
            user=user,
            description="Password errata",
            metadata={"attempts": user.failed_login_attempts},
            request=request
        )
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Login riuscito
    await security_service.record_login_attempt(
        db, login_data.email, ip_address, success=True, user_agent=user_agent
    )
    await security_service.handle_successful_login(db, user)
    
    # Crea token
    access_token = create_access_token(user.id, user.sector.value)
    refresh_token = create_refresh_token(user.id)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.LOGIN_SUCCESS,
        user=user,
        description="Login effettuato",
        request=request
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        name=user.game_name or user.email.split("@")[0],
        email=user.email,
        sector=user.sector.value,
        grade=user.grade,
        hierarchy_level=user.hierarchy_level,
        is_sector_chief=user.is_sector_chief or False,
        game_name=user.game_name,
        needs_game_name=user.needs_game_name
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout con audit"""
    # Aggiorna presenza
    current_user.presence = "offline"
    current_user.last_seen = datetime.now(timezone.utc)
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.LOGOUT,
        user=current_user,
        description="Logout effettuato",
        request=request
    )
    
    return {"message": "Logout effettuato"}


@router.post("/set-game-name")
async def set_game_name(
    request: Request,
    data: SetGameNameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Imposta il nome in game (obbligatorio al primo accesso).
    """
    if not data.game_name or len(data.game_name.strip()) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Il nome in game deve avere almeno 3 caratteri"
        )
    
    if len(data.game_name) > 50:
        raise HTTPException(
            status_code=400, 
            detail="Il nome in game non può superare i 50 caratteri"
        )
    
    old_name = current_user.game_name
    current_user.game_name = data.game_name.strip()
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.GAME_NAME_SET,
        user=current_user,
        description=f"Nome in game impostato: {data.game_name}",
        metadata={"old_name": old_name, "new_name": data.game_name},
        request=request
    )
    
    return {
        "message": "Nome in game impostato con successo",
        "game_name": current_user.game_name
    }


@router.post("/change-password")
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cambio password con validazione policy"""
    # Verifica password attuale
    if not pwd_context.verify(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Password attuale non corretta")
    
    # Valida nuova password
    is_valid, error_msg = security_service.validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Aggiorna password
    current_user.password_hash = pwd_context.hash(data.new_password)
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.PASSWORD_CHANGE,
        user=current_user,
        description="Password modificata",
        request=request
    )
    
    return {"message": "Password modificata con successo"}


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene il profilo utente corrente"""
    from services.permission_service import permission_service
    
    permissions = permission_service.get_user_permissions(current_user)
    
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.game_name or current_user.email.split("@")[0],
        game_name=current_user.game_name,
        sector=current_user.sector.value,
        grade=current_user.grade,
        hierarchy_level=current_user.hierarchy_level,
        is_sector_chief=current_user.is_sector_chief or False,
        badge_number=current_user.badge_number,
        department=current_user.department,
        presence=current_user.presence.value if current_user.presence else "offline",
        needs_game_name=current_user.needs_game_name,
        permissions=[p.value for p in permissions]
    )


@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Rinnova access token usando refresh token"""
    from auth import verify_refresh_token
    
    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Refresh token non valido")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utente non trovato o disabilitato")
    
    new_access_token = create_access_token(user.id, user.sector.value)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# ==========================================
# BOOTSTRAP ADMIN (Solo primo avvio)
# ==========================================

@router.post("/bootstrap")
async def bootstrap_admin(
    request: Request,
    bootstrap_key: str,
    email: EmailStr,
    password: str,
    game_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Crea il primo admin del sistema.
    Funziona SOLO se non esistono admin e la key è corretta.
    """
    import os
    
    expected_key = os.environ.get("ADMIN_BOOTSTRAP_KEY", "")
    if not expected_key or bootstrap_key != expected_key:
        raise HTTPException(status_code=403, detail="Chiave bootstrap non valida")
    
    # Verifica che non esistano già admin
    result = await db.execute(
        select(User).where(User.sector == Sector.ADMIN)
    )
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        raise HTTPException(
            status_code=400, 
            detail="Bootstrap già completato. Esiste già un amministratore."
        )
    
    # Valida password
    is_valid, error_msg = security_service.validate_password(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Crea admin
    admin = User(
        email=email,
        password_hash=pwd_context.hash(password),
        game_name=game_name,
        sector=Sector.ADMIN,
        grade="Super Admin",
        hierarchy_level=10,
        is_active=True
    )
    db.add(admin)
    
    # Segna bootstrap come completato
    config = SystemConfig(key="bootstrap_completed", value="true")
    db.add(config)
    
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.SYSTEM_BOOTSTRAP,
        user=admin,
        description="Bootstrap sistema completato",
        metadata={"admin_email": email},
        request=request
    )
    
    logger.info(f"Bootstrap completato: admin {email} creato")
    
    return {
        "message": "Bootstrap completato. Admin creato.",
        "email": email
    }


# ==========================================
# REGISTRAZIONE PUBBLICA CITTADINI
# ==========================================

@router.post("/register/citizen")
async def register_citizen(
    request: Request,
    data: PublicRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrazione pubblica per cittadini.
    Crea automaticamente un account CIVIL (Cittadino) con hierarchy_level=1.
    
    - Email deve essere unica
    - Password deve rispettare i requisiti di sicurezza
    - game_name è obbligatorio
    """
    # Verifica email non già esistente
    result = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=409, 
            detail="Questa email è già registrata. Prova ad accedere."
        )
    
    # Verifica game_name non vuoto
    if not data.game_name or len(data.game_name.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Il nome in game deve essere di almeno 3 caratteri"
        )
    
    # Valida password
    is_valid, error_msg = security_service.validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Crea utente CIVIL
    citizen = User(
        email=data.email.lower(),
        password_hash=pwd_context.hash(data.password),
        game_name=data.game_name.strip(),
        sector=Sector.CIVIL,
        grade="Cittadino",
        hierarchy_level=1,
        is_active=True,
        is_sector_chief=False
    )
    db.add(citizen)
    await db.commit()
    await db.refresh(citizen)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.USER_CREATE,
        user=citizen,
        entity_type="user",
        entity_id=citizen.id,
        description=f"Registrazione pubblica cittadino: {data.game_name}",
        metadata={
            "email": citizen.email,
            "game_name": citizen.game_name,
            "registration_type": "public_citizen"
        },
        request=request
    )
    
    logger.info(f"Nuovo cittadino registrato: {data.email} ({data.game_name})")
    
    # Genera token per login automatico
    access_token = create_access_token(citizen.id, citizen.sector.value)
    refresh_token = create_refresh_token(citizen.id)
    
    return {
        "message": "Registrazione completata! Benvenuto a Pure Life.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": citizen.id,
        "name": citizen.game_name,
        "email": citizen.email,
        "sector": citizen.sector.value,
        "grade": citizen.grade,
        "game_name": citizen.game_name
    }


def _get_client_ip(request: Request) -> str:
    """Estrae l'IP del client"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
