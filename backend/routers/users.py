"""
PURE LIFE OS - User Management Router
Gestione utenti per capi settore e admin
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import logging

from database import get_db
from models import User, Sector, AuditAction, SECTOR_GRADES
from auth import get_current_user
from services.audit_service import audit_service
from services.security_service import security_service
from services.permission_service import permission_service, Permission

router = APIRouter(prefix="/users", tags=["User Management"])
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==========================================
# SCHEMAS
# ==========================================

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    game_name: str
    sector: str
    grade: str
    hierarchy_level: int
    is_sector_chief: bool = False
    badge_number: Optional[str] = None
    department: Optional[str] = None


class UpdateUserRequest(BaseModel):
    game_name: Optional[str] = None
    grade: Optional[str] = None
    hierarchy_level: Optional[int] = None
    is_sector_chief: Optional[bool] = None
    badge_number: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: int
    email: str
    game_name: Optional[str]
    sector: str
    grade: str
    hierarchy_level: int
    is_sector_chief: bool
    badge_number: Optional[str]
    department: Optional[str]
    is_active: bool
    is_locked: bool
    presence: str
    last_login: Optional[str]
    created_at: str


class SectorGradesResponse(BaseModel):
    sector: str
    grades: dict


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/sector-grades", response_model=List[SectorGradesResponse])
async def get_all_sector_grades(
    current_user: User = Depends(get_current_user)
):
    """Ottiene tutti i gradi disponibili per settore"""
    result = []
    for sector, grades in SECTOR_GRADES.items():
        result.append(SectorGradesResponse(
            sector=sector.value,
            grades={str(level): name for level, name in grades.items()}
        ))
    return result


@router.get("/my-sector", response_model=List[UserResponse])
async def get_my_sector_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene gli utenti del proprio settore"""
    # Verifica permesso
    if current_user.sector == Sector.ADMIN:
        # Admin vede tutti
        result = await db.execute(
            select(User).order_by(User.sector, desc(User.hierarchy_level))
        )
    else:
        # Altri vedono solo il proprio settore
        result = await db.execute(
            select(User)
            .where(User.sector == current_user.sector)
            .order_by(desc(User.hierarchy_level))
        )
    
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.get("/sector/{sector}", response_model=List[UserResponse])
async def get_sector_users(
    sector: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene gli utenti di un settore specifico"""
    try:
        target_sector = Sector(sector)
    except ValueError:
        raise HTTPException(status_code=400, detail="Settore non valido")
    
    # Solo admin o stesso settore
    if current_user.sector != Sector.ADMIN and current_user.sector != target_sector:
        raise HTTPException(status_code=403, detail="Non puoi visualizzare questo settore")
    
    result = await db.execute(
        select(User)
        .where(User.sector == target_sector)
        .order_by(desc(User.hierarchy_level))
    )
    
    users = result.scalars().all()
    return [_user_to_response(u) for u in users]


@router.post("/create", response_model=UserResponse)
async def create_user(
    request: Request,
    data: CreateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo utente.
    - Admin può creare utenti di qualsiasi settore
    - Capi settore possono creare solo nel proprio settore con livello inferiore
    """
    try:
        target_sector = Sector(data.sector)
    except ValueError:
        raise HTTPException(status_code=400, detail="Settore non valido")
    
    # Verifica permessi
    if current_user.sector == Sector.ADMIN:
        # Admin può creare tutto tranne admin di livello superiore
        if target_sector == Sector.ADMIN and data.hierarchy_level >= current_user.hierarchy_level:
            raise HTTPException(
                status_code=403, 
                detail="Non puoi creare admin di livello uguale o superiore"
            )
    else:
        # Capi settore: solo proprio settore, livello inferiore
        if target_sector != current_user.sector:
            raise HTTPException(
                status_code=403, 
                detail="Puoi creare utenti solo nel tuo settore"
            )
        
        if data.hierarchy_level >= current_user.hierarchy_level:
            raise HTTPException(
                status_code=403, 
                detail="Puoi creare solo utenti con livello inferiore al tuo"
            )
        
        # Verifica permesso di gestione
        has_manage = permission_service.has_permission(
            current_user, 
            Permission(f"manage_{current_user.sector.value.lower()}_users")
        )
        if not has_manage:
            raise HTTPException(
                status_code=403, 
                detail="Non hai i permessi per creare utenti"
            )
    
    # Verifica email unica
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # Valida password
    is_valid, error_msg = security_service.validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Verifica grado valido
    valid_grades = SECTOR_GRADES.get(target_sector, {})
    if data.hierarchy_level not in valid_grades:
        raise HTTPException(
            status_code=400, 
            detail=f"Livello non valido per {target_sector.value}"
        )
    
    # Crea utente
    new_user = User(
        email=data.email,
        password_hash=pwd_context.hash(data.password),
        game_name=data.game_name,
        sector=target_sector,
        grade=data.grade or valid_grades.get(data.hierarchy_level, ""),
        hierarchy_level=data.hierarchy_level,
        badge_number=data.badge_number,
        department=data.department,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.USER_CREATE,
        user=current_user,
        entity_type="user",
        entity_id=new_user.id,
        description=f"Creato utente {new_user.email} ({target_sector.value})",
        metadata={
            "new_user_email": new_user.email,
            "sector": target_sector.value,
            "grade": new_user.grade,
            "level": new_user.hierarchy_level
        },
        request=request
    )
    
    return _user_to_response(new_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: Request,
    data: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna un utente"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verifica permessi
    if not permission_service.can_manage_user(current_user, target_user):
        raise HTTPException(
            status_code=403, 
            detail="Non hai i permessi per modificare questo utente"
        )
    
    # Salva vecchi valori per audit
    old_values = {
        "grade": target_user.grade,
        "hierarchy_level": target_user.hierarchy_level,
        "is_active": target_user.is_active
    }
    
    # Applica modifiche
    if data.game_name is not None:
        target_user.game_name = data.game_name
    
    if data.grade is not None:
        target_user.grade = data.grade
    
    if data.hierarchy_level is not None:
        # Non può aumentare oltre il proprio livello
        if current_user.sector != Sector.ADMIN:
            if data.hierarchy_level >= current_user.hierarchy_level:
                raise HTTPException(
                    status_code=403, 
                    detail="Non puoi impostare un livello uguale o superiore al tuo"
                )
        target_user.hierarchy_level = data.hierarchy_level
    
    if data.badge_number is not None:
        target_user.badge_number = data.badge_number
    
    if data.department is not None:
        target_user.department = data.department
    
    if data.is_active is not None:
        target_user.is_active = data.is_active
        action = AuditAction.USER_REACTIVATE if data.is_active else AuditAction.USER_DEACTIVATE
        await audit_service.log(
            db,
            action=action,
            user=current_user,
            entity_type="user",
            entity_id=target_user.id,
            description=f"Utente {target_user.email} {'riattivato' if data.is_active else 'disattivato'}",
            request=request
        )
    
    target_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Audit modifiche
    new_values = {
        "grade": target_user.grade,
        "hierarchy_level": target_user.hierarchy_level,
        "is_active": target_user.is_active
    }
    
    if old_values != new_values:
        await audit_service.log(
            db,
            action=AuditAction.USER_UPDATE,
            user=current_user,
            entity_type="user",
            entity_id=target_user.id,
            description=f"Modificato utente {target_user.email}",
            metadata={"old": old_values, "new": new_values},
            request=request
        )
    
    return _user_to_response(target_user)


@router.post("/{user_id}/change-grade")
async def change_user_grade(
    user_id: int,
    request: Request,
    new_grade: str,
    new_level: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cambia grado e livello di un utente"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    if not permission_service.can_manage_user(current_user, target_user):
        raise HTTPException(status_code=403, detail="Non hai i permessi")
    
    # Verifica livello valido
    if current_user.sector != Sector.ADMIN:
        if new_level >= current_user.hierarchy_level:
            raise HTTPException(
                status_code=403, 
                detail="Non puoi promuovere a un livello uguale o superiore al tuo"
            )
    
    old_grade = target_user.grade
    old_level = target_user.hierarchy_level
    
    target_user.grade = new_grade
    target_user.hierarchy_level = new_level
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.GRADE_CHANGE,
        user=current_user,
        entity_type="user",
        entity_id=target_user.id,
        description=f"Cambio grado: {old_grade} ({old_level}) → {new_grade} ({new_level})",
        metadata={
            "old_grade": old_grade,
            "old_level": old_level,
            "new_grade": new_grade,
            "new_level": new_level
        },
        request=request
    )
    
    return {
        "message": "Grado modificato",
        "old": {"grade": old_grade, "level": old_level},
        "new": {"grade": new_grade, "level": new_level}
    }


@router.post("/{user_id}/unlock")
async def unlock_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sblocca un account bloccato"""
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    if not permission_service.can_manage_user(current_user, target_user):
        raise HTTPException(status_code=403, detail="Non hai i permessi")
    
    target_user.is_locked = False
    target_user.lock_until = None
    target_user.failed_login_attempts = 0
    await db.commit()
    
    await audit_service.log(
        db,
        action=AuditAction.USER_UPDATE,
        user=current_user,
        entity_type="user",
        entity_id=target_user.id,
        description=f"Account {target_user.email} sbloccato",
        request=request
    )
    
    return {"message": "Account sbloccato"}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene dettagli di un utente"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verifica visibilità
    if current_user.sector != Sector.ADMIN and current_user.sector != user.sector:
        raise HTTPException(status_code=403, detail="Non puoi visualizzare questo utente")
    
    return _user_to_response(user)


def _user_to_response(user: User) -> UserResponse:
    """Converte User in UserResponse"""
    return UserResponse(
        id=user.id,
        email=user.email,
        game_name=user.game_name,
        sector=user.sector.value,
        grade=user.grade,
        hierarchy_level=user.hierarchy_level,
        badge_number=user.badge_number,
        department=user.department,
        is_active=user.is_active,
        is_locked=user.is_locked or False,
        presence=user.presence.value if user.presence else "offline",
        last_login=user.last_login.isoformat() if user.last_login else None,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )
