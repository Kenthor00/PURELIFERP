"""
PURE LIFE OS - Announcements Router
Bacheca annunci cittadina con moderazione e tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import (
    User, Sector, Announcement, AnnouncementCategory, AnnouncementStatus, AuditAction, NotificationType
)
from auth import get_current_user
from services.audit_service import AuditService
from routers.notifications import notify_sector_chiefs, notify_user, create_notification

router = APIRouter(prefix="/announcements", tags=["Annunci"])
audit_service = AuditService()


# ==========================================
# SCHEMAS
# ==========================================

class CreateAnnouncementRequest(BaseModel):
    title: str
    description: str
    category: str
    image_url: Optional[str] = None
    contact_info: Optional[str] = None
    price: Optional[str] = None
    location: Optional[str] = None
    duration_days: int = 30


class ModerateAnnouncementRequest(BaseModel):
    status: str  # "approved", "rejected"
    notes: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: int
    author_id: int
    author_game_name: str
    author_sector: str
    title: str
    description: str
    category: str
    image_url: Optional[str]
    contact_info: Optional[str]
    price: Optional[str]
    location: Optional[str]
    status: str
    moderator_id: Optional[int]
    moderator_game_name: Optional[str]
    moderator_notes: Optional[str]
    expires_at: Optional[str]
    views: int
    created_at: str
    approved_at: Optional[str]


# ==========================================
# ENDPOINTS - PUBLIC
# ==========================================

@router.get("/public", response_model=List[AnnouncementResponse])
async def get_public_announcements(
    category: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Ottieni annunci pubblici approvati"""
    query = select(Announcement).where(
        Announcement.status == AnnouncementStatus.APPROVED.value
    )
    
    # Filtra per categoria
    if category:
        try:
            cat_enum = AnnouncementCategory(category.lower())
            query = query.where(Announcement.category == cat_enum.value)
        except ValueError:
            pass
    
    # Escludi scaduti
    query = query.where(
        (Announcement.expires_at == None) | 
        (Announcement.expires_at > datetime.now(timezone.utc))
    )
    
    query = query.order_by(desc(Announcement.approved_at)).limit(limit)
    
    result = await db.execute(query)
    announcements = result.scalars().all()
    return [_announcement_to_response(a) for a in announcements]


@router.get("/public/{announcement_id}", response_model=AnnouncementResponse)
async def get_public_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Ottieni un singolo annuncio pubblico e incrementa views"""
    result = await db.execute(
        select(Announcement)
        .where(Announcement.id == announcement_id)
        .where(Announcement.status == AnnouncementStatus.APPROVED.value)
    )
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    # Incrementa views
    announcement.views += 1
    await db.commit()
    
    return _announcement_to_response(announcement)


@router.get("/categories")
async def get_categories():
    """Ottieni categorie disponibili"""
    return {
        "categories": [
            {"value": "lavoro", "label": "Lavoro", "icon": "briefcase"},
            {"value": "vendita", "label": "Vendita", "icon": "tag"},
            {"value": "affitti", "label": "Affitti", "icon": "home"},
            {"value": "servizi", "label": "Servizi", "icon": "wrench"},
            {"value": "eventi", "label": "Eventi", "icon": "calendar"}
        ]
    }


# ==========================================
# ENDPOINTS - AUTHENTICATED
# ==========================================

@router.post("/create", response_model=AnnouncementResponse)
async def create_announcement(
    data: CreateAnnouncementRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuovo annuncio"""
    
    # Valida categoria
    try:
        category = AnnouncementCategory(data.category.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Categoria non valida: {data.category}")
    
    # Calcola scadenza
    expires_at = datetime.now(timezone.utc) + timedelta(days=data.duration_days)
    
    # Crea annuncio
    announcement = Announcement(
        author_id=current_user.id,
        author_game_name=current_user.game_name or current_user.email,
        author_sector=current_user.sector.value,
        title=data.title,
        description=data.description,
        category=category.value,
        image_url=data.image_url,
        contact_info=data.contact_info,
        price=data.price,
        location=data.location,
        status=AnnouncementStatus.PENDING.value,
        expires_at=expires_at,
        views=0
    )
    
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.ANNOUNCEMENT_CREATE,
        user=current_user,
        entity_type="announcement",
        entity_id=announcement.id,
        description=f"Annuncio creato: {data.title} ({category.value})",
        request=request
    )
    
    # Notifica ai moderatori (GOV e Admin)
    await create_notification(
        db=db,
        notification_type=NotificationType.ANNOUNCEMENT_PENDING.value,
        title="Annuncio in Attesa",
        message=f"Nuovo annuncio da moderare: {data.title}",
        sender=current_user,
        is_global=True,
        entity_type="announcement",
        entity_id=announcement.id
    )
    
    return _announcement_to_response(announcement)


@router.get("/my-announcements", response_model=List[AnnouncementResponse])
async def get_my_announcements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni i tuoi annunci"""
    result = await db.execute(
        select(Announcement)
        .where(Announcement.author_id == current_user.id)
        .order_by(desc(Announcement.created_at))
    )
    announcements = result.scalars().all()
    return [_announcement_to_response(a) for a in announcements]


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un annuncio"""
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    # Solo autore, GOV o admin possono eliminare
    if current_user.id != announcement.author_id:
        if current_user.sector not in [Sector.ADMIN, Sector.GOV]:
            raise HTTPException(status_code=403, detail="Non puoi eliminare questo annuncio")
    
    # Audit log prima di eliminare
    await audit_service.log(
        db,
        action=AuditAction.ANNOUNCEMENT_DELETE,
        user=current_user,
        entity_type="announcement",
        entity_id=announcement.id,
        description=f"Annuncio eliminato: {announcement.title}",
        request=request
    )
    
    await db.delete(announcement)
    await db.commit()
    
    return {"message": "Annuncio eliminato"}


