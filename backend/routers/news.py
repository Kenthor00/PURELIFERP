"""
PURE LIFE OS - Weazel News Router
Articoli, Breaking News, Video
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from sqlalchemy.exc import OperationalError
from typing import Optional, List
from datetime import datetime, timezone
import logging

from database import get_db
from models import User, NewsArticle, TimelineEvent
from schemas import (
    NewsArticleCreate, NewsArticleUpdate, NewsArticleResponse,
    MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from sse_manager import sse_manager

router = APIRouter(prefix="/news", tags=["Weazel News"])
logger = logging.getLogger(__name__)


# ==========================================
# PUBLIC ENDPOINTS
# ==========================================

@router.get("/", response_model=List[NewsArticleResponse])
async def get_news(
    category: Optional[str] = None,
    breaking_only: bool = False,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Lista articoli pubblicati (pubblico)"""
    try:
        query = select(NewsArticle).where(
            NewsArticle.is_published == True
        ).order_by(desc(NewsArticle.published_at))
        
        if category:
            query = query.where(NewsArticle.category == category)
        
        if breaking_only:
            query = query.where(NewsArticle.is_breaking_news == True)
        
        result = await db.execute(query.limit(limit).offset(offset))
        return result.scalars().all()
    except OperationalError as e:
        logger.warning(f"DB non disponibile per news: {e}")
        return []
    except Exception as e:
        logger.error(f"Errore news: {e}")
        return []


@router.get("/breaking", response_model=List[NewsArticleResponse])
async def get_breaking_news(
    limit: int = Query(5, le=10),
    db: AsyncSession = Depends(get_db)
):
    """Breaking news attive (pubblico)"""
    try:
        result = await db.execute(
            select(NewsArticle).where(
                NewsArticle.is_published == True,
                NewsArticle.is_breaking_news == True
            ).order_by(desc(NewsArticle.published_at)).limit(limit)
        )
        return result.scalars().all()
    except OperationalError as e:
        logger.warning(f"DB non disponibile per breaking news: {e}")
        return []
    except Exception as e:
        logger.error(f"Errore breaking news: {e}")
        return []


@router.get("/{article_id}", response_model=NewsArticleResponse)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio articolo (pubblico)"""
    try:
        result = await db.execute(
            select(NewsArticle).where(NewsArticle.id == article_id)
        )
        article = result.scalar_one_or_none()
        
        if not article:
            raise HTTPException(status_code=404, detail="Articolo non trovato")
        
        if not article.is_published:
            raise HTTPException(status_code=404, detail="Articolo non pubblicato")
        
        # Incrementa views
        await db.execute(
            update(NewsArticle)
            .where(NewsArticle.id == article_id)
            .values(views=NewsArticle.views + 1)
        )
        await db.commit()
        await db.refresh(article)
        
        return article
    except HTTPException:
        raise
    except OperationalError as e:
        logger.warning(f"DB non disponibile per article {article_id}: {e}")
        raise HTTPException(status_code=503, detail="Servizio temporaneamente non disponibile")
    except Exception as e:
        logger.error(f"Errore article {article_id}: {e}")
        raise HTTPException(status_code=500, detail="Errore interno del server")


@router.get("/categories/list")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Lista categorie disponibili"""
    try:
        result = await db.execute(
            select(NewsArticle.category)
            .where(NewsArticle.is_published == True)
            .distinct()
        )
        categories = [row[0] for row in result.fetchall()]
        return {"categories": categories}
    except OperationalError as e:
        logger.warning(f"DB non disponibile per categories: {e}")
        return {"categories": []}
    except Exception as e:
        logger.error(f"Errore categories: {e}")
        return {"categories": []}


# ==========================================
# WEAZEL STAFF ENDPOINTS
# ==========================================

@router.get("/drafts/all", response_model=List[NewsArticleResponse])
async def get_all_articles(
    published_only: bool = False,
    current_user: User = Depends(require_roles(UserRole.WEAZEL)),
    db: AsyncSession = Depends(get_db)
):
    """Lista tutti gli articoli (staff Weazel)"""
    query = select(NewsArticle).order_by(desc(NewsArticle.created_at))
    
    if published_only:
        query = query.where(NewsArticle.is_published == True)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=NewsArticleResponse)
