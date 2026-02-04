"""
PURE LIFE OS - Auth Router
Login, Refresh, FiveM SSO
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from database import get_db
from models import User, UserRole
from schemas import (
    LoginRequest, TokenResponse, RefreshTokenRequest,
    FiveMExchangeRequest, FiveMTokenResponse, UserCreate, UserResponse, MessageResponse
)
from auth import (
    verify_password, hash_password, create_access_token, create_refresh_token,
    decode_token, verify_fivem_secret, get_current_user, log_audit
)
from utils import map_fivem_job_to_role

router = APIRouter(prefix="/auth", tags=["Autenticazione"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    """Login con email e password"""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disattivato")
    
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    await log_audit(
        db, user.id, "login", "user", user.id,
        {"method": "password"},
        req.client.host if req.client else None
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        name=user.name
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Rinnova access token con refresh token"""
    payload = decode_token(request.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token non valido per refresh")
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utente non trovato o disattivato")
    
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        name=user.name
    )


@router.post("/fivem/exchange", response_model=FiveMTokenResponse)
async def fivem_exchange(
    request: FiveMExchangeRequest,
    req: Request,
    x_fivem_secret: str = Header(..., alias="X-FIVEM-SECRET"),
    db: AsyncSession = Depends(get_db)
):
    """
    SSO FiveM - Scambia credenziali FiveM per token JWT
    Header richiesto: X-FIVEM-SECRET
    """
    if not verify_fivem_secret(x_fivem_secret):
        raise HTTPException(status_code=401, detail="FiveM secret non valido")
    
    result = await db.execute(
        select(User).where(User.fivem_identifier == request.identifier)
    )
    user = result.scalar_one_or_none()
    
    role = map_fivem_job_to_role(request.job)
    
    if not user:
        user = User(
            email=f"{request.identifier}@fivem.local",
            password_hash=hash_password(request.identifier),
            name=request.name,
            role=UserRole(role),
            fivem_identifier=request.identifier,
            phone_number=request.phone_number,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.name = request.name
        user.role = UserRole(role)
        if request.phone_number:
            user.phone_number = request.phone_number
        await db.commit()
    
    access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    
    if role == "police":
        redirect_path = "/lspd"
    elif role == "ems":
        redirect_path = "/ems"
    elif role == "dispatch":
        redirect_path = "/dispatch"
    else:
        redirect_path = "/lspd"
    
    await log_audit(
        db, user.id, "fivem_login", "user", user.id,
        {"identifier": request.identifier, "job": request.job},
        req.client.host if req.client else None
    )
    
    return FiveMTokenResponse(
        access_token=access_token,
        role=user.role,
        redirect_path=redirect_path
    )


@router.post("/register", response_model=UserResponse)
async def register(
    request: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registra nuovo utente (solo per setup iniziale/admin)"""
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    if request.badge_number:
        result = await db.execute(select(User).where(User.badge_number == request.badge_number))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Numero distintivo già in uso")
    
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        badge_number=request.badge_number,
        role=request.role,
        department=request.department,
        phone_number=request.phone_number
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Ottieni dati utente corrente"""
    return current_user


@router.put("/me/settings", response_model=UserResponse)
async def update_settings(
    sound_enabled: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna impostazioni utente"""
    if sound_enabled is not None:
        current_user.sound_enabled = sound_enabled
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user
