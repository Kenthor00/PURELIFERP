"""
PURE LIFE OS - City Hub Router
Pubblico: Pubblicità, Eventi, Aziende
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from sqlalchemy.exc import OperationalError
from typing import Optional, List
from datetime import datetime, timezone
import logging

from database import get_db
from models import User, Business, Advertisement, CityEvent, AdSlotType, AdStatus, EventStatus, EventCategory, TimelineEvent, Outbox, OutboxStatus
from schemas import (
    BusinessCreate, BusinessResponse,
    AdvertisementCreate, AdvertisementUpdate, AdvertisementResponse,
    CityEventCreate, CityEventUpdate, CityEventResponse,
    MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from sse_manager import sse_manager

router = APIRouter(prefix="/city", tags=["City Hub"])
logger = logging.getLogger(__name__)


# ==========================================
# PUBLIC ENDPOINTS (no auth)
# ==========================================

@router.get("/ads/active", response_model=List[AdvertisementResponse])
async def get_active_ads(
    slot_type: Optional[AdSlotType] = None,
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Lista pubblicità attive (pubblico)"""
    try:
        now = datetime.now(timezone.utc)
        query = select(Advertisement).where(
            Advertisement.status == AdStatus.ACTIVE,
            Advertisement.start_date <= now,
            Advertisement.end_date >= now
        ).order_by(func.random())
        
        if slot_type:
            query = query.where(Advertisement.slot_type == slot_type)
        
        result = await db.execute(query.limit(limit))
        return result.scalars().all()
    except OperationalError as e:
        logger.warning(f"DB non disponibile per ads/active: {e}")
        return []
    except Exception as e:
        logger.error(f"Errore ads/active: {e}")
        return []


