"""
PURE LIFE OS - Advertising Slots Router
Sistema di slot pubblicitari per aziende RP
Con tracking performance e notifiche
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import (
    User, Sector, AdvertisingSlot, AdSlotStatus, AdSlotPosition, AuditAction, NotificationType
)
from auth import get_current_user
from services.audit_service import AuditService
from routers.notifications import notify_user, create_notification

router = APIRouter(prefix="/advertising", tags=["Pubblicità"])
audit_service = AuditService()


# ==========================================
# SCHEMAS
# ==========================================

class RequestAdSlotRequest(BaseModel):
    business_name: str
    title: str
    description: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    position: str
    duration_days: int = 7


class ApproveAdSlotRequest(BaseModel):
    notes: Optional[str] = None
    starts_at: Optional[str] = None


class RejectAdSlotRequest(BaseModel):
    notes: str


class AdSlotResponse(BaseModel):
    id: int
    owner_id: int
    owner_game_name: str
    owner_sector: str
    business_name: str
    title: str
    description: Optional[str]
    image_url: str
    link_url: Optional[str]
    position: str
    status: str
    approver_id: Optional[int]
    approver_game_name: Optional[str]
    approver_notes: Optional[str]
    starts_at: Optional[str]
    expires_at: Optional[str]
    duration_days: int
    views: int
    clicks: int
    created_at: str
    approved_at: Optional[str]


# ==========================================
# ENDPOINTS - PUBLIC
# ==========================================

@router.get("/active")
async def get_active_ads(
    position: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Ottieni slot pubblicitari attivi"""
    now = datetime.now(timezone.utc)
    
    query = select(AdvertisingSlot).where(
        AdvertisingSlot.status == AdSlotStatus.ACTIVE.value
    ).where(
        (AdvertisingSlot.expires_at == None) | (AdvertisingSlot.expires_at > now)
    )
    
    if position:
        try:
            pos_enum = AdSlotPosition(position.lower())
            query = query.where(AdvertisingSlot.position == pos_enum.value)
        except ValueError:
            pass
    
    result = await db.execute(query)
    ads = result.scalars().all()
    return [_ad_to_response(a) for a in ads]


