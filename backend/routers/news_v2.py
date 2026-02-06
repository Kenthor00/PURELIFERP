"""
PURE LIFE OS - Weazel News 2.0 Router
Sistema editoriale completo con workflow e breaking news
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (
    User, Sector, Article, ArticleStatus, ArticleCategory, AuditAction, NotificationType
)
from auth import get_current_user
from services.audit_service import AuditService
from routers.notifications import notify_sector_chiefs, notify_user, create_notification

router = APIRouter(prefix="/news", tags=["Weazel News"])
audit_service = AuditService()

# ==========================================
# RUOLI NEWS (Gradi Weazel)
# ==========================================
NEWS_GRADES = {
    1: "Reporter",
    2: "Editor", 
    3: "Caporedattore",
    4: "Direttore"
}

# Safe embed domains per video
SAFE_VIDEO_DOMAINS = [
    "youtube.com", "youtu.be", "www.youtube.com",
    "twitch.tv", "www.twitch.tv", "clips.twitch.tv",
    "vimeo.com", "www.vimeo.com"
]


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class ArticleCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    content: str
    excerpt: Optional[str] = None
    cover_image_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None
    video_url: Optional[str] = None
    category: str = "cronaca"
    tags: Optional[List[str]] = None
    is_official: bool = False


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    cover_image_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None
    video_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_official: Optional[bool] = None


class ArticleResponse(BaseModel):
    id: int
    title: str
    subtitle: Optional[str]
    content: str
    excerpt: Optional[str]
    cover_image_url: Optional[str]
    gallery_urls: Optional[List[str]]
    video_url: Optional[str]
    category: str
    tags: Optional[List[str]]
    author_id: int
    author_game_name: str
    author_sector: str
    status: str
    is_breaking: bool
    is_official: bool
    reviewer_game_name: Optional[str]
    reviewer_notes: Optional[str]
    reviewed_at: Optional[str]
    published_at: Optional[str]
    published_by_name: Optional[str]
    views: int
    created_at: str
    updated_at: str


class WorkflowAction(BaseModel):
    notes: Optional[str] = None


# ==========================================
# HELPERS
# ==========================================

def get_news_role(user: User) -> int:
    """Restituisce il livello di ruolo NEWS dell'utente"""
    if user.sector == Sector.ADMIN:
        return 5  # Admin override
    if user.sector != Sector.NEWS:
        return 0  # Non NEWS
    return user.hierarchy_level or 1


def can_edit_article(user: User, article: Article) -> bool:
    """Verifica se l'utente può modificare un articolo"""
    role = get_news_role(user)
    if role >= 4:  # Direttore o Admin
        return True
    if role >= 2 and article.status in ["draft", "review"]:  # Editor
        return True
    if article.author_id == user.id and article.status == "draft":
        return True
    return False


def can_publish(user: User) -> bool:
    """Verifica se l'utente può pubblicare"""
    return get_news_role(user) >= 3  # Caporedattore+


def can_set_breaking(user: User) -> bool:
    """Verifica se l'utente può impostare breaking"""
    return get_news_role(user) >= 3  # Caporedattore+


def validate_video_url(url: str) -> bool:
    """Valida URL video contro whitelist"""
    if not url:
        return True
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        return any(safe in domain for safe in SAFE_VIDEO_DOMAINS)
    except:
        return False


def _article_to_response(article: Article) -> ArticleResponse:
    return ArticleResponse(
        id=article.id,
        title=article.title,
        subtitle=article.subtitle,
        content=article.content,
        excerpt=article.excerpt,
        cover_image_url=article.cover_image_url,
        gallery_urls=article.gallery_urls,
        video_url=article.video_url,
        category=article.category,
        tags=article.tags,
        author_id=article.author_id,
        author_game_name=article.author_game_name,
        author_sector=article.author_sector,
        status=article.status,
        is_breaking=article.is_breaking,
        is_official=article.is_official,
        reviewer_game_name=article.reviewer_game_name,
        reviewer_notes=article.reviewer_notes,
        reviewed_at=article.reviewed_at.isoformat() if article.reviewed_at else None,
        published_at=article.published_at.isoformat() if article.published_at else None,
        published_by_name=article.published_by_name,
        views=article.views or 0,
        created_at=article.created_at.isoformat() if article.created_at else "",
        updated_at=article.updated_at.isoformat() if article.updated_at else ""
    )


# ==========================================
# API PUBBLICHE
# ==========================================

