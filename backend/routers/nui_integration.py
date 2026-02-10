"""
PURE LIFE OS - FiveM NUI Integration Router
Handshake auth, rate limiting, token short-lived
"""
import os
import httpx
import secrets
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database import get_db
from models import User, Sector, AuditLog, AuditAction
from auth import create_access_token, create_refresh_token, hash_password, log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nui", tags=["FiveM NUI Integration"])

# ==========================================
# CONFIGURATION
# ==========================================

# FiveM server endpoint per validazione code
FIVEM_HANDSHAKE_URL = os.environ.get(
    'FIVEM_HANDSHAKE_URL', 
    'http://127.0.0.1:30120/plos/handshake/consume'
)
FIVEM_API_SECRET = os.environ.get('FIVEM_API_SECRET', '')

# JWT per NUI - short-lived (10-15 minuti)
NUI_TOKEN_EXPIRE_MINUTES = int(os.environ.get('NUI_TOKEN_EXPIRE_MINUTES', '12'))

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # secondi
RATE_LIMIT_MAX_REQUESTS = 10  # max richieste per window
RATE_LIMIT_BLOCK_TIME = 300  # secondi di blocco dopo violazione


# ==========================================
# RATE LIMITER (In-Memory, per IP)
# ==========================================

class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.blocked: Dict[str, float] = {}
    
    def is_allowed(self, client_ip: str) -> tuple[bool, str]:
        """Check if request is allowed. Returns (allowed, reason)"""
        now = time.time()
        
        # Check if blocked
        if client_ip in self.blocked:
            if now < self.blocked[client_ip]:
                remaining = int(self.blocked[client_ip] - now)
                return False, f"Rate limit exceeded. Blocked for {remaining}s"
            else:
                del self.blocked[client_ip]
        
        # Clean old requests
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] 
            if now - t < RATE_LIMIT_WINDOW
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
            self.blocked[client_ip] = now + RATE_LIMIT_BLOCK_TIME
            return False, f"Rate limit exceeded. Blocked for {RATE_LIMIT_BLOCK_TIME}s"
        
        # Record request
        self.requests[client_ip].append(now)
        return True, "OK"
    
    def get_stats(self) -> dict:
        now = time.time()
        return {
            "active_ips": len(self.requests),
            "blocked_ips": len([ip for ip, t in self.blocked.items() if now < t]),
        }


rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, considering proxies"""
    # Check X-Forwarded-For header (set by reverse proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection IP
    return request.client.host if request.client else "unknown"


# ==========================================
# SCHEMAS
# ==========================================

class HandshakeRequest(BaseModel):
    code: str


class HandshakeResponse(BaseModel):
    success: bool
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


class FiveMPlayerData(BaseModel):
    """Dati player ricevuti da FiveM dopo validazione code"""
    identifier: str  # license o steam identifier
    name: str
    job: str
    job_grade: int = 0
    job_grade_name: Optional[str] = None
    phone_number: Optional[str] = None
    iban: Optional[str] = None
    money: Optional[int] = 0
    bank: Optional[int] = 0


# ==========================================
# FIVEM CODE VALIDATION (HTTP to FiveM server)
# ==========================================

async def validate_fivem_code(code: str) -> Optional[FiveMPlayerData]:
    """
    Valida il code one-time con il server FiveM.
    Il server FiveM deve esporre un endpoint HTTP che:
    1. Riceve il code
    2. Verifica che esista e non sia scaduto (TTL 60s)
    3. Lo marca come consumato (one-time)
    4. Ritorna i dati del player
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                FIVEM_HANDSHAKE_URL,
                json={"code": code},
                headers={
                    "X-PLOS-SECRET": FIVEM_API_SECRET,
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    return FiveMPlayerData(**data.get("player", {}))
            
            logger.warning(f"FiveM handshake failed: {response.status_code} - {response.text}")
            return None
            
    except httpx.TimeoutException:
        logger.error("FiveM handshake timeout")
        return None
    except Exception as e:
        logger.error(f"FiveM handshake error: {e}")
        return None


def map_fivem_job_to_sector(job: str) -> Sector:
    """Mappa job FiveM a settore PLOS"""
    job_map = {
        'police': Sector.LSPD,
        'lspd': Sector.LSPD,
        'sheriff': Sector.LSPD,
        'ambulance': Sector.EMS,
        'ems': Sector.EMS,
        'doctor': Sector.EMS,
        'mechanic': Sector.CIVIL,
        'taxi': Sector.CIVIL,
        'reporter': Sector.NEWS,
        'weazel': Sector.NEWS,
        'judge': Sector.GOV,
        'lawyer': Sector.GOV,
        'mayor': Sector.GOV,
        'government': Sector.GOV,
        'unemployed': Sector.CIVIL,
    }
    return job_map.get(job.lower(), Sector.CIVIL)


# ==========================================
# ENDPOINTS
# ==========================================

@router.post("/handshake", response_model=HandshakeResponse)
async def nui_handshake(
    request: Request,
    body: HandshakeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    FiveM NUI Handshake Authentication
    
    Flow:
    1. FiveM invia code one-time via postMessage -> NUI JS
    2. NUI JS chiama questo endpoint con il code
    3. Backend valida code con server FiveM
    4. Se valido, crea/trova user e genera JWT short-lived
    5. Ritorna token per sessione NUI
    
    Security:
    - Rate limiting per IP
    - Code one-time con TTL 60s
    - Token JWT short-lived (10-15 min)
    """
    client_ip = get_client_ip(request)
    
    # Rate limiting
    allowed, reason = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)
    
    # Validate code format (basic sanity check)
    if not body.code or len(body.code) < 6 or len(body.code) > 64:
        raise HTTPException(status_code=400, detail="Invalid code format")
    
    # Validate with FiveM server
    player_data = await validate_fivem_code(body.code)
    
    if not player_data:
        # Log failed attempt
        await log_audit(
            db, AuditAction.LOGIN,
            entity_type="nui_handshake",
            description=f"Failed NUI handshake from {client_ip}",
            metadata={"ip": client_ip, "code_prefix": body.code[:4]},
            ip_address=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid or expired code")
    
    # Find or create user based on FiveM identifier
    result = await db.execute(
        select(User).where(User.fivem_identifier == player_data.identifier)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user from FiveM data
        sector = map_fivem_job_to_sector(player_data.job)
        
        user = User(
            email=f"{player_data.identifier}@fivem.local",
            password_hash=hash_password(secrets.token_hex(16)),  # Random password
            name=player_data.name,
            game_name=player_data.name,
            fivem_identifier=player_data.identifier,
            phone_number=player_data.phone_number,
            sector=sector,
            grade=player_data.job_grade_name or player_data.job,
            hierarchy_level=player_data.job_grade,
            is_active=True,
            created_via="fivem_nui"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"New user created via NUI handshake: {player_data.name} ({player_data.identifier})")
    else:
        # Update existing user with latest FiveM data
        user.game_name = player_data.name
        user.grade = player_data.job_grade_name or player_data.job
        user.hierarchy_level = player_data.job_grade
        user.sector = map_fivem_job_to_sector(player_data.job)
        user.last_login = datetime.now(timezone.utc)
        await db.commit()
    
    # Generate short-lived JWT
    access_token = create_access_token(
        user.id,
        user.sector.value,
        expires_delta=timedelta(minutes=NUI_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(user.id)
    
    # Log successful handshake
    await log_audit(
        db, AuditAction.LOGIN,
        user=user,
        entity_type="nui_handshake",
        description=f"Successful NUI handshake for {user.game_name}",
        metadata={
            "ip": client_ip,
            "fivem_job": player_data.job,
            "fivem_grade": player_data.job_grade
        },
        ip_address=client_ip
    )
    
    return HandshakeResponse(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=NUI_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "name": user.name,
            "game_name": user.game_name,
            "sector": user.sector.value,
            "grade": user.grade,
            "hierarchy_level": user.hierarchy_level,
            "phone_number": user.phone_number,
        }
    )


@router.post("/handshake/dev")
async def nui_handshake_dev(
    request: Request,
    body: HandshakeRequest,
    x_dev_mode: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    DEV MODE: Handshake simulato per sviluppo senza FiveM
    Attivo solo se X-Dev-Mode header presente e FIVEM_DEV_MODE=true
    """
    dev_mode = os.environ.get('FIVEM_DEV_MODE', 'false').lower() == 'true'
    
    if not dev_mode or x_dev_mode != 'true':
        raise HTTPException(status_code=403, detail="Dev mode not enabled")
    
    # Simula dati player per testing
    mock_players = {
        'test-lspd': FiveM PlayerData(
            identifier='license:test-lspd-001',
            name='Officer Test',
            job='police',
            job_grade=3,
            job_grade_name='Sergeant',
            phone_number='555-0001'
        ),
        'test-ems': FiveM PlayerData(
            identifier='license:test-ems-001',
            name='Medic Test',
            job='ambulance',
            job_grade=2,
            job_grade_name='Paramedic',
            phone_number='555-0002'
        ),
        'test-civil': FiveM PlayerData(
            identifier='license:test-civil-001',
            name='Citizen Test',
            job='unemployed',
            job_grade=0,
            phone_number='555-0003'
        ),
    }
    
    player_data = mock_players.get(body.code)
    if not player_data:
        raise HTTPException(status_code=401, detail="Invalid dev code")
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.fivem_identifier == player_data.identifier)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        sector = map_fivem_job_to_sector(player_data.job)
        user = User(
            email=f"{player_data.identifier}@fivem.local",
            password_hash=hash_password(secrets.token_hex(16)),
            name=player_data.name,
            game_name=player_data.name,
            fivem_identifier=player_data.identifier,
            phone_number=player_data.phone_number,
            sector=sector,
            grade=player_data.job_grade_name or player_data.job,
            hierarchy_level=player_data.job_grade,
            is_active=True,
            created_via="fivem_nui_dev"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    access_token = create_access_token(
        user.id,
        user.sector.value,
        expires_delta=timedelta(minutes=NUI_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(user.id)
    
    return HandshakeResponse(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=NUI_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user.id,
            "name": user.name,
            "game_name": user.game_name,
            "sector": user.sector.value,
            "grade": user.grade,
            "hierarchy_level": user.hierarchy_level,
            "phone_number": user.phone_number,
        }
    )


@router.get("/rate-limit/stats")
async def rate_limit_stats():
    """Statistiche rate limiter (per debug)"""
    return rate_limiter.get_stats()


@router.post("/refresh")
async def nui_refresh_token(
    request: Request,
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh del token NUI (short-lived).
    Il refresh token ha durata più lunga ma genera sempre access token short-lived.
    """
    from auth import verify_refresh_token
    
    client_ip = get_client_ip(request)
    
    # Rate limiting
    allowed, reason = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail=reason)
    
    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    # Generate new short-lived token
    new_access_token = create_access_token(
        user.id,
        user.sector.value,
        expires_delta=timedelta(minutes=NUI_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_refresh_token(user.id)
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "expires_in": NUI_TOKEN_EXPIRE_MINUTES * 60
    }
