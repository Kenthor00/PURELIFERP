"""
PURE LIFE OS - Router Marketplace
Sistema annunci per cittadini (veicoli, immobili, lavoro, servizi)
Con moderazione staff e integrazione WebSocket
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from database import get_db
from models import (
    User, MarketplaceListing, MarketplaceInterest,
    ListingCategory, ListingStatus, AuditLog, AuditAction
)
from auth import get_current_user
from rbac import has_permission
from services.audit_service import log_audit
from websocket_engine import ws_manager, WSEventType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class ListingCreateRequest(BaseModel):
    """Schema per creare un annuncio"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20)
    category: ListingCategory
    
    price: Optional[float] = None
    price_negotiable: bool = True
    
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_discord: Optional[str] = None
    
    images: Optional[List[str]] = None
    location: Optional[str] = None
    location_coords_x: Optional[float] = None
    location_coords_y: Optional[float] = None
    
    details: Optional[dict] = None  # Dettagli specifici per categoria


class ListingUpdateRequest(BaseModel):
    """Schema per aggiornare un annuncio"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20)
    
    price: Optional[float] = None
    price_negotiable: Optional[bool] = None
    
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_discord: Optional[str] = None
    
    images: Optional[List[str]] = None
    location: Optional[str] = None
    location_coords_x: Optional[float] = None
    location_coords_y: Optional[float] = None
    
    details: Optional[dict] = None


class ListingModerationRequest(BaseModel):
    """Schema per moderazione (approve/reject/remove)"""
    action: str = Field(..., pattern="^(approve|reject|remove)$")
    reason: Optional[str] = None


class InterestCreateRequest(BaseModel):
    """Schema per manifestare interesse"""
    message: Optional[str] = None
    contact_phone: Optional[str] = None


class ListingResponse(BaseModel):
    """Risposta dettaglio annuncio"""
    id: int
    title: str
    description: str
    category: str
    status: str
    
    price: Optional[float]
    price_negotiable: bool
    currency: str
    price_display: str
    
    seller_id: int
    seller_name: str
    contact_phone: Optional[str]
    contact_email: Optional[str]
    contact_discord: Optional[str]
    
    images: Optional[List[str]]
    location: Optional[str]
    location_coords_x: Optional[float]
    location_coords_y: Optional[float]
    
    details: Optional[dict]
    
    is_featured: bool
    views_count: int
    interests_count: int
    
    published_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Permessi per UI
    can_edit: bool = False
    can_delete: bool = False
    is_owner: bool = False
    
    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    """Risposta lista annunci"""
    listings: List[ListingResponse]
    total: int
    page: int
    page_size: int


class InterestResponse(BaseModel):
    """Risposta interesse"""
    id: int
    listing_id: int
    user_id: int
    user_name: str
    message: Optional[str]
    contact_phone: Optional[str]
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==========================================
# HELPERS
# ==========================================

def format_price(price: Optional[float], negotiable: bool, currency: str = "$") -> str:
    """Formatta il prezzo per visualizzazione"""
    if price is None:
        return "Su richiesta"
    
    formatted = f"{currency}{price:,.0f}"
    if negotiable:
        formatted += " (trattabile)"
    return formatted


def listing_to_response(
    listing: MarketplaceListing, 
    current_user: Optional[User] = None,
    interests_count: int = 0
) -> ListingResponse:
    """Converte un listing in response"""
    is_owner = current_user and listing.seller_id == current_user.id
    
    return ListingResponse(
        id=listing.id,
        title=listing.title,
        description=listing.description,
        category=listing.category.value,
        status=listing.status.value,
        price=listing.price,
        price_negotiable=listing.price_negotiable,
        currency=listing.currency,
        price_display=format_price(listing.price, listing.price_negotiable, listing.currency),
        seller_id=listing.seller_id,
        seller_name=listing.seller.game_name or listing.seller.email if listing.seller else "Utente",
        contact_phone=listing.contact_phone if is_owner or listing.status == ListingStatus.ACTIVE else None,
        contact_email=listing.contact_email if is_owner or listing.status == ListingStatus.ACTIVE else None,
        contact_discord=listing.contact_discord if is_owner or listing.status == ListingStatus.ACTIVE else None,
        images=listing.images,
        location=listing.location,
        location_coords_x=listing.location_coords_x,
        location_coords_y=listing.location_coords_y,
        details=listing.details,
        is_featured=listing.is_featured,
        views_count=listing.views_count,
        interests_count=interests_count,
        published_at=listing.published_at,
        expires_at=listing.expires_at,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        can_edit=is_owner and listing.status in [ListingStatus.DRAFT, ListingStatus.PENDING, ListingStatus.ACTIVE],
        can_delete=is_owner or (current_user and current_user.sector.value == "ADMIN"),
        is_owner=is_owner
    )


# ==========================================
# ENDPOINTS - PUBBLICI (con auth)
# ==========================================

@router.get("/categories")
async def get_categories():
    """Lista categorie disponibili"""
    categories = [
        {
            "code": "vehicles",
            "name": "Veicoli",
            "name_short": "Auto/Moto",
            "icon": "Car",
            "color": "#3b82f6",
            "description": "Automobili, moto, barche, aerei"
        },
        {
            "code": "real_estate",
            "name": "Immobili",
            "name_short": "Casa",
            "icon": "Building2",
            "color": "#8b5cf6",
            "description": "Appartamenti, case, terreni, locali commerciali"
        },
        {
            "code": "jobs",
            "name": "Lavoro",
            "name_short": "Lavoro",
            "icon": "Briefcase",
            "color": "#22c55e",
            "description": "Offerte di lavoro, ricerca personale"
        },
        {
            "code": "services",
            "name": "Servizi",
            "name_short": "Servizi",
            "icon": "Wrench",
            "color": "#f59e0b",
            "description": "Servizi professionali, riparazioni, consulenze"
        }
    ]
    return categories


@router.get("", response_model=ListingListResponse)
async def list_listings(
    request: Request,
    category: Optional[ListingCategory] = None,
    status: Optional[ListingStatus] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured_only: bool = False,
    my_listings: bool = False,
    sort_by: str = Query("newest", pattern="^(newest|oldest|price_asc|price_desc|popular)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista annunci con filtri.
    Di default mostra solo annunci ACTIVE.
    Con my_listings=true mostra i propri annunci in qualsiasi stato.
    """
    query = select(MarketplaceListing).options(selectinload(MarketplaceListing.seller))
    
    # Filtro stato
    if my_listings:
        query = query.where(MarketplaceListing.seller_id == current_user.id)
    else:
        # Solo annunci attivi per altri utenti
        if status:
            query = query.where(MarketplaceListing.status == status)
        else:
            query = query.where(MarketplaceListing.status == ListingStatus.ACTIVE)
    
    # Altri filtri
    if category:
        query = query.where(MarketplaceListing.category == category)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                MarketplaceListing.title.ilike(search_term),
                MarketplaceListing.description.ilike(search_term),
                MarketplaceListing.location.ilike(search_term)
            )
        )
    
    if min_price is not None:
        query = query.where(MarketplaceListing.price >= min_price)
    
    if max_price is not None:
        query = query.where(MarketplaceListing.price <= max_price)
    
    if featured_only:
        query = query.where(MarketplaceListing.is_featured == True)
    
    # Ordinamento
    if sort_by == "newest":
        query = query.order_by(desc(MarketplaceListing.created_at))
    elif sort_by == "oldest":
        query = query.order_by(MarketplaceListing.created_at)
    elif sort_by == "price_asc":
        query = query.order_by(MarketplaceListing.price.asc().nullslast())
    elif sort_by == "price_desc":
        query = query.order_by(MarketplaceListing.price.desc().nullsfirst())
    elif sort_by == "popular":
        query = query.order_by(desc(MarketplaceListing.views_count))
    
    # Count totale
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Paginazione
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    # Ottieni count interessi per ogni annuncio
    listing_ids = [l.id for l in listings]
    if listing_ids:
        interests_count_query = select(
            MarketplaceInterest.listing_id,
            func.count(MarketplaceInterest.id).label("count")
        ).where(
            MarketplaceInterest.listing_id.in_(listing_ids)
        ).group_by(MarketplaceInterest.listing_id)
        
        interests_result = await db.execute(interests_count_query)
        interests_map = {row.listing_id: row.count for row in interests_result}
    else:
        interests_map = {}
    
    return ListingListResponse(
        listings=[
            listing_to_response(l, current_user, interests_map.get(l.id, 0))
            for l in listings
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio annuncio"""
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.seller))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    # Incrementa views se non è proprietario
    if listing.seller_id != current_user.id:
        listing.views_count += 1
        await db.commit()
    
    # Count interessi
    interests_count = (await db.execute(
        select(func.count(MarketplaceInterest.id))
        .where(MarketplaceInterest.listing_id == listing_id)
    )).scalar() or 0
    
    return listing_to_response(listing, current_user, interests_count)


@router.post("", response_model=ListingResponse)
async def create_listing(
    request: Request,
    data: ListingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo annuncio.
    L'annuncio parte in stato PENDING e richiede approvazione staff.
    """
    # Verifica permesso base
    can_create = await has_permission(db, current_user, 'MARKET_CREATE')
    if not can_create and current_user.sector.value not in ['CIVIL', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Non hai i permessi per creare annunci")
    
    # Crea annuncio
    listing = MarketplaceListing(
        title=data.title,
        description=data.description,
        category=data.category,
        status=ListingStatus.PENDING,
        price=data.price,
        price_negotiable=data.price_negotiable,
        seller_id=current_user.id,
        contact_phone=data.contact_phone,
        contact_email=data.contact_email or current_user.email,
        contact_discord=data.contact_discord,
        images=data.images or [],
        location=data.location,
        location_coords_x=data.location_coords_x,
        location_coords_y=data.location_coords_y,
        details=data.details,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)  # 30 giorni default
    )
    
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    
    # Audit log
    await log_audit(
        db=db,
        user=current_user,
        action=AuditAction.ANNOUNCEMENT_CREATE,
        entity_type="marketplace_listing",
        entity_id=listing.id,
        description=f"Creato annuncio: {data.title} [{data.category.value}]",
        request=request
    )
    
    # Notifica WebSocket agli staff per moderazione
    await ws_manager.broadcast_to_channel(
        "marketplace:moderation",
        {
            "type": WSEventType.MARKETPLACE_NEW,
            "listing_id": listing.id,
            "title": listing.title,
            "category": listing.category.value,
            "seller_name": current_user.game_name or current_user.email,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    # Reload con seller
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.seller))
        .where(MarketplaceListing.id == listing.id)
    )
    listing = result.scalar_one()
    
    return listing_to_response(listing, current_user, 0)


@router.put("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    request: Request,
    listing_id: int,
    data: ListingUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna un annuncio (solo proprietario)"""
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.seller))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo il proprietario può modificare l'annuncio")
    
    if listing.status not in [ListingStatus.DRAFT, ListingStatus.PENDING, ListingStatus.ACTIVE]:
        raise HTTPException(status_code=400, detail="Impossibile modificare un annuncio in questo stato")
    
    # Aggiorna campi
    if data.title is not None:
        listing.title = data.title
    if data.description is not None:
        listing.description = data.description
    if data.price is not None:
        listing.price = data.price
    if data.price_negotiable is not None:
        listing.price_negotiable = data.price_negotiable
    if data.contact_phone is not None:
        listing.contact_phone = data.contact_phone
    if data.contact_email is not None:
        listing.contact_email = data.contact_email
    if data.contact_discord is not None:
        listing.contact_discord = data.contact_discord
    if data.images is not None:
        listing.images = data.images
    if data.location is not None:
        listing.location = data.location
    if data.location_coords_x is not None:
        listing.location_coords_x = data.location_coords_x
    if data.location_coords_y is not None:
        listing.location_coords_y = data.location_coords_y
    if data.details is not None:
        listing.details = data.details
    
    # Se era attivo, torna in pending per ri-moderazione
    if listing.status == ListingStatus.ACTIVE:
        listing.status = ListingStatus.PENDING
    
    await db.commit()
    await db.refresh(listing)
    
    return listing_to_response(listing, current_user, 0)


@router.delete("/{listing_id}")
async def delete_listing(
    request: Request,
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un annuncio (proprietario o admin)"""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    is_owner = listing.seller_id == current_user.id
    is_admin = current_user.sector.value == "ADMIN" or await has_permission(db, current_user, 'MARKET_ADMIN')
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Non hai i permessi per eliminare questo annuncio")
    
    # Soft delete - cambia stato
    listing.status = ListingStatus.REMOVED
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db=db,
        user=current_user,
        action=AuditAction.ANNOUNCEMENT_DELETE,
        entity_type="marketplace_listing",
        entity_id=listing_id,
        description=f"Eliminato annuncio: {listing.title}",
        request=request
    )
    
    return {"status": "ok", "message": "Annuncio eliminato"}


@router.post("/{listing_id}/sold")
async def mark_as_sold(
    request: Request,
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Segna un annuncio come venduto (solo proprietario)"""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo il proprietario può segnare come venduto")
    
    listing.status = ListingStatus.SOLD
    listing.sold_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"status": "ok", "message": "Annuncio segnato come venduto"}


# ==========================================
# ENDPOINTS - INTERESSI
# ==========================================

@router.post("/{listing_id}/interest", response_model=InterestResponse)
async def express_interest(
    request: Request,
    listing_id: int,
    data: InterestCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manifesta interesse per un annuncio"""
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.seller))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    if listing.status != ListingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="L'annuncio non è più attivo")
    
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Non puoi manifestare interesse per i tuoi annunci")
    
    # Verifica se ha già espresso interesse
    existing = await db.execute(
        select(MarketplaceInterest).where(
            and_(
                MarketplaceInterest.listing_id == listing_id,
                MarketplaceInterest.user_id == current_user.id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Hai già manifestato interesse per questo annuncio")
    
    # Crea interesse
    interest = MarketplaceInterest(
        listing_id=listing_id,
        user_id=current_user.id,
        message=data.message,
        contact_phone=data.contact_phone
    )
    
    db.add(interest)
    await db.commit()
    await db.refresh(interest)
    
    # Notifica WebSocket al venditore
    await ws_manager.send_to_user(
        listing.seller_id,
        {
            "type": WSEventType.MARKETPLACE_INTEREST,
            "listing_id": listing_id,
            "listing_title": listing.title,
            "interested_user": current_user.game_name or current_user.email,
            "message": data.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    return InterestResponse(
        id=interest.id,
        listing_id=interest.listing_id,
        user_id=interest.user_id,
        user_name=current_user.game_name or current_user.email,
        message=interest.message,
        contact_phone=interest.contact_phone,
        is_read=interest.is_read,
        created_at=interest.created_at
    )


@router.get("/{listing_id}/interests", response_model=List[InterestResponse])
async def get_listing_interests(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista interessi per un annuncio (solo proprietario)"""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    if listing.seller_id != current_user.id and current_user.sector.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo il proprietario può vedere gli interessi")
    
    result = await db.execute(
        select(MarketplaceInterest)
        .options(selectinload(MarketplaceInterest.user))
        .where(MarketplaceInterest.listing_id == listing_id)
        .order_by(desc(MarketplaceInterest.created_at))
    )
    interests = result.scalars().all()
    
    return [
        InterestResponse(
            id=i.id,
            listing_id=i.listing_id,
            user_id=i.user_id,
            user_name=i.user.game_name or i.user.email if i.user else "Utente",
            message=i.message,
            contact_phone=i.contact_phone,
            is_read=i.is_read,
            created_at=i.created_at
        )
        for i in interests
    ]


@router.patch("/{listing_id}/interests/{interest_id}/read")
async def mark_interest_read(
    listing_id: int,
    interest_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Segna un interesse come letto"""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing or listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    result = await db.execute(
        select(MarketplaceInterest).where(
            and_(
                MarketplaceInterest.id == interest_id,
                MarketplaceInterest.listing_id == listing_id
            )
        )
    )
    interest = result.scalar_one_or_none()
    
    if not interest:
        raise HTTPException(status_code=404, detail="Interesse non trovato")
    
    interest.is_read = True
    await db.commit()
    
    return {"status": "ok"}


# ==========================================
# ENDPOINTS - MODERAZIONE (Staff)
# ==========================================

@router.get("/moderation/pending", response_model=ListingListResponse)
async def get_pending_listings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista annunci in attesa di moderazione (solo staff)"""
    can_moderate = (
        current_user.sector.value == "ADMIN" or
        await has_permission(db, current_user, 'MARKET_MODERATE') or
        await has_permission(db, current_user, 'MARKET_ADMIN')
    )
    
    if not can_moderate:
        raise HTTPException(status_code=403, detail="Non hai i permessi per moderare")
    
    query = select(MarketplaceListing).options(
        selectinload(MarketplaceListing.seller)
    ).where(
        MarketplaceListing.status == ListingStatus.PENDING
    ).order_by(MarketplaceListing.created_at)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Paginazione
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    listings = result.scalars().all()
    
    return ListingListResponse(
        listings=[listing_to_response(l, current_user, 0) for l in listings],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/{listing_id}/moderate")
async def moderate_listing(
    request: Request,
    listing_id: int,
    data: ListingModerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modera un annuncio (approva/rifiuta/rimuovi)"""
    can_moderate = (
        current_user.sector.value == "ADMIN" or
        await has_permission(db, current_user, 'MARKET_MODERATE') or
        await has_permission(db, current_user, 'MARKET_ADMIN')
    )
    
    if not can_moderate:
        raise HTTPException(status_code=403, detail="Non hai i permessi per moderare")
    
    result = await db.execute(
        select(MarketplaceListing)
        .options(selectinload(MarketplaceListing.seller))
        .where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Annuncio non trovato")
    
    old_status = listing.status
    
    if data.action == "approve":
        listing.status = ListingStatus.ACTIVE
        listing.published_at = datetime.now(timezone.utc)
        message = "Il tuo annuncio è stato approvato e pubblicato!"
    elif data.action == "reject":
        listing.status = ListingStatus.REMOVED
        message = f"Il tuo annuncio è stato rifiutato. Motivo: {data.reason or 'Non specificato'}"
    elif data.action == "remove":
        listing.status = ListingStatus.REMOVED
        message = f"Il tuo annuncio è stato rimosso. Motivo: {data.reason or 'Non specificato'}"
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db=db,
        user=current_user,
        action=AuditAction.ANNOUNCEMENT_APPROVE if data.action == "approve" else AuditAction.ANNOUNCEMENT_REJECT,
        entity_type="marketplace_listing",
        entity_id=listing_id,
        description=f"Annuncio {listing.title}: {old_status.value} → {listing.status.value}",
        extra_data={"reason": data.reason},
        request=request
    )
    
    # Notifica WebSocket al venditore
    await ws_manager.send_to_user(
        listing.seller_id,
        {
            "type": WSEventType.MARKETPLACE_MODERATION,
            "listing_id": listing_id,
            "listing_title": listing.title,
            "action": data.action,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    return {
        "status": "ok",
        "action": data.action,
        "listing_status": listing.status.value
    }


# ==========================================
# ENDPOINTS - STATISTICHE
# ==========================================

@router.get("/stats/summary")
async def get_marketplace_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche marketplace"""
    # Totale per stato
    status_counts = await db.execute(
        select(MarketplaceListing.status, func.count(MarketplaceListing.id))
        .group_by(MarketplaceListing.status)
    )
    by_status = {row[0].value: row[1] for row in status_counts}
    
    # Totale per categoria
    category_counts = await db.execute(
        select(MarketplaceListing.category, func.count(MarketplaceListing.id))
        .where(MarketplaceListing.status == ListingStatus.ACTIVE)
        .group_by(MarketplaceListing.category)
    )
    by_category = {row[0].value: row[1] for row in category_counts}
    
    # Annunci dell'utente
    my_listings = await db.execute(
        select(func.count(MarketplaceListing.id))
        .where(MarketplaceListing.seller_id == current_user.id)
    )
    my_count = my_listings.scalar() or 0
    
    # Interessi ricevuti non letti
    unread_interests = await db.execute(
        select(func.count(MarketplaceInterest.id))
        .join(MarketplaceListing)
        .where(
            and_(
                MarketplaceListing.seller_id == current_user.id,
                MarketplaceInterest.is_read == False
            )
        )
    )
    unread_count = unread_interests.scalar() or 0
    
    return {
        "total_active": by_status.get("active", 0),
        "pending_moderation": by_status.get("pending", 0),
        "by_category": by_category,
        "my_listings": my_count,
        "unread_interests": unread_count
    }


@router.get("/permissions/me")
async def get_my_marketplace_permissions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Permessi marketplace dell'utente corrente"""
    permissions = [
        'MARKET_CREATE', 'MARKET_VIEW', 'MARKET_EDIT',
        'MARKET_DELETE', 'MARKET_MODERATE', 'MARKET_ADMIN'
    ]
    
    result = {}
    for perm in permissions:
        result[perm] = await has_permission(db, current_user, perm)
    
    # Aggiungi permesso implicito per CIVIL
    if current_user.sector.value in ['CIVIL', 'ADMIN']:
        result['MARKET_CREATE'] = True
    
    return result