@router.get("/categories")
async def get_categories():
    """Restituisce le categorie disponibili"""
    return {
        "categories": [
            {"value": "cronaca", "label": "Cronaca"},
            {"value": "politica", "label": "Politica"},
            {"value": "eventi", "label": "Eventi"},
            {"value": "sport", "label": "Sport"},
            {"value": "comunicati", "label": "Comunicati Ufficiali"},
            {"value": "economia", "label": "Economia"},
            {"value": "intrattenimento", "label": "Intrattenimento"},
        ]
    }


@router.get("/published", response_model=List[ArticleResponse])
async def get_published_articles(
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene articoli pubblicati (pubblico)"""
    query = select(Article).where(Article.status == ArticleStatus.PUBLISHED.value)
    
    if category:
        query = query.where(Article.category == category)
    
    query = query.order_by(desc(Article.is_breaking), desc(Article.published_at))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    articles = result.scalars().all()
    
    return [_article_to_response(a) for a in articles]


@router.get("/breaking", response_model=List[ArticleResponse])
async def get_breaking_news(
    db: AsyncSession = Depends(get_db)
):
    """Ottiene le breaking news attive"""
    result = await db.execute(
        select(Article)
        .where(Article.status == ArticleStatus.PUBLISHED.value)
        .where(Article.is_breaking == True)
        .order_by(desc(Article.published_at))
        .limit(5)
    )
    articles = result.scalars().all()
    return [_article_to_response(a) for a in articles]


@router.get("/article/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Ottiene un singolo articolo pubblicato e incrementa views"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status != ArticleStatus.PUBLISHED.value:
        raise HTTPException(status_code=404, detail="Articolo non disponibile")
    
    # Incrementa views
    article.views = (article.views or 0) + 1
    await db.commit()
    
    return _article_to_response(article)


# ==========================================
# API REDAZIONE (autenticazione richiesta)
# ==========================================

@router.get("/newsroom/my-articles", response_model=List[ArticleResponse])
async def get_my_articles(
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene gli articoli dell'utente corrente"""
    query = select(Article).where(Article.author_id == current_user.id)
    
    if status:
        query = query.where(Article.status == status)
    
    query = query.order_by(desc(Article.updated_at))
    
    result = await db.execute(query)
    articles = result.scalars().all()
    
    return [_article_to_response(a) for a in articles]


@router.get("/newsroom/review-queue", response_model=List[ArticleResponse])
async def get_review_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene articoli in attesa di revisione (solo Editor+)"""
    role = get_news_role(current_user)
    if role < 2:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    result = await db.execute(
        select(Article)
        .where(Article.status == ArticleStatus.REVIEW.value)
        .order_by(Article.created_at)
    )
    articles = result.scalars().all()
    
    return [_article_to_response(a) for a in articles]


@router.get("/newsroom/all", response_model=List[ArticleResponse])
async def get_all_articles(
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene tutti gli articoli (solo Caporedattore+)"""
    role = get_news_role(current_user)
    if role < 3:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    query = select(Article)
    
    if status:
        query = query.where(Article.status == status)
    
    query = query.order_by(desc(Article.updated_at))
    
    result = await db.execute(query)
    articles = result.scalars().all()
    
    return [_article_to_response(a) for a in articles]


@router.get("/newsroom/stats")
async def get_newsroom_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche newsroom"""
    role = get_news_role(current_user)
    if role < 2:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Conta per stato
    draft = await db.execute(select(func.count(Article.id)).where(Article.status == "draft"))
    review = await db.execute(select(func.count(Article.id)).where(Article.status == "review"))
    approved = await db.execute(select(func.count(Article.id)).where(Article.status == "approved"))
    published = await db.execute(select(func.count(Article.id)).where(Article.status == "published"))
    breaking = await db.execute(select(func.count(Article.id)).where(Article.is_breaking == True))
    
    return {
        "draft": draft.scalar() or 0,
        "review": review.scalar() or 0,
        "approved": approved.scalar() or 0,
        "published": published.scalar() or 0,
        "breaking": breaking.scalar() or 0
    }


@router.post("/newsroom/create", response_model=ArticleResponse)
async def create_article(
    data: ArticleCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuovo articolo (bozza)"""
    role = get_news_role(current_user)
    if role < 1:
        raise HTTPException(status_code=403, detail="Solo personale NEWS può creare articoli")
    
    # Valida video URL
    if data.video_url and not validate_video_url(data.video_url):
        raise HTTPException(status_code=400, detail="URL video non consentito")
    
    # Solo GOV/Admin/Weazel senior possono creare comunicati ufficiali
    is_official = data.is_official
    if is_official and not (current_user.sector in [Sector.GOV, Sector.ADMIN] or role >= 3):
        is_official = False
    
    article = Article(
        title=data.title,
        subtitle=data.subtitle,
        content=data.content,
        excerpt=data.excerpt or (data.content[:200] + "..." if len(data.content) > 200 else data.content),
        cover_image_url=data.cover_image_url,
        gallery_urls=data.gallery_urls,
        video_url=data.video_url,
        category=data.category,
        tags=data.tags,
        author_id=current_user.id,
        author_game_name=current_user.game_name or current_user.email,
        author_sector=current_user.sector.value if current_user.sector else "NEWS",
        status=ArticleStatus.DRAFT.value,
        is_official=is_official
    )
    
    db.add(article)
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_CREATE,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Creato articolo: {data.title}",
        request=request
    )
    
    return _article_to_response(article)


