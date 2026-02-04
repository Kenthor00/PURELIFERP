"""
PURE LIFE OS - FiveM SSO Router
Single Sign-On per lb-phone WebView
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from typing import Optional
import hashlib
import hmac
import secrets
import logging
import os

from database import get_db
from models import User, UserRole
from auth import create_access_token, create_refresh_token

router = APIRouter(prefix="/fivem", tags=["FiveM SSO"])
logger = logging.getLogger(__name__)

# Secrets from environment
FIVEM_SECRET_CURRENT = os.environ.get('FIVEM_SECRET_CURRENT', 'purelife-fivem-secret-current')
FIVEM_SECRET_PREVIOUS = os.environ.get('FIVEM_SECRET_PREVIOUS', 'purelife-fivem-secret-previous')

# In-memory SSO token store (in produzione: Redis)
# Format: {token: {user_id, identifier, expires_at, used}}
sso_tokens = {}


def verify_signature(identifier: str, nonce: str, signature: str) -> bool:
    """
    Verifica la firma HMAC dal server FiveM.
    Prova prima con la chiave corrente, poi con quella precedente (rotazione).
    """
    message = f"{identifier}:{nonce}"
    
    # Try current secret
    expected_current = hmac.new(
        FIVEM_SECRET_CURRENT.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if hmac.compare_digest(signature, expected_current):
        return True
    
    # Try previous secret (for rotation)
    expected_previous = hmac.new(
        FIVEM_SECRET_PREVIOUS.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_previous)


def cleanup_expired_tokens():
    """Rimuove token SSO scaduti"""
    now = datetime.now(timezone.utc)
    expired = [t for t, data in sso_tokens.items() if data['expires_at'] < now]
    for t in expired:
        del sso_tokens[t]


@router.post("/sso")
async def create_sso_token(
    identifier: str,
    nonce: str,
    signature: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un token SSO monouso per l'autenticazione da FiveM.
    
    Chiamato dal server FiveM quando un player apre lb-phone.
    
    Args:
        identifier: Identifier FiveM del player (es. license:xxxxx)
        nonce: Valore random univoco per questa richiesta
        signature: HMAC-SHA256 di "{identifier}:{nonce}" con FIVEM_SECRET
    
    Returns:
        sso_token: Token monouso valido 30 secondi
    """
    # Verifica firma
    if not verify_signature(identifier, nonce, signature):
        logger.warning(f"SSO: Firma non valida per identifier {identifier[:20]}...")
        raise HTTPException(status_code=403, detail="Firma non valida")
    
    # Cerca utente per identifier FiveM
    result = await db.execute(
        select(User).where(User.fivem_identifier == identifier)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Utente non registrato - potrebbe creare account automaticamente
        # Per ora, restituiamo errore
        logger.info(f"SSO: Nessun utente trovato per identifier {identifier[:20]}...")
        raise HTTPException(
            status_code=404, 
            detail="Utente non registrato. Contatta un admin per collegare il tuo account FiveM."
        )
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabilitato")
    
    # Cleanup token scaduti
    cleanup_expired_tokens()
    
    # Genera token SSO monouso
    sso_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    
    sso_tokens[sso_token] = {
        'user_id': user.id,
        'identifier': identifier,
        'expires_at': expires_at,
        'used': False
    }
    
    logger.info(f"SSO: Token creato per user {user.id} ({user.name})")
    
    return {
        "sso_token": sso_token,
        "expires_in": 30,
        "user_name": user.name,
        "role": user.role.value
    }


@router.post("/sso/exchange")
async def exchange_sso_token(
    sso_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Scambia un token SSO monouso per una sessione JWT completa.
    
    Chiamato dal frontend PLOS quando riceve ?sso=TOKEN.
    
    Args:
        sso_token: Token SSO ricevuto dal parametro URL
    
    Returns:
        access_token, refresh_token, user info
    """
    # Cleanup token scaduti
    cleanup_expired_tokens()
    
    # Verifica token
    token_data = sso_tokens.get(sso_token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Token SSO non valido o scaduto")
    
    if token_data['used']:
        raise HTTPException(status_code=401, detail="Token SSO già utilizzato")
    
    if token_data['expires_at'] < datetime.now(timezone.utc):
        del sso_tokens[sso_token]
        raise HTTPException(status_code=401, detail="Token SSO scaduto")
    
    # Marca come usato
    sso_tokens[sso_token]['used'] = True
    
    # Recupera utente
    result = await db.execute(select(User).where(User.id == token_data['user_id']))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Crea token JWT
    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id)
    
    # Aggiorna last_login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    
    # Rimuovi token SSO usato
    del sso_tokens[sso_token]
    
    logger.info(f"SSO: Exchange completato per user {user.id} ({user.name})")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user_id": user.id,
        "name": user.name,
        "badge_number": user.badge_number,
        "department": user.department
    }


@router.get("/sso/validate")
async def validate_sso_token(sso_token: str):
    """
    Verifica se un token SSO è ancora valido (senza consumarlo).
    Utile per debug e verifica.
    """
    cleanup_expired_tokens()
    
    token_data = sso_tokens.get(sso_token)
    
    if not token_data:
        return {"valid": False, "reason": "Token non trovato"}
    
    if token_data['used']:
        return {"valid": False, "reason": "Token già utilizzato"}
    
    if token_data['expires_at'] < datetime.now(timezone.utc):
        return {"valid": False, "reason": "Token scaduto"}
    
    remaining = (token_data['expires_at'] - datetime.now(timezone.utc)).total_seconds()
    
    return {
        "valid": True,
        "expires_in": int(remaining),
        "user_id": token_data['user_id']
    }


@router.post("/link-account")
async def link_fivem_account(
    identifier: str,
    nonce: str,
    signature: str,
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Collega un identifier FiveM a un account PLOS esistente.
    
    Richiede:
    - Firma valida dal server FiveM
    - Credenziali valide dell'account PLOS
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Verifica firma
    if not verify_signature(identifier, nonce, signature):
        raise HTTPException(status_code=403, detail="Firma non valida")
    
    # Verifica credenziali
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user or not pwd_context.verify(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Verifica che l'identifier non sia già collegato
    existing = await db.execute(
        select(User).where(User.fivem_identifier == identifier)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Questo identifier FiveM è già collegato a un altro account")
    
    # Collega identifier
    user.fivem_identifier = identifier
    await db.commit()
    
    logger.info(f"FiveM identifier collegato: user {user.id} -> {identifier[:20]}...")
    
    return {
        "success": True,
        "message": "Account FiveM collegato con successo",
        "user_name": user.name
    }