@router.post("/{ad_id}/view")
async def record_ad_view(
    ad_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Registra una view su uno slot"""
    result = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    
    if ad and ad.status == AdSlotStatus.ACTIVE.value:
        ad.views += 1
        await db.commit()
    
    return {"success": True}


@router.post("/{ad_id}/click")
async def record_ad_click(
    ad_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra un click su uno slot"""
    result = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    
    if ad and ad.status == AdSlotStatus.ACTIVE.value:
        ad.clicks += 1
        await db.commit()
        
        # Audit log per click
        await audit_service.log(
            db,
            action=AuditAction.AD_SLOT_CLICK,
            user=current_user,
            entity_type="advertising_slot",
            entity_id=ad.id,
            description=f"Click su pubblicità: {ad.business_name}",
            request=request
        )
    
    return {"success": True, "link_url": ad.link_url if ad else None}


@router.get("/positions")
async def get_positions():
    """Ottieni posizioni disponibili"""
    return {
        "positions": [
            {"value": "homepage_banner", "label": "Banner Homepage", "description": "Banner principale in homepage"},
            {"value": "sidebar", "label": "Sidebar", "description": "Colonna laterale"},
            {"value": "footer", "label": "Footer", "description": "Piè di pagina"},
            {"value": "popup", "label": "Popup", "description": "Popup occasionale"}
        ]
    }


# ==========================================
# ENDPOINTS - AUTHENTICATED (REQUEST)
# ==========================================

@router.post("/request", response_model=AdSlotResponse)
async def request_ad_slot(
    data: RequestAdSlotRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Richiedi uno slot pubblicitario"""
    
    # Valida posizione
    try:
        position = AdSlotPosition(data.position.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Posizione non valida: {data.position}")
    
    # Crea richiesta
    ad_slot = AdvertisingSlot(
        owner_id=current_user.id,
        owner_game_name=current_user.game_name or current_user.email,
        owner_sector=current_user.sector.value,
        business_name=data.business_name,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        link_url=data.link_url,
        position=position.value,
        status=AdSlotStatus.PENDING.value,
        duration_days=data.duration_days,
        views=0,
        clicks=0
    )
    
    db.add(ad_slot)
    await db.commit()
    await db.refresh(ad_slot)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.AD_SLOT_REQUEST,
        user=current_user,
        entity_type="advertising_slot",
        entity_id=ad_slot.id,
        description=f"Richiesta slot pubblicitario: {data.business_name} ({position.value})",
        request=request
    )
    
    # Notifica ai moderatori (GOV e Admin)
    await create_notification(
        db=db,
        notification_type=NotificationType.AD_SLOT_REQUESTED.value,
        title="Nuova Richiesta Pubblicità",
        message=f"{current_user.game_name} richiede slot pubblicitario: {data.business_name}",
        sender=current_user,
        is_global=True,
        entity_type="ad_slot",
        entity_id=ad_slot.id
    )
    
    return _ad_to_response(ad_slot)


@router.get("/my-slots", response_model=List[AdSlotResponse])
async def get_my_slots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni i tuoi slot pubblicitari"""
    result = await db.execute(
        select(AdvertisingSlot)
        .where(AdvertisingSlot.owner_id == current_user.id)
        .order_by(desc(AdvertisingSlot.created_at))
    )
    ads = result.scalars().all()
    return [_ad_to_response(a) for a in ads]


@router.get("/my-stats")
async def get_my_ad_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche dei tuoi slot pubblicitari"""
    result = await db.execute(
        select(AdvertisingSlot)
        .where(AdvertisingSlot.owner_id == current_user.id)
        .where(AdvertisingSlot.status == AdSlotStatus.ACTIVE.value)
    )
    ads = result.scalars().all()
    
    total_views = sum(a.views for a in ads)
    total_clicks = sum(a.clicks for a in ads)
    ctr = (total_clicks / total_views * 100) if total_views > 0 else 0
    
    return {
        "active_slots": len(ads),
        "total_views": total_views,
        "total_clicks": total_clicks,
        "ctr": round(ctr, 2)
    }


# ==========================================
# ENDPOINTS - ADMIN/GOV (APPROVE/REJECT)
# ==========================================

@router.get("/pending", response_model=List[AdSlotResponse])
async def get_pending_slots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni slot in attesa di approvazione"""
    
    # Solo GOV livello 4+ o Admin
    if current_user.sector == Sector.GOV:
        if current_user.hierarchy_level < 4:
            raise HTTPException(status_code=403, detail="Non hai i permessi")
    elif current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo GOV e Admin possono approvare")
    
    result = await db.execute(
        select(AdvertisingSlot)
        .where(AdvertisingSlot.status == AdSlotStatus.PENDING.value)
        .order_by(AdvertisingSlot.created_at)
    )
    ads = result.scalars().all()
    return [_ad_to_response(a) for a in ads]


@router.put("/{ad_id}/approve", response_model=AdSlotResponse)
async def approve_ad_slot(
    ad_id: int,
    data: ApproveAdSlotRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approva uno slot pubblicitario"""
    
    # Verifica permessi
    if current_user.sector == Sector.GOV:
        if current_user.hierarchy_level < 4:
            raise HTTPException(status_code=403, detail="Non hai i permessi")
    elif current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo GOV e Admin possono approvare")
    
    # Trova slot
    result = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Slot non trovato")
    
    if ad.status != AdSlotStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Questo slot non è in attesa di approvazione")
    
    # Parse data inizio
    starts_at = datetime.now(timezone.utc)
    if data.starts_at:
        try:
            starts_at = datetime.fromisoformat(data.starts_at.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    # Calcola scadenza
    expires_at = starts_at + timedelta(days=ad.duration_days)
    
    # Aggiorna slot
    ad.status = AdSlotStatus.ACTIVE.value
    ad.approver_id = current_user.id
    ad.approver_game_name = current_user.game_name
    ad.approver_notes = data.notes
    ad.starts_at = starts_at
    ad.expires_at = expires_at
    ad.approved_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(ad)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.AD_SLOT_APPROVE,
        user=current_user,
        entity_type="advertising_slot",
        entity_id=ad.id,
        description=f"Slot pubblicitario approvato: {ad.business_name}",
        request=request
    )
    
    # Notifica al proprietario
    await notify_user(
        db=db,
        user_id=ad.owner_id,
        notification_type=NotificationType.AD_SLOT_ACTIVATED.value,
        title="Pubblicità Attivata!",
        message=f"Il tuo slot pubblicitario '{ad.business_name}' è stato approvato e attivato",
        sender=current_user,
        entity_type="ad_slot",
        entity_id=ad.id
    )
    
    return _ad_to_response(ad)


@router.put("/{ad_id}/reject", response_model=AdSlotResponse)
async def reject_ad_slot(
    ad_id: int,
    data: RejectAdSlotRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rifiuta uno slot pubblicitario"""
    
    # Verifica permessi
    if current_user.sector == Sector.GOV:
        if current_user.hierarchy_level < 4:
            raise HTTPException(status_code=403, detail="Non hai i permessi")
    elif current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo GOV e Admin possono rifiutare")
    
    # Trova slot
    result = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.id == ad_id)
    )
    ad = result.scalar_one_or_none()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Slot non trovato")
    
    # Aggiorna slot
    ad.status = AdSlotStatus.REJECTED.value
    ad.approver_id = current_user.id
    ad.approver_game_name = current_user.game_name
    ad.approver_notes = data.notes
    
    await db.commit()
    await db.refresh(ad)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.AD_SLOT_REJECT,
        user=current_user,
        entity_type="advertising_slot",
        entity_id=ad.id,
        description=f"Slot pubblicitario rifiutato: {ad.business_name}",
        request=request
    )
    
    return _ad_to_response(ad)


