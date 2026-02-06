"""
PURE LIFE OS - Sistema Notifiche Real-Time
Router API per gestione notifiche persistenti + SSE
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_, and_, func, desc
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database import get_db
from models import (
    User, Notification, NotificationType, Sector
)
from routers.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifiche"])


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class NotificationCreate(BaseModel):
    user_id: Optional[int] = None
    target_sector: Optional[str] = None
    is_global: bool = False
    notification_type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None


class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    sender_game_name: Optional[str]
    sender_sector: Optional[str]
    is_read: bool
    created_at: str


class NotificationCountResponse(BaseModel):
    unread: int
    total: int


# ==========================================
# HELPER: CREA NOTIFICA
# ==========================================

async def create_notification(
    db: AsyncSession,
    notification_type: str,
    title: str,
    message: str,
    sender: User = None,
    user_id: int = None,
    target_sector: str = None,
    is_global: bool = False,
    entity_type: str = None,
    entity_id: int = None
) -> Notification:
    """
    Crea una nuova notifica nel database.
    
    Regole:
    - user_id: notifica diretta a un utente specifico
    - target_sector: notifica a tutti gli utenti di un settore (capi settore)
    - is_global: notifica a GOV/Admin
    """
    notification = Notification(
        user_id=user_id,
        target_sector=target_sector,
        is_global=is_global,
        notification_type=notification_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        sender_id=sender.id if sender else None,
        sender_game_name=sender.game_name if sender else None,
        sender_sector=sender.sector if sender else None,
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return notification


async def notify_sector_chiefs(
    db: AsyncSession,
    sector: str,
    notification_type: str,
    title: str,
    message: str,
    sender: User = None,
    entity_type: str = None,
    entity_id: int = None
) -> None:
    """
    Invia notifica a tutti i capi settore di un determinato settore.
    """
    # Notifica settore specifico
    await create_notification(
        db=db,
        notification_type=notification_type,
        title=title,
        message=message,
        sender=sender,
        target_sector=sector,
        entity_type=entity_type,
        entity_id=entity_id
    )
    
    # Notifica anche GOV/Admin (globale)
    await create_notification(
        db=db,
        notification_type=notification_type,
        title=title,
        message=message,
        sender=sender,
        is_global=True,
        entity_type=entity_type,
        entity_id=entity_id
    )


async def notify_user(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    sender: User = None,
    entity_type: str = None,
    entity_id: int = None
) -> None:
    """
    Invia notifica diretta a un utente specifico.
    """
    await create_notification(
        db=db,
        notification_type=notification_type,
        title=title,
        message=message,
        sender=sender,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id
    )


# ==========================================
# API ENDPOINTS
# ==========================================

@router.get("/count", response_model=NotificationCountResponse)
async def get_notification_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene il conteggio delle notifiche non lette per l'utente corrente.
    """
    user_sector = current_user.sector.upper() if current_user.sector else "CIVIL"
    is_admin = user_sector == "ADMIN"
    is_gov = user_sector == "GOV"
    is_chief = current_user.is_sector_chief
    
    # Query base per notifiche dell'utente
    conditions = [
        Notification.user_id == current_user.id
    ]
    
    # Se è capo settore, riceve anche notifiche del settore
    if is_chief:
        conditions.append(
            and_(
                Notification.target_sector == user_sector,
                Notification.user_id.is_(None)
            )
        )
    
    # GOV e Admin ricevono notifiche globali
    if is_admin or is_gov:
        conditions.append(
            and_(
                Notification.is_global == True,
                Notification.user_id.is_(None)
            )
        )
    
    # Conta non lette
    unread_result = await db.execute(
        select(func.count(Notification.id))
        .where(or_(*conditions))
        .where(Notification.is_read == False)
    )
    unread = unread_result.scalar() or 0
    
    # Conta totali
    total_result = await db.execute(
        select(func.count(Notification.id))
        .where(or_(*conditions))
    )
    total = total_result.scalar() or 0
    
    return NotificationCountResponse(unread=unread, total=total)


@router.get("/list", response_model=List[NotificationResponse])
async def get_notifications(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ottiene la lista delle notifiche per l'utente corrente.
    """
    user_sector = current_user.sector.upper() if current_user.sector else "CIVIL"
    is_admin = user_sector == "ADMIN"
    is_gov = user_sector == "GOV"
    is_chief = current_user.is_sector_chief
    
    # Condizioni per le notifiche visibili
    conditions = [
        Notification.user_id == current_user.id
    ]
    
    if is_chief:
        conditions.append(
            and_(
                Notification.target_sector == user_sector,
                Notification.user_id.is_(None)
            )
        )
    
    if is_admin or is_gov:
        conditions.append(
            and_(
                Notification.is_global == True,
                Notification.user_id.is_(None)
            )
        )
    
    query = select(Notification).where(or_(*conditions))
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=n.id,
            notification_type=n.notification_type,
            title=n.title,
            message=n.message,
            entity_type=n.entity_type,
            entity_id=n.entity_id,
            sender_game_name=n.sender_game_name,
            sender_sector=n.sender_sector,
            is_read=n.is_read,
            created_at=n.created_at.isoformat() if n.created_at else ""
        )
        for n in notifications
    ]


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Segna una notifica come letta.
    """
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"message": "Notifica segnata come letta"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Segna tutte le notifiche dell'utente come lette.
    """
    user_sector = current_user.sector.upper() if current_user.sector else "CIVIL"
    is_admin = user_sector == "ADMIN"
    is_gov = user_sector == "GOV"
    is_chief = current_user.is_sector_chief
    
    conditions = [
        Notification.user_id == current_user.id
    ]
    
    if is_chief:
        conditions.append(
            and_(
                Notification.target_sector == user_sector,
                Notification.user_id.is_(None)
            )
        )
    
    if is_admin or is_gov:
        conditions.append(
            and_(
                Notification.is_global == True,
                Notification.user_id.is_(None)
            )
        )
    
    await db.execute(
        update(Notification)
        .where(or_(*conditions))
        .where(Notification.is_read == False)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    
    await db.commit()
    
    return {"message": "Tutte le notifiche segnate come lette"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una notifica (solo per Admin).
    """
    user_sector = current_user.sector.upper() if current_user.sector else "CIVIL"
    
    if user_sector != "ADMIN":
        raise HTTPException(status_code=403, detail="Solo Admin può eliminare notifiche")
    
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notifica non trovata")
    
    await db.delete(notification)
    await db.commit()
    
    return {"message": "Notifica eliminata"}
