"""
PURE LIFE OS - Admin Router (Minimal)
Endpoint minimali per status check
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta
import logging

from database import get_db
from models import User, AuditLog, Sector
from auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistiche admin dashboard"""
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Total users
        total_result = await db.execute(select(func.count(User.id)))
        total_users = total_result.scalar() or 0
        
        # Active users
        active_result = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_result.scalar() or 0
        
        # Today logins (from audit log)
        try:
            login_result = await db.execute(
                select(func.count(AuditLog.id)).where(
                    and_(
                        AuditLog.action == 'login_success',
                        AuditLog.created_at >= today_start
                    )
                )
            )
            today_logins = login_result.scalar() or 0
        except:
            today_logins = 0
        
        # Users by sector
        sector_counts = {}
        for sector in ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH', 'ADMIN', 'CIVIL']:
            try:
                result = await db.execute(
                    select(func.count(User.id)).where(User.sector == sector)
                )
                sector_counts[f'{sector.lower()}_users'] = result.scalar() or 0
            except:
                sector_counts[f'{sector.lower()}_users'] = 0
        
        return {
            "totalUsers": total_users,
            "total_users": total_users,
            "activeUsers": active_users,
            "active_users": active_users,
            "todayLogins": today_logins,
            "today_logins": today_logins,
            "pendingActions": 0,
            "pending_actions": 0,
            **sector_counts
        }
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}")
        return {
            "totalUsers": 0,
            "activeUsers": 0,
            "todayLogins": 0,
            "pendingActions": 0
        }


@router.get("/audit")
async def get_audit_log(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Audit log recente"""
    try:
        result = await db.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        logs = result.scalars().all()
        
        return [
            {
                "id": log.id,
                "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
                "description": log.description or log.action.value if hasattr(log.action, 'value') else str(log.action),
                "user_email": log.user_email,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
    except Exception as e:
        logger.error(f"Error getting audit log: {e}")
        return []


@router.get("/seed/status")
async def get_seed_status(db: AsyncSession = Depends(get_db)):
    """
    Controlla lo stato del seed del database.
    Endpoint pubblico usato dal frontend per verificare se il DB è inizializzato.
    """
    try:
        # Check users count
        result = await db.execute(select(func.count(User.id)))
        users_count = result.scalar() or 0
        
        return {
            "db_connected": True,
            "users_count": users_count,
            "needs_seed": users_count == 0,
            "seed_key_accepted": users_count == 0
        }
    except Exception as e:
        logger.error(f"Errore checking seed status: {e}")
        return {
            "db_connected": False,
            "users_count": 0,
            "needs_seed": False,
            "seed_key_accepted": False,
            "error": str(e)
        }