async def create_article(
    request: NewsArticleCreate,
    current_user: User = Depends(require_roles(UserRole.WEAZEL)),
    db: AsyncSession = Depends(get_db)
):
    """Crea articolo (staff Weazel)"""
    article = NewsArticle(
        **request.model_dump(),
        author_id=current_user.id,
        is_published=False
    )
    
    db.add(article)
    await db.commit()
    await db.refresh(article)
    
    return article


@router.put("/{article_id}", response_model=NewsArticleResponse)
async def update_article(
    article_id: int,
    request: NewsArticleUpdate,
    current_user: User = Depends(require_roles(UserRole.WEAZEL)),
    db: AsyncSession = Depends(get_db)
):
    """Modifica articolo (staff Weazel)"""
    result = await db.execute(
        select(NewsArticle).where(NewsArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    update_data = request.model_dump(exclude_unset=True)
    was_published = article.is_published
    
    for field, value in update_data.items():
        setattr(article, field, value)
    
    # Se viene pubblicato ora
    if not was_published and article.is_published:
        article.published_at = datetime.now(timezone.utc)
        
        timeline_event = TimelineEvent(
            event_type="news_published",
            category="news",
            title=f"Nuovo articolo: {article.title}",
            description=article.subtitle,
            entity_id=article.id,
            entity_type="news",
            user_id=current_user.id
        )
        db.add(timeline_event)
        
        # Se è breaking news, notifica realtime
        if article.is_breaking_news:
            await sse_manager.broadcast("breaking_news", {
                "article_id": article.id,
                "title": article.title,
                "subtitle": article.subtitle
            })
    
    await db.commit()
    await db.refresh(article)
    
    return article


@router.post("/{article_id}/publish", response_model=NewsArticleResponse)
async def publish_article(
    article_id: int,
    current_user: User = Depends(require_roles(UserRole.WEAZEL)),
    db: AsyncSession = Depends(get_db)
):
    """Pubblica articolo (staff Weazel)"""
    result = await db.execute(
        select(NewsArticle).where(NewsArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    article.is_published = True
    article.published_at = datetime.now(timezone.utc)
    
    timeline_event = TimelineEvent(
        event_type="news_published",
        category="news",
        title=f"Pubblicato: {article.title}",
        entity_id=article.id,
        entity_type="news",
        user_id=current_user.id
    )
    db.add(timeline_event)
    
    await db.commit()
    await db.refresh(article)
    
    # Notifica breaking news
    if article.is_breaking_news:
        await sse_manager.broadcast("breaking_news", {
            "article_id": article.id,
            "title": article.title,
            "subtitle": article.subtitle,
            "image_url": article.image_url
        })
    
    return article


@router.post("/{article_id}/breaking", response_model=NewsArticleResponse)
async def toggle_breaking(
    article_id: int,
    is_breaking: bool,
    current_user: User = Depends(require_roles(UserRole.WEAZEL)),
    db: AsyncSession = Depends(get_db)
):
    """Toggle breaking news (staff Weazel)"""
    result = await db.execute(
        select(NewsArticle).where(NewsArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    article.is_breaking_news = is_breaking
    await db.commit()
    await db.refresh(article)
    
    if is_breaking and article.is_published:
        await sse_manager.broadcast("breaking_news", {
            "article_id": article.id,
            "title": article.title,
            "subtitle": article.subtitle
        })
    
    return article


@router.delete("/{article_id}", response_model=MessageResponse)
async def delete_article(
    article_id: int,
    current_user: User = Depends(require_roles(UserRole.WEAZEL, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Elimina articolo (staff Weazel/Admin)"""
    result = await db.execute(
        select(NewsArticle).where(NewsArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    await db.delete(article)
    await db.commit()
    
    return MessageResponse(message="Articolo eliminato")
