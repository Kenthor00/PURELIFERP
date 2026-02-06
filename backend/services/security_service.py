"""
PURE LIFE OS - Security Service
Rate limiting, password policy, account locking
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import re
import logging

from models import LoginAttempt, User

logger = logging.getLogger(__name__)


# Configurazione sicurezza
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
RATE_LIMIT_WINDOW_MINUTES = 15
PASSWORD_MIN_LENGTH = 8


class SecurityService:
    """Servizio per la sicurezza: rate limiting, password policy, locking"""
    
    @staticmethod
    async def check_rate_limit(
        db: AsyncSession,
        email: str,
        ip_address: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifica rate limit per login.
        Returns: (is_allowed, error_message)
        """
        window_start = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
        
        # Conta tentativi falliti per email
        email_attempts = await db.execute(
            select(func.count(LoginAttempt.id))
            .where(LoginAttempt.email == email)
            .where(LoginAttempt.success == False)
            .where(LoginAttempt.timestamp >= window_start)
        )
        email_count = email_attempts.scalar() or 0
        
        if email_count >= MAX_LOGIN_ATTEMPTS:
            return False, f"Troppi tentativi di login. Riprova tra {LOCKOUT_DURATION_MINUTES} minuti."
        
        # Conta tentativi falliti per IP (più permissivo)
        ip_attempts = await db.execute(
            select(func.count(LoginAttempt.id))
            .where(LoginAttempt.ip_address == ip_address)
            .where(LoginAttempt.success == False)
            .where(LoginAttempt.timestamp >= window_start)
        )
        ip_count = ip_attempts.scalar() or 0
        
        if ip_count >= MAX_LOGIN_ATTEMPTS * 3:  # 15 tentativi per IP
            return False, "Troppi tentativi da questo indirizzo IP. Riprova più tardi."
        
        return True, None
    
    @staticmethod
    async def record_login_attempt(
        db: AsyncSession,
        email: str,
        ip_address: str,
        success: bool,
        user_agent: Optional[str] = None
    ) -> LoginAttempt:
        """Registra un tentativo di login"""
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            success=success,
            user_agent=user_agent[:500] if user_agent else None
        )
        db.add(attempt)
        await db.commit()
        return attempt
    
    @staticmethod
    async def check_account_lock(
        db: AsyncSession,
        user: User
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifica se l'account è bloccato.
        Returns: (is_locked, error_message)
        """
        if not user.is_active:
            return True, "Account disabilitato. Contatta un amministratore."
        
        if user.is_locked:
            if user.lock_until and user.lock_until > datetime.now(timezone.utc):
                remaining = (user.lock_until - datetime.now(timezone.utc)).total_seconds() / 60
                return True, f"Account bloccato. Riprova tra {int(remaining)} minuti."
            else:
                # Lock scaduto, sblocca
                user.is_locked = False
                user.lock_until = None
                user.failed_login_attempts = 0
                await db.commit()
        
        return False, None
    
    @staticmethod
    async def handle_failed_login(
        db: AsyncSession,
        user: User
    ) -> None:
        """Gestisce un login fallito"""
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        user.last_failed_login = datetime.now(timezone.utc)
        
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.is_locked = True
            user.lock_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            logger.warning(f"Account {user.email} bloccato per troppi tentativi falliti")
        
        await db.commit()
    
    @staticmethod
    async def handle_successful_login(
        db: AsyncSession,
        user: User
    ) -> None:
        """Gestisce un login riuscito"""
        user.failed_login_attempts = 0
        user.last_failed_login = None
        user.is_locked = False
        user.lock_until = None
        user.last_login = datetime.now(timezone.utc)
        await db.commit()
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, Optional[str]]:
        """
        Valida la password secondo la policy.
        Returns: (is_valid, error_message)
        """
        if len(password) < PASSWORD_MIN_LENGTH:
            return False, f"La password deve avere almeno {PASSWORD_MIN_LENGTH} caratteri."
        
        if not re.search(r'[A-Z]', password):
            return False, "La password deve contenere almeno una lettera maiuscola."
        
        if not re.search(r'[a-z]', password):
            return False, "La password deve contenere almeno una lettera minuscola."
        
        if not re.search(r'\d', password):
            return False, "La password deve contenere almeno un numero."
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "La password deve contenere almeno un carattere speciale (!@#$%^&*...)."
        
        return True, None
    
    @staticmethod
    async def cleanup_old_attempts(
        db: AsyncSession,
        days: int = 7
    ) -> int:
        """Pulisce i vecchi tentativi di login"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await db.execute(
            delete(LoginAttempt).where(LoginAttempt.timestamp < cutoff)
        )
        await db.commit()
        
        return result.rowcount


# Singleton instance
security_service = SecurityService()