# ==========================================
# ENDPOINTS - MODERATION (GOV + ADMIN)
# ==========================================

@router.get("/pending", response_model=List[AnnouncementResponse])
async def get_pending_announcements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni annunci in attesa di approvazione (solo GOV e Admin)"""
    
    # Solo GOV livello 3+ o Admin
    if current_user.sector == Sector.GOV:
        if current_user.hierarchy_level < 3:
            raise HTTPException(status_code=403, detail="Non hai i permessi di moderazione")
    elif current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo GOV e Admin possono moderare")
    
    result = await db.execute(
        select(Announcement)
        .where(Announcement.status == AnnouncementStatus.PENDING.value)
        .order_by(Announcement.created_at)
    )
    announcements = result.scalars().all()
    return [_announcement_to_response(a) for a in announcements]


@router.put("/{announcement_id}/moderate", response_model=AnnouncementResponse)
async def moderate_announcement(
    announcement_id: int,
    data: ModerateAnnouncementRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modera un annuncio (approva o rifiuta)"""
    
    # Verifica permessi
    if current_user.sector == Sector.GOV:
        if current_user.hierarchy_level < 3:
            raise HTTPException(status_code=403, detail="Non hai i permessi di moderazione")
    elif current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo GOV e Admin possono moderare")
    
    # Trova annuncio
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()
    
    if not announcement:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    # Valida status
    if data.status.lower() not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Stato non valido")
    
    new_status = AnnouncementStatus.APPROVED.value if data.status.lower() == "approved" else AnnouncementStatus.REJECTED.value
    
    # Aggiorna annuncio
    announcement.status = new_status
    announcement.moderator_id = current_user.id
    announcement.moderator_game_name = current_user.game_name
    announcement.moderator_notes = data.notes
    if new_status == AnnouncementStatus.APPROVED.value:
        announcement.approved_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(announcement)
    
    # Audit log
    audit_action = AuditAction.ANNOUNCEMENT_APPROVE if new_status == AnnouncementStatus.APPROVED.value else AuditAction.ANNOUNCEMENT_REJECT
    await audit_service.log(
        db,
        action=audit_action,
        user=current_user,
        entity_type="announcement",
        entity_id=announcement.id,
        description=f"Annuncio {new_status}: {announcement.title}",
        request=request
    )
    
    # Notifica all'autore
    if new_status == AnnouncementStatus.APPROVED.value:
        await notify_user(
            db=db,
            user_id=announcement.author_id,
            notification_type=NotificationType.ANNOUNCEMENT_APPROVED.value,
            title="Annuncio Approvato",
            message=f"Il tuo annuncio '{announcement.title}' è stato approvato e pubblicato",
            sender=current_user,
            entity_type="announcement",
            entity_id=announcement.id
        )
    else:
        await notify_user(
            db=db,
            user_id=announcement.author_id,
            notification_type=NotificationType.ANNOUNCEMENT_REJECTED.value,
            title="Annuncio Rifiutato",
            message=f"Il tuo annuncio '{announcement.title}' non è stato approvato",
            sender=current_user,
            entity_type="announcement",
            entity_id=announcement.id
        )
    
    return _announcement_to_response(announcement)


@router.get("/stats")
async def get_announcement_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche annunci"""
    
    # Conta per stato
    pending = await db.execute(
        select(Announcement).where(Announcement.status == AnnouncementStatus.PENDING.value)
    )
    approved = await db.execute(
        select(Announcement).where(Announcement.status == AnnouncementStatus.APPROVED.value)
    )
    rejected = await db.execute(
        select(Announcement).where(Announcement.status == AnnouncementStatus.REJECTED.value)
    )
    
    # Conta per categoria (solo approvati)
    by_category = {}
    for cat in AnnouncementCategory:
        result = await db.execute(
            select(Announcement)
            .where(Announcement.status == AnnouncementStatus.APPROVED.value)
            .where(Announcement.category == cat.value)
        )
        by_category[cat.value] = len(result.scalars().all())
    
    return {
        "pending": len(pending.scalars().all()),
        "approved": len(approved.scalars().all()),
        "rejected": len(rejected.scalars().all()),
        "by_category": by_category
    }


# ==========================================
# HELPERS
# ==========================================

def _announcement_to_response(ann: Announcement) -> AnnouncementResponse:
    return AnnouncementResponse(
        id=ann.id,
        author_id=ann.author_id,
        author_game_name=ann.author_game_name,
        author_sector=ann.author_sector,
        title=ann.title,
        description=ann.description,
        category=ann.category,
        image_url=ann.image_url,
        contact_info=ann.contact_info,
        price=ann.price,
        location=ann.location,
        status=ann.status,
        moderator_id=ann.moderator_id,
        moderator_game_name=ann.moderator_game_name,
        moderator_notes=ann.moderator_notes,
        expires_at=ann.expires_at.isoformat() if ann.expires_at else None,
        views=ann.views,
        created_at=ann.created_at.isoformat() if ann.created_at else "",
        approved_at=ann.approved_at.isoformat() if ann.approved_at else None
    )
