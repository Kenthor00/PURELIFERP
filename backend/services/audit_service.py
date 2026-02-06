"""
PURE LIFE OS - Audit Service
Sistema di logging completo per tutte le azioni
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import Request
import logging

from models import AuditLog, AuditAction, User, Sector

logger = logging.getLogger(__name__)


class AuditService:
    """Servizio per la gestione dei log di audit"""
    
    @staticmethod
    async def log(
        db: AsyncSession,
        action: AuditAction,
        user: Optional[User] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """
        Registra un'azione nel log di audit
        """
        audit_log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            extra_data=metadata  # mapped to extra_data column
        )
        
        # Dati utente
        if user:
            audit_log.user_id = user.id
            audit_log.user_email = user.email
            audit_log.game_name = user.game_name
            audit_log.sector = user.sector
            audit_log.grade = user.grade
            audit_log.hierarchy_level = user.hierarchy_level
        
        # Dati request
        if request:
            audit_log.ip_address = AuditService._get_client_ip(request)
            audit_log.user_agent = request.headers.get("user-agent", "")[:500]
        
        db.add(audit_log)
        await db.commit()
        
        logger.info(f"AUDIT: {action.value} - User: {user.email if user else 'anonymous'} - Entity: {entity_type}:{entity_id}")
        
        return audit_log
    
    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Estrae l'IP del client considerando proxy"""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    @staticmethod
    async def get_logs_by_sector(
        db: AsyncSession,
        sector: Sector,
        hours: int = 24,
        limit: int = 100
    ) -> List[AuditLog]:
        """Recupera i log di un settore nelle ultime ore"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.sector == sector)
            .where(AuditLog.timestamp >= since)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_logs_by_user(
        db: AsyncSession,
        user_id: int,
        hours: int = 168,  # 7 giorni default
        limit: int = 100
    ) -> List[AuditLog]:
        """Recupera i log di un utente specifico"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .where(AuditLog.timestamp >= since)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_recent_logins(
        db: AsyncSession,
        sector: Optional[Sector] = None,
        hours: int = 24,
        limit: int = 50
    ) -> List[AuditLog]:
        """Recupera i login recenti"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = select(AuditLog).where(
            AuditLog.action.in_([AuditAction.LOGIN_SUCCESS, AuditAction.LOGIN_FAILED])
        ).where(AuditLog.timestamp >= since)
        
        if sector:
            query = query.where(AuditLog.sector == sector)
        
        result = await db.execute(
            query.order_by(desc(AuditLog.timestamp)).limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_all_logs(
        db: AsyncSession,
        hours: int = 24,
        limit: int = 500,
        action_filter: Optional[AuditAction] = None
    ) -> List[AuditLog]:
        """Recupera tutti i log (solo admin)"""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = select(AuditLog).where(AuditLog.timestamp >= since)
        
        if action_filter:
            query = query.where(AuditLog.action == action_filter)
        
        result = await db.execute(
            query.order_by(desc(AuditLog.timestamp)).limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def export_logs_csv(
        db: AsyncSession,
        sector: Optional[Sector] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict]:
        """Esporta log in formato per CSV"""
        query = select(AuditLog)
        
        if sector:
            query = query.where(AuditLog.sector == sector)
        
        if start_date:
            query = query.where(AuditLog.timestamp >= start_date)
        
        if end_date:
            query = query.where(AuditLog.timestamp <= end_date)
        
        result = await db.execute(query.order_by(desc(AuditLog.timestamp)))
        logs = result.scalars().all()
        
        return [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else "",
                "user_email": log.user_email or "",
                "game_name": log.game_name or "",
                "sector": log.sector.value if log.sector else "",
                "grade": log.grade or "",
                "hierarchy_level": log.hierarchy_level or 0,
                "action": log.action.value if log.action else "",
                "entity_type": log.entity_type or "",
                "entity_id": log.entity_id or "",
                "description": log.description or "",
                "ip_address": log.ip_address or "",
            }
            for log in logs
        ]


# Singleton instance
audit_service = AuditService()