@router.post("/ads/{ad_id}/view")
async def track_ad_view(
    ad_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Traccia visualizzazione pubblicità"""
    await db.execute(
        update(Advertisement)
        .where(Advertisement.id == ad_id)
        .values(views=Advertisement.views + 1)
    )
    await db.commit()
    return {"success": True}


@router.post("/ads/{ad_id}/click")
async def track_ad_click(
    ad_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Traccia click pubblicità"""
    await db.execute(
        update(Advertisement)
        .where(Advertisement.id == ad_id)
        .values(clicks=Advertisement.clicks + 1)
    )
    await db.commit()
    return {"success": True}


@router.get("/events", response_model=List[CityEventResponse])
async def get_public_events(
    category: Optional[EventCategory] = None,
    upcoming_only: bool = True,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lista eventi pubblici"""
    try:
        now = datetime.now(timezone.utc)
        query = select(CityEvent).where(
            CityEvent.status.in_([EventStatus.APPROVED, EventStatus.ACTIVE])
        )
        
        if upcoming_only:
            query = query.where(CityEvent.event_date >= now)
        
        if category:
            query = query.where(CityEvent.category == category)
        
        query = query.order_by(CityEvent.event_date)
        result = await db.execute(query.limit(limit))
        return result.scalars().all()
    except OperationalError as e:
        logger.warning(f"DB non disponibile per events: {e}")
        return []
    except Exception as e:
        logger.error(f"Errore events: {e}")
        return []


@router.get("/events/{event_id}", response_model=CityEventResponse)
async def get_event_detail(
    event_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio evento (pubblico)"""
    result = await db.execute(select(CityEvent).where(CityEvent.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    return event


@router.get("/businesses", response_model=List[BusinessResponse])
async def get_businesses(
    category: Optional[str] = None,
    verified_only: bool = False,
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lista aziende (pubblico)"""
    query = select(Business).order_by(Business.name)
    
    if verified_only:
        query = query.where(Business.is_verified == True)
    
    if category:
        query = query.where(Business.category == category)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/businesses/{business_id}", response_model=BusinessResponse)
async def get_business_detail(
    business_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio azienda (pubblico)"""
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    
    return business


# ==========================================
# AUTHENTICATED ENDPOINTS
# ==========================================

@router.post("/businesses", response_model=BusinessResponse)
async def create_business(
    request: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra azienda"""
    business = Business(**request.model_dump())
    db.add(business)
    await db.commit()
    await db.refresh(business)
    
    timeline_event = TimelineEvent(
        event_type="business_created",
        category="city",
        title=f"Nuova azienda: {business.name}",
        reference_id=business.id,
        reference_type="business",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    return business


@router.post("/ads", response_model=AdvertisementResponse)
async def create_advertisement(
    request: AdvertisementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea richiesta pubblicità"""
    result = await db.execute(select(Business).where(Business.id == request.business_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    
    ad = Advertisement(
        **request.model_dump(),
        status=AdStatus.PENDING
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)
    
    # Outbox per Prism Billing
    outbox_event = Outbox(
        event_type="ad_purchase_request",
        payload={
            "ad_id": ad.id,
            "business_id": ad.business_id,
            "slot_type": ad.slot_type.value,
            "title": ad.title
        },
        status=OutboxStatus.PENDING
    )
    db.add(outbox_event)
    await db.commit()
    
    return ad


@router.post("/events", response_model=CityEventResponse)
async def create_event(
    request: CityEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea evento"""
    event = CityEvent(
        **request.model_dump(),
        status=EventStatus.PENDING
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    timeline_event = TimelineEvent(
        event_type="event_created",
        category="city",
        title=f"Nuovo evento: {event.title}",
        reference_id=event.id,
        reference_type="event",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    return event


# ==========================================
# ADMIN/GOVERNMENT MODERATION
# ==========================================

@router.put("/ads/{ad_id}/moderate", response_model=AdvertisementResponse)
async def moderate_advertisement(
    ad_id: int,
    request: AdvertisementUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Modera pubblicità (admin/governo)"""
    result = await db.execute(select(Advertisement).where(Advertisement.id == ad_id))
    ad = result.scalar_one_or_none()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Pubblicità non trovata")
    
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ad, field, value)
    
    ad.approved_by = current_user.id
    await db.commit()
    await db.refresh(ad)
    
    if ad.status == AdStatus.ACTIVE:
        await sse_manager.broadcast("ad_approved", {
            "ad_id": ad.id,
            "title": ad.title
        })
    
    return ad


@router.put("/events/{event_id}/moderate", response_model=CityEventResponse)
async def moderate_event(
    event_id: int,
    request: CityEventUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Modera evento (admin/governo)"""
    result = await db.execute(select(CityEvent).where(CityEvent.id == event_id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    event.approved_by = current_user.id
    await db.commit()
    await db.refresh(event)
    
    if event.status == EventStatus.APPROVED:
        await sse_manager.broadcast("event_approved", {
            "event_id": event.id,
            "title": event.title,
            "event_date": event.event_date.isoformat()
        })
    
    return event


@router.put("/businesses/{business_id}/verify", response_model=BusinessResponse)
async def verify_business(
    business_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Verifica azienda (admin/governo)"""
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    
    business.is_verified = True
    await db.commit()
    await db.refresh(business)
    
    return business


# ==========================================
# PENDING ITEMS (for moderation)
# ==========================================

@router.get("/pending/ads", response_model=List[AdvertisementResponse])
async def get_pending_ads(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Lista pubblicità in attesa di approvazione"""
    result = await db.execute(
        select(Advertisement)
        .where(Advertisement.status == AdStatus.PENDING)
        .order_by(Advertisement.created_at)
    )
    return result.scalars().all()


@router.get("/pending/events", response_model=List[CityEventResponse])
async def get_pending_events(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Lista eventi in attesa di approvazione"""
    result = await db.execute(
        select(CityEvent)
        .where(CityEvent.status == EventStatus.PENDING)
        .order_by(CityEvent.created_at)
    )
    return result.scalars().all()
