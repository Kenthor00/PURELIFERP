"""
PURE LIFE OS 3.0 - Sistema Delete Universale
Permette a Admin e Capi Settore di eliminare qualsiasi risorsa
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum

from database import get_db
from models import (
    User, Case, Warrant, Fine, Evidence,
    Patient, MedicalReport,
    DispatchCall,
    LegalCase, CourtHearing,
    ChatMessage, ChatChannel,
    Announcement, Appointment, RecruitmentApplication,
    NewsArticle, Article,
    TimelineEvent, AuditLog, Notification
)
from auth import get_current_user, require_roles, UserRole, log_audit, AuditAction
from cache import cache, ModuleCache
from websocket_engine import send_system_alert

router = APIRouter(prefix="/admin/delete", tags=["Admin Delete"])


class ResourceType(str, Enum):
    # LSPD
    CASE = "case"
    WARRANT = "warrant"
    FINE = "fine"
    EVIDENCE = "evidence"
    
    # EMS
    PATIENT = "patient"
    MEDICAL_REPORT = "medical_report"
    
    # Dispatch
    DISPATCH_CALL = "dispatch_call"
    
    # Justice
    LEGAL_CASE = "legal_case"
    COURT_HEARING = "court_hearing"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    CHAT_CHANNEL = "chat_channel"
    
    # City Hub
    ANNOUNCEMENT = "announcement"
    APPOINTMENT = "appointment"
    RECRUITMENT = "recruitment"
    
    # News
    NEWS_ARTICLE = "news_article"
    ARTICLE = "article"
    
    # System
    NOTIFICATION = "notification"
    TIMELINE_EVENT = "timeline_event"


# Mapping tipo risorsa -> modello + settore richiesto
RESOURCE_CONFIG = {
    ResourceType.CASE: {"model": Case, "sector": "LSPD", "name": "Caso"},
    ResourceType.WARRANT: {"model": Warrant, "sector": "LSPD", "name": "Mandato"},
    ResourceType.FINE: {"model": Fine, "sector": "LSPD", "name": "Multa"},
    ResourceType.EVIDENCE: {"model": Evidence, "sector": "LSPD", "name": "Prova"},
    
    ResourceType.PATIENT: {"model": Patient, "sector": "EMS", "name": "Paziente"},
    ResourceType.MEDICAL_REPORT: {"model": MedicalReport, "sector": "EMS", "name": "Referto Medico"},
    
    ResourceType.DISPATCH_CALL: {"model": DispatchCall, "sector": "DISPATCH", "name": "Chiamata"},
    
    ResourceType.LEGAL_CASE: {"model": LegalCase, "sector": "GOVERNMENT", "name": "Pratica Legale"},
    ResourceType.COURT_HEARING: {"model": CourtHearing, "sector": "GOVERNMENT", "name": "Udienza"},
    
    ResourceType.CHAT_MESSAGE: {"model": ChatMessage, "sector": None, "name": "Messaggio Chat"},
    ResourceType.CHAT_CHANNEL: {"model": ChatChannel, "sector": None, "name": "Canale Chat"},
    
    ResourceType.ANNOUNCEMENT: {"model": Announcement, "sector": "GOVERNMENT", "name": "Annuncio"},
    ResourceType.APPOINTMENT: {"model": Appointment, "sector": None, "name": "Appuntamento"},
    ResourceType.RECRUITMENT: {"model": RecruitmentApplication, "sector": None, "name": "Candidatura"},
    
    ResourceType.NEWS_ARTICLE: {"model": NewsArticle, "sector": "NEWS", "name": "Articolo News"},
    ResourceType.ARTICLE: {"model": Article, "sector": "NEWS", "name": "Articolo"},
    
    ResourceType.NOTIFICATION: {"model": Notification, "sector": None, "name": "Notifica"},
    ResourceType.TIMELINE_EVENT: {"model": TimelineEvent, "sector": None, "name": "Evento Timeline"},
}


def can_delete_resource(user: User, resource_type: ResourceType) -> bool:
    """Verifica se l'utente può eliminare la risorsa"""
    # Admin può eliminare tutto
    if user.sector.value == "ADMIN":
        return True
    
    # Capi settore (level >= 8) possono eliminare risorse del proprio settore
    if user.level >= 8:
        config = RESOURCE_CONFIG.get(resource_type)
        if config:
            # Risorse senza settore specifico possono essere eliminate da qualsiasi capo
            if config["sector"] is None:
                return True
            # Altrimenti controlla il settore
            return user.sector.value == config["sector"]
    
    return False


