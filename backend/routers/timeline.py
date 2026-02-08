"""
PURE LIFE OS - Timeline Router
Feed eventi globale unificato
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete, or_
from typing import Optional, List

from database import get_db
from models import User, TimelineEvent
from schemas import TimelineEventResponse
from auth import get_current_user, require_roles, UserRole

router = APIRouter(prefix="/timeline", tags=["Timeline"])


@router.get("/", response_model=List[TimelineEventResponse])
async def get_timeline(
    category: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Feed timeline globale con filtri
    Categories: lspd, ems, dispatch
    """
    query = select(TimelineEvent).order_by(desc(TimelineEvent.created_at))
    
    allowed_categories = []
    if current_user.role in [UserRole.POLICE, UserRole.ADMIN]:
        allowed_categories.append("lspd")
    if current_user.role in [UserRole.EMS, UserRole.ADMIN]:
        allowed_categories.append("ems")
    if current_user.role in [UserRole.DISPATCH, UserRole.ADMIN]:
        allowed_categories.extend(["lspd", "ems", "dispatch"])
    
    if category:
        if category not in allowed_categories:
            raise HTTPException(status_code=403, detail="Accesso negato a questa categoria")
        query = query.where(TimelineEvent.category == category)
    else:
        query = query.where(TimelineEvent.category.in_(allowed_categories))
    
    if event_type:
        query = query.where(TimelineEvent.event_type == event_type)
    
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.get("/recent", response_model=List[TimelineEventResponse])
async def get_recent_events(
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eventi recenti per dashboard"""
    allowed_categories = []
    if current_user.role in [UserRole.POLICE, UserRole.ADMIN]:
        allowed_categories.append("lspd")
    if current_user.role in [UserRole.EMS, UserRole.ADMIN]:
        allowed_categories.append("ems")
    if current_user.role in [UserRole.DISPATCH, UserRole.ADMIN]:
        allowed_categories.extend(["lspd", "ems", "dispatch"])
    
    query = select(TimelineEvent).where(
        TimelineEvent.category.in_(allowed_categories)
    ).order_by(desc(TimelineEvent.created_at)).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def get_timeline_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche timeline"""
    today_events = await db.execute(
        select(func.count(TimelineEvent.id))
        .where(func.date(TimelineEvent.created_at) == func.current_date())
    )
    
    by_category = await db.execute(
        select(TimelineEvent.category, func.count(TimelineEvent.id))
        .where(func.date(TimelineEvent.created_at) == func.current_date())
        .group_by(TimelineEvent.category)
    )
    
    category_stats = {row[0]: row[1] for row in by_category.fetchall()}
    
    return {
        "eventi_oggi": today_events.scalar() or 0,
        "per_categoria": category_stats
    }


@router.delete("/clear")
async def clear_timeline_events(
    entity_type: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina eventi timeline per categoria.
    Solo admin o capi dipartimento (hierarchy_level >= 8) possono eliminare.
    """
    # Verifica permessi
    if current_user.role != UserRole.ADMIN and current_user.hierarchy_level < 8:
        raise HTTPException(status_code=403, detail="Permessi insufficienti per eliminare timeline")
    
    query = delete(TimelineEvent)
    
    if entity_type:
        # Mappa entity_type a categoria
        category_map = {
            'lspd': 'lspd',
            'ems': 'ems',
            'dispatch': 'dispatch',
            'justice': 'justice'
        }
        category = category_map.get(entity_type.lower())
        if category:
            query = query.where(TimelineEvent.category == category)
    
    result = await db.execute(query)
    await db.commit()
    
    return {"deleted": result.rowcount, "message": "Timeline eliminata con successo"}
