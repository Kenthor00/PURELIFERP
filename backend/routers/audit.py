"""
PURE LIFE OS - Audit Dashboard Router
Pannello audit per capi settore e admin
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
import csv
import io
import logging

from database import get_db
from models import User, Sector, AuditLog, AuditAction, Permission
from auth import get_current_user
from services.audit_service import audit_service
from services.permission_service import permission_service

router = APIRouter(prefix="/audit", tags=["Audit"])
logger = logging.getLogger(__name__)


# ==========================================
# SCHEMAS
# ==========================================

class AuditLogResponse(BaseModel):
    id: int
    timestamp: str
    user_email: Optional[str]
    game_name: Optional[str]
    sector: Optional[str]
    grade: Optional[str]
    hierarchy_level: Optional[int]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    description: Optional[str]
    ip_address: Optional[str]


class AuditStatsResponse(BaseModel):
    total_logs_24h: int
    logins_24h: int
    failed_logins_24h: int
    actions_by_type: dict
    active_users: int


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("/my-sector", response_model=List[AuditLogResponse])
async def get_my_sector_audit(
    hours: int = Query(24, le=168),
    limit: int = Query(100, le=500),
    action_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene i log audit del proprio settore.
    Richiede permesso VIEW_*_AUDIT o ADMIN.
    """
    # Verifica permesso
    if current_user.sector == Sector.ADMIN:
        sector = None  # Admin vede tutto
    else:
        # Verifica permesso audit settore
        audit_perm = f"view_{current_user.sector.value.lower()}_audit"
        try:
            if not permission_service.has_permission(current_user, Permission(audit_perm)):
                raise HTTPException(
                    status_code=403, 
                    detail="Non hai accesso ai log audit del tuo settore"
                )
        except ValueError:
            raise HTTPException(status_code=403, detail="Permesso non valido")
        
        sector = current_user.sector
    
    # Recupera logs
    if sector:
        logs = await audit_service.get_logs_by_sector(db, sector, hours, limit)
    else:
        logs = await audit_service.get_all_logs(db, hours, limit)
    
    # Filtra per action se specificato
    if action_filter:
        try:
            action_enum = AuditAction(action_filter)
            logs = [l for l in logs if l.action == action_enum]
        except ValueError:
            pass
    
    return [_log_to_response(log) for log in logs]


@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
async def get_user_audit(
    user_id: int,
    hours: int = Query(168, le=720),  # Max 30 giorni
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene i log di un utente specifico"""
    # Trova utente target
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    # Verifica permesso
    if current_user.sector != Sector.ADMIN:
        if current_user.sector != target_user.sector:
            raise HTTPException(
                status_code=403, 
                detail="Puoi vedere solo i log del tuo settore"
            )
        
        # Verifica permesso audit
        audit_perm = f"view_{current_user.sector.value.lower()}_audit"
        try:
            if not permission_service.has_permission(current_user, Permission(audit_perm)):
                raise HTTPException(status_code=403, detail="Non hai accesso ai log audit")
        except ValueError:
            pass
    
    logs = await audit_service.get_logs_by_user(db, user_id, hours, limit)
    return [_log_to_response(log) for log in logs]


@router.get("/logins", response_model=List[AuditLogResponse])
async def get_recent_logins(
    hours: int = Query(24, le=168),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene i login recenti"""
    if current_user.sector == Sector.ADMIN:
        sector = None
    else:
        sector = current_user.sector
    
    logs = await audit_service.get_recent_logins(db, sector, hours, limit)
    return [_log_to_response(log) for log in logs]


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene statistiche audit delle ultime 24h"""
    from sqlalchemy import func
    
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Query base
    base_query = select(AuditLog).where(AuditLog.timestamp >= since)
    
    if current_user.sector != Sector.ADMIN:
        base_query = base_query.where(AuditLog.sector == current_user.sector)
    
    # Total logs
    total_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.timestamp >= since)
    )
    total_logs = total_result.scalar() or 0
    
    # Logins
    login_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.action == AuditAction.LOGIN_SUCCESS)
    )
    logins = login_result.scalar() or 0
    
    # Failed logins
    failed_result = await db.execute(
        select(func.count(AuditLog.id))
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.action == AuditAction.LOGIN_FAILED)
    )
    failed = failed_result.scalar() or 0
    
    # Actions by type
    actions_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .where(AuditLog.timestamp >= since)
        .group_by(AuditLog.action)
    )
    actions_by_type = {row[0].value: row[1] for row in actions_result.fetchall()}
    
    # Active users (con login nelle ultime 24h)
    active_result = await db.execute(
        select(func.count(func.distinct(AuditLog.user_id)))
        .where(AuditLog.timestamp >= since)
        .where(AuditLog.action == AuditAction.LOGIN_SUCCESS)
    )
    active_users = active_result.scalar() or 0
    
    return AuditStatsResponse(
        total_logs_24h=total_logs,
        logins_24h=logins,
        failed_logins_24h=failed,
        actions_by_type=actions_by_type,
        active_users=active_users
    )


@router.get("/export")
async def export_audit_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Esporta log in CSV"""
    # Verifica permesso
    if current_user.sector != Sector.ADMIN:
        audit_perm = f"view_{current_user.sector.value.lower()}_audit"
        try:
            if not permission_service.has_permission(current_user, Permission(audit_perm)):
                raise HTTPException(status_code=403, detail="Non hai accesso all'export")
        except ValueError:
            pass
    
    # Parse date
    start = None
    end = None
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
        except ValueError:
            pass
    
    # Get sector filter
    sector = None if current_user.sector == Sector.ADMIN else current_user.sector
    
    # Get logs
    logs = await audit_service.export_logs_csv(db, sector, start, end)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "timestamp", "user_email", "game_name", "sector", "grade",
        "hierarchy_level", "action", "entity_type", "entity_id",
        "description", "ip_address"
    ])
    writer.writeheader()
    writer.writerows(logs)
    
    output.seek(0)
    
    # Audit this export
    await audit_service.log(
        db,
        action=AuditAction.EXPORT_DATA,
        user=current_user,
        description=f"Export audit CSV ({len(logs)} righe)",
        metadata={"rows": len(logs), "start": start_date, "end": end_date}
    )
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/actions")
async def get_available_actions():
    """Lista delle azioni disponibili per filtro"""
    return {
        "actions": [action.value for action in AuditAction]
    }


def _log_to_response(log: AuditLog) -> AuditLogResponse:
    """Converte AuditLog in response"""
    return AuditLogResponse(
        id=log.id,
        timestamp=log.timestamp.isoformat() if log.timestamp else "",
        user_email=log.user_email,
        game_name=log.game_name,
        sector=log.sector.value if log.sector else None,
        grade=log.grade,
        hierarchy_level=log.hierarchy_level,
        action=log.action.value if log.action else "",
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        description=log.description,
        ip_address=log.ip_address
    )