@router.get("/all-stats")
async def get_all_ad_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche globali slot (solo admin/GOV)"""
    
    # Verifica permessi
    if current_user.sector not in [Sector.ADMIN, Sector.GOV]:
        raise HTTPException(status_code=403, detail="Non hai i permessi")
    
    # Conta per stato
    pending = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.status == AdSlotStatus.PENDING.value)
    )
    active = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.status == AdSlotStatus.ACTIVE.value)
    )
    expired = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.status == AdSlotStatus.EXPIRED.value)
    )
    
    # Stats totali
    all_active = await db.execute(
        select(AdvertisingSlot).where(AdvertisingSlot.status == AdSlotStatus.ACTIVE)
    )
    active_ads = all_active.scalars().all()
    total_views = sum(a.views for a in active_ads)
    total_clicks = sum(a.clicks for a in active_ads)
    
    return {
        "pending": len(pending.scalars().all()),
        "active": len(active.scalars().all()),
        "expired": len(expired.scalars().all()),
        "total_views": total_views,
        "total_clicks": total_clicks,
        "ctr": round((total_clicks / total_views * 100), 2) if total_views > 0 else 0
    }


# ==========================================
# HELPERS
# ==========================================

def _ad_to_response(ad: AdvertisingSlot) -> AdSlotResponse:
    return AdSlotResponse(
        id=ad.id,
        owner_id=ad.owner_id,
        owner_game_name=ad.owner_game_name,
        owner_sector=ad.owner_sector,
        business_name=ad.business_name,
        title=ad.title,
        description=ad.description,
        image_url=ad.image_url,
        link_url=ad.link_url,
        position=ad.position,
        status=ad.status,
        approver_id=ad.approver_id,
        approver_game_name=ad.approver_game_name,
        approver_notes=ad.approver_notes,
        starts_at=ad.starts_at.isoformat() if ad.starts_at else None,
        expires_at=ad.expires_at.isoformat() if ad.expires_at else None,
        duration_days=ad.duration_days,
        views=ad.views,
        clicks=ad.clicks,
        created_at=ad.created_at.isoformat() if ad.created_at else "",
        approved_at=ad.approved_at.isoformat() if ad.approved_at else None
    )
