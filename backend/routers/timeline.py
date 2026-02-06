"""
PURE LIFE OS - Timeline Router
Feed eventi globale unificato
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
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
