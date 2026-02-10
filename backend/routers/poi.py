"""
PURE LIFE OS - POI Router
Gestione Punti di Interesse sulla mappa custom
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional, List

from database import get_db
from models import User, MapPOI, POICategory, Sector
from schemas import POICreate, POIUpdate, POIResponse, MessageResponse
from auth import get_current_user

router = APIRouter(prefix="/poi", tags=["Map POI"])


def can_manage_poi(user: User) -> bool:
    """Verifica se l'utente può gestire i POI"""
    # Admin sempre OK
    if user.sector == Sector.ADMIN:
        return True
    # GOV con level >= 3 può gestire
    if user.sector == Sector.GOV and user.hierarchy_level >= 3:
        return True
    # LSPD/EMS/DISPATCH con level >= 7 può gestire
    if user.sector in [Sector.LSPD, Sector.EMS, Sector.DISPATCH] and user.hierarchy_level >= 7:
        return True
    return False


@router.get("", response_model=List[POIResponse])
async def get_pois(
    category: Optional[POICategory] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista POI - filtrati per categoria"""
    query = select(MapPOI).order_by(MapPOI.name)
    
    if active_only:
        query = query.where(MapPOI.is_active == True)
    
    # Se non è staff, mostra solo POI pubblici
    if current_user.sector == Sector.CIVIL:
        query = query.where(MapPOI.is_public == True)
    
    if category:
        query = query.where(MapPOI.category == category)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/public", response_model=List[POIResponse])
async def get_public_pois(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista POI pubblici - non richiede autenticazione"""
    query = select(MapPOI).where(
        MapPOI.is_active == True,
        MapPOI.is_public == True
    ).order_by(MapPOI.name)
    
    if category:
        query = query.where(MapPOI.category == category)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories")
async def get_poi_categories():
    """Lista categorie POI disponibili"""
    return {
        "categories": [
            {"value": "governo", "label": "Edifici Governativi", "icon": "Building2", "color": "#8B5CF6"},
            {"value": "polizia", "label": "Stazioni LSPD", "icon": "Shield", "color": "#3B82F6"},
            {"value": "ospedale", "label": "Strutture EMS", "icon": "Heart", "color": "#EF4444"},
            {"value": "commerciale", "label": "Attività Commerciali", "icon": "Store", "color": "#10B981"},
            {"value": "residenziale", "label": "Zone Residenziali", "icon": "Home", "color": "#F59E0B"},
            {"value": "industriale", "label": "Zone Industriali", "icon": "Factory", "color": "#6B7280"},
            {"value": "intrattenimento", "label": "Intrattenimento", "icon": "Music", "color": "#EC4899"},
            {"value": "servizi", "label": "Servizi Pubblici", "icon": "Wrench", "color": "#06B6D4"},
            {"value": "altro", "label": "Altro", "icon": "MapPin", "color": "#9CA3AF"},
        ]
    }


@router.get("/{poi_id}", response_model=POIResponse)
async def get_poi(
    poi_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio singolo POI"""
    result = await db.execute(select(MapPOI).where(MapPOI.id == poi_id))
    poi = result.scalar_one_or_none()
    
    if not poi:
        raise HTTPException(status_code=404, detail="POI non trovato")
    
    # Se non è pubblico, solo staff può vederlo
    if not poi.is_public and current_user.sector == Sector.CIVIL:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    return poi


@router.post("", response_model=POIResponse)
async def create_poi(
    request: POICreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea nuovo POI - solo utenti autorizzati"""
    if not can_manage_poi(current_user):
        raise HTTPException(status_code=403, detail="Non hai i permessi per creare POI")
    
    poi = MapPOI(
        name=request.name,
        x_percent=request.x_percent,
        y_percent=request.y_percent,
        category=request.category,
        description=request.description,
        icon=request.icon,
        color=request.color,
        address=request.address,
        phone=request.phone,
        website=request.website,
        is_public=request.is_public,
        created_by=current_user.id
    )
    
    db.add(poi)
    await db.commit()
    await db.refresh(poi)
    
    return poi


@router.put("/{poi_id}", response_model=POIResponse)
async def update_poi(
    poi_id: int,
    request: POIUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifica POI - solo utenti autorizzati"""
    if not can_manage_poi(current_user):
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare POI")
    
    result = await db.execute(select(MapPOI).where(MapPOI.id == poi_id))
    poi = result.scalar_one_or_none()
    
    if not poi:
        raise HTTPException(status_code=404, detail="POI non trovato")
    
    update_data = request.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(poi, field, value)
    
    poi.updated_by = current_user.id
    
    await db.commit()
    await db.refresh(poi)
    
    return poi


@router.delete("/{poi_id}", response_model=MessageResponse)
async def delete_poi(
    poi_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina POI - solo utenti autorizzati"""
    if not can_manage_poi(current_user):
        raise HTTPException(status_code=403, detail="Non hai i permessi per eliminare POI")
    
    result = await db.execute(select(MapPOI).where(MapPOI.id == poi_id))
    poi = result.scalar_one_or_none()
    
    if not poi:
        raise HTTPException(status_code=404, detail="POI non trovato")
    
    await db.delete(poi)
    await db.commit()
    
    return MessageResponse(message="POI eliminato con successo")