@router.put("/newsroom/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifica un articolo"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if not can_edit_article(current_user, article):
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare questo articolo")
    
    # Valida video URL
    if data.video_url and not validate_video_url(data.video_url):
        raise HTTPException(status_code=400, detail="URL video non consentito")
    
    # Aggiorna campi
    if data.title is not None:
        article.title = data.title
    if data.subtitle is not None:
        article.subtitle = data.subtitle
    if data.content is not None:
        article.content = data.content
    if data.excerpt is not None:
        article.excerpt = data.excerpt
    if data.cover_image_url is not None:
        article.cover_image_url = data.cover_image_url
    if data.gallery_urls is not None:
        article.gallery_urls = data.gallery_urls
    if data.video_url is not None:
        article.video_url = data.video_url
    if data.category is not None:
        article.category = data.category
    if data.tags is not None:
        article.tags = data.tags
    if data.is_official is not None:
        role = get_news_role(current_user)
        if current_user.sector in [Sector.GOV, Sector.ADMIN] or role >= 3:
            article.is_official = data.is_official
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_UPDATE,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Modificato articolo: {article.title}",
        request=request
    )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/submit-review", response_model=ArticleResponse)
async def submit_for_review(
    article_id: int,
    data: WorkflowAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Invia articolo in revisione"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status != ArticleStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Solo le bozze possono essere inviate in revisione")
    
    if article.author_id != current_user.id and get_news_role(current_user) < 2:
        raise HTTPException(status_code=403, detail="Non puoi inviare questo articolo")
    
    article.status = ArticleStatus.REVIEW.value
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_SUBMIT_REVIEW,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Inviato in revisione: {article.title}",
        request=request
    )
    
    # Notifica agli Editor+
    await create_notification(
        db=db,
        notification_type=NotificationType.ARTICLE_REVIEW_NEEDED.value,
        title="Articolo da Revisionare",
        message=f"{current_user.game_name} ha inviato '{article.title}' in revisione",
        sender=current_user,
        target_sector="NEWS",
        entity_type="article",
        entity_id=article.id
    )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/approve", response_model=ArticleResponse)
async def approve_article(
    article_id: int,
    data: WorkflowAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approva articolo (solo Editor+)"""
    role = get_news_role(current_user)
    if role < 2:
        raise HTTPException(status_code=403, detail="Solo Editor+ possono approvare")
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status != ArticleStatus.REVIEW.value:
        raise HTTPException(status_code=400, detail="Solo articoli in revisione possono essere approvati")
    
    article.status = ArticleStatus.APPROVED.value
    article.reviewer_id = current_user.id
    article.reviewer_game_name = current_user.game_name
    article.reviewer_notes = data.notes
    article.reviewed_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_APPROVE,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Approvato articolo: {article.title}",
        request=request
    )
    
    # Notifica all'autore
    await notify_user(
        db=db,
        user_id=article.author_id,
        notification_type=NotificationType.ARTICLE_APPROVED.value,
        title="Articolo Approvato",
        message=f"Il tuo articolo '{article.title}' è stato approvato",
        sender=current_user,
        entity_type="article",
        entity_id=article.id
    )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/reject", response_model=ArticleResponse)
async def reject_article(
    article_id: int,
    data: WorkflowAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rifiuta articolo (solo Editor+)"""
    role = get_news_role(current_user)
    if role < 2:
        raise HTTPException(status_code=403, detail="Solo Editor+ possono rifiutare")
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status != ArticleStatus.REVIEW.value:
        raise HTTPException(status_code=400, detail="Solo articoli in revisione possono essere rifiutati")
    
    article.status = ArticleStatus.DRAFT.value  # Torna in bozza
    article.reviewer_id = current_user.id
    article.reviewer_game_name = current_user.game_name
    article.reviewer_notes = data.notes
    article.reviewed_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_REJECT,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Rifiutato articolo: {article.title}",
        request=request
    )
    
    # Notifica all'autore
    await notify_user(
        db=db,
        user_id=article.author_id,
        notification_type=NotificationType.ARTICLE_REJECTED.value,
        title="Articolo da Rivedere",
        message=f"Il tuo articolo '{article.title}' richiede modifiche",
        sender=current_user,
        entity_type="article",
        entity_id=article.id
    )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/publish", response_model=ArticleResponse)