@router.delete("/{resource_type}/{resource_id}")
async def delete_resource(
    resource_type: ResourceType,
    resource_id: int,
    permanent: bool = Query(False, description="Eliminazione permanente (solo admin)"),
    reason: Optional[str] = Query(None, description="Motivo eliminazione"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una risorsa.
    
    - Admin: può eliminare qualsiasi risorsa
    - Capi Settore (level >= 8): possono eliminare risorse del proprio settore
    - Eliminazione permanente: solo admin
    """
    # Verifica permessi
    if not can_delete_resource(current_user, resource_type):
        raise HTTPException(
            status_code=403, 
            detail=f"Non hai i permessi per eliminare {RESOURCE_CONFIG[resource_type]['name']}"
        )
    
    # Solo admin può fare eliminazione permanente
    if permanent and current_user.sector.value != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Solo gli amministratori possono effettuare eliminazioni permanenti"
        )
    
    # Ottieni configurazione risorsa
    config = RESOURCE_CONFIG.get(resource_type)
    if not config:
        raise HTTPException(status_code=400, detail="Tipo risorsa non valido")
    
    Model = config["model"]
    
    # Verifica esistenza risorsa
    result = await db.execute(select(Model).where(Model.id == resource_id))
    resource = result.scalar_one_or_none()
    
    if not resource:
        raise HTTPException(status_code=404, detail=f"{config['name']} non trovato/a")
    
    # Log audit PRIMA dell'eliminazione
    await log_audit(
        db=db,
        action=AuditAction.DELETE,
        user=current_user,
        resource_type=resource_type.value,
        resource_id=resource_id,
        details={
            "resource_name": config["name"],
            "permanent": permanent,
            "reason": reason,
            "deleted_by": current_user.email
        }
    )
    
    # Elimina risorsa
    if permanent:
        await db.execute(delete(Model).where(Model.id == resource_id))
    else:
        # Soft delete se il modello lo supporta
        if hasattr(Model, 'is_deleted'):
            await db.execute(
                update(Model)
                .where(Model.id == resource_id)
                .values(is_deleted=True, deleted_at=datetime.now(timezone.utc))
            )
        elif hasattr(Model, 'status'):
            # Per modelli con status, imposta a "deleted" o simile
            await db.execute(
                update(Model)
                .where(Model.id == resource_id)
                .values(status="DELETED")
            )
        else:
            # Se non supporta soft delete, elimina permanentemente
            await db.execute(delete(Model).where(Model.id == resource_id))
    
    await db.commit()
    
    # Invalida cache correlata
    cache_patterns = {
        "case": "lspd",
        "warrant": "lspd", 
        "fine": "lspd",
        "patient": "ems",
        "medical_report": "ems",
        "dispatch_call": "dispatch",
        "legal_case": "justice",
        "court_hearing": "justice",
    }
    
    pattern = cache_patterns.get(resource_type.value)
    if pattern:
        await ModuleCache.invalidate_stats(pattern)
    
    # Notifica via WebSocket
    await send_system_alert(
        f"{config['name']} #{resource_id} eliminato/a da {current_user.game_name or current_user.email}",
        level="warning"
    )
    
    return {
        "success": True,
        "message": f"{config['name']} #{resource_id} eliminato/a con successo",
        "resource_type": resource_type.value,
        "resource_id": resource_id,
        "permanent": permanent,
        "deleted_by": current_user.email
    }


@router.post("/bulk")
async def bulk_delete(
    resource_type: ResourceType,
    resource_ids: list[int],
    permanent: bool = Query(False),
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminazione multipla di risorse"""
    if not can_delete_resource(current_user, resource_type):
        raise HTTPException(status_code=403, detail="Permessi insufficienti")
    
    if permanent and current_user.sector.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo admin può eliminare permanentemente")
    
    if len(resource_ids) > 50:
        raise HTTPException(status_code=400, detail="Massimo 50 risorse per richiesta")
    
    config = RESOURCE_CONFIG.get(resource_type)
    Model = config["model"]
    
    deleted_count = 0
    errors = []
    
    for rid in resource_ids:
        try:
            result = await db.execute(select(Model).where(Model.id == rid))
            if result.scalar_one_or_none():
                if permanent:
                    await db.execute(delete(Model).where(Model.id == rid))
                else:
                    if hasattr(Model, 'is_deleted'):
                        await db.execute(
                            update(Model).where(Model.id == rid)
                            .values(is_deleted=True, deleted_at=datetime.now(timezone.utc))
                        )
                    else:
                        await db.execute(delete(Model).where(Model.id == rid))
                deleted_count += 1
        except Exception as e:
            errors.append({"id": rid, "error": str(e)})
    
    await db.commit()
    
    # Log audit
    await log_audit(
        db=db,
        action=AuditAction.DELETE,
        user=current_user,
        resource_type=f"bulk_{resource_type.value}",
        resource_id=0,
        details={
            "deleted_ids": resource_ids,
            "count": deleted_count,
            "permanent": permanent,
            "reason": reason
        }
    )
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "errors": errors,
        "resource_type": resource_type.value
    }


@router.get("/permissions")
async def get_delete_permissions(
    current_user: User = Depends(get_current_user)
):
    """Ritorna le risorse che l'utente può eliminare"""
    permissions = {}
    
    for resource_type in ResourceType:
        config = RESOURCE_CONFIG.get(resource_type)
        permissions[resource_type.value] = {
            "can_delete": can_delete_resource(current_user, resource_type),
            "name": config["name"] if config else resource_type.value,
            "sector": config["sector"] if config else None
        }
    
    return {
        "user_sector": current_user.sector.value,
        "user_level": current_user.level,
        "is_admin": current_user.sector.value == "ADMIN",
        "permissions": permissions
    }
