"""
PURE LIFE OS - Authentication Module
JWT + FiveM SSO con rotazione chiavi
"""
import os
import jwt
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

from database import get_db
from models import User, Sector, AuditLog, AuditAction

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-change-me')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

FIVEM_SECRET_CURRENT = os.environ.get('FIVEM_SECRET_CURRENT', '')
FIVEM_SECRET_PREVIOUS = os.environ.get('FIVEM_SECRET_PREVIOUS', '')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(user_id: int, sector: str, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = {"sub": str(user_id), "sector": sector}
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    to_encode = {"sub": str(user_id)}
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_refresh_token(token: str) -> Optional[int]:
    """Verifica refresh token e ritorna user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


def verify_fivem_secret(secret: str) -> bool:
    """Verifica FiveM secret con supporto rotazione (accetta current e previous)"""
    if not secret:
        return False
    return secret == FIVEM_SECRET_CURRENT or secret == FIVEM_SECRET_PREVIOUS


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipo token non valido")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token non valido")
    
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Utente disattivato")
    
    return user


def require_sector(*sectors: Sector):
    """Dependency per richiedere settori specifici"""
    async def sector_checker(current_user: User = Depends(get_current_user)):
        if current_user.sector not in sectors and current_user.sector != Sector.ADMIN:
            raise HTTPException(
                status_code=403, 
                detail=f"Accesso negato. Settori richiesti: {[s.value for s in sectors]}"
            )
        return current_user
    return sector_checker


async def log_audit(
    db: AsyncSession,
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """Registra azione nel log di audit"""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address
    )
    db.add(audit)
    await db.commit()