async def publish_article(
    article_id: int,
    data: WorkflowAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Pubblica articolo (solo Caporedattore+)"""
    if not can_publish(current_user):
        raise HTTPException(status_code=403, detail="Solo Caporedattore+ possono pubblicare")
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status not in [ArticleStatus.APPROVED.value, ArticleStatus.DRAFT.value]:
        raise HTTPException(status_code=400, detail="Stato articolo non valido per la pubblicazione")
    
    article.status = ArticleStatus.PUBLISHED.value
    article.published_at = datetime.now(timezone.utc)
    article.published_by_id = current_user.id
    article.published_by_name = current_user.game_name
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_PUBLISH,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Pubblicato articolo: {article.title}",
        request=request
    )
    
    # Notifica pubblica
    await create_notification(
        db=db,
        notification_type=NotificationType.ARTICLE_PUBLISHED.value,
        title="Nuovo Articolo Pubblicato",
        message=f"Weazel News: {article.title}",
        sender=current_user,
        is_global=True,
        entity_type="article",
        entity_id=article.id
    )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/toggle-breaking", response_model=ArticleResponse)
async def toggle_breaking(
    article_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Attiva/disattiva breaking news (solo Caporedattore+)"""
    if not can_set_breaking(current_user):
        raise HTTPException(status_code=403, detail="Solo Caporedattore+ possono gestire breaking")
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if article.status != ArticleStatus.PUBLISHED.value:
        raise HTTPException(status_code=400, detail="Solo articoli pubblicati possono essere breaking")
    
    article.is_breaking = not article.is_breaking
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_BREAKING,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Breaking {'attivato' if article.is_breaking else 'disattivato'}: {article.title}",
        request=request
    )
    
    # Notifica breaking se attivato
    if article.is_breaking:
        await create_notification(
            db=db,
            notification_type=NotificationType.ARTICLE_BREAKING.value,
            title="⚡ BREAKING NEWS",
            message=article.title,
            sender=current_user,
            is_global=True,
            entity_type="article",
            entity_id=article.id
        )
    
    return _article_to_response(article)


@router.post("/newsroom/{article_id}/archive", response_model=ArticleResponse)
async def archive_article(
    article_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Archivia articolo (solo Direttore+)"""
    role = get_news_role(current_user)
    if role < 4:
        raise HTTPException(status_code=403, detail="Solo Direttore+ possono archiviare")
    
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    article.status = ArticleStatus.ARCHIVED.value
    article.is_breaking = False
    article.archived_at = datetime.now(timezone.utc)
    article.archived_by_id = current_user.id
    
    await db.commit()
    await db.refresh(article)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_ARCHIVE,
        user=current_user,
        entity_type="article",
        entity_id=article.id,
        description=f"Archiviato articolo: {article.title}",
        request=request
    )
    
    return _article_to_response(article)


@router.delete("/newsroom/{article_id}")
async def delete_article(
    article_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina articolo (solo Direttore+ o autore su bozze)"""
    result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    role = get_news_role(current_user)
    
    # Solo Direttore+ può eliminare qualsiasi articolo
    # L'autore può eliminare solo le proprie bozze
    if role < 4:
        if not (article.author_id == current_user.id and article.status == ArticleStatus.DRAFT.value):
            raise HTTPException(status_code=403, detail="Non puoi eliminare questo articolo")
    
    article_title = article.title
    await db.delete(article)
    await db.commit()
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.ARTICLE_DELETE,
        user=current_user,
        entity_type="article",
        entity_id=article_id,
        description=f"Eliminato articolo: {article_title}",
        request=request
    )
    
    return {"message": "Articolo eliminato"}
