"""
PURE LIFE OS - Service Chat 2.0 Router
Chat interna per settori con presenza e moderazione
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (
    User, Sector, ChatChannel, ChatMessage, UserPresenceRecord, 
    AuditAction, NotificationType
)
from auth import get_current_user
from services.audit_service import AuditService
from routers.notifications import notify_user, create_notification
from routers.push import send_push_notification
import re

router = APIRouter(prefix="/chat", tags=["Service Chat"])
audit_service = AuditService()

# Canali predefiniti
DEFAULT_CHANNELS = [
    {"name": "lspd", "display_name": "LSPD", "sector": "LSPD", "description": "Canale Los Santos Police Department"},
    {"name": "ems", "display_name": "EMS", "sector": "EMS", "description": "Canale Emergency Medical Services"},
    {"name": "gov", "display_name": "GOVERNO", "sector": "GOV", "description": "Canale Governo"},
    {"name": "dispatch", "display_name": "CENTRALE OPERATIVA", "sector": "DISPATCH", "description": "Canale Dispatch Center"},
    {"name": "weazel", "display_name": "WEAZEL NEWS", "sector": "NEWS", "description": "Canale Weazel News"},
    {"name": "staff", "display_name": "STAFF", "sector": "ADMIN", "description": "Canale Staff/Admin", "min_level": 7},
]


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class ChannelResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    sector: Optional[str]
    min_level: int
    is_active: bool


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # text, link, announcement


class MessageResponse(BaseModel):
    id: int
    channel_id: int
    author_id: int
    author_game_name: str
    author_sector: str
    author_grade: Optional[str]
    content: str
    message_type: str
    is_pinned: bool
    is_deleted: bool
    created_at: str


class PresenceUpdate(BaseModel):
    status: str  # online, in_service, off_duty
    status_message: Optional[str] = None


class PresenceResponse(BaseModel):
    user_id: int
    game_name: str
    sector: str
    grade: Optional[str]
    status: str
    status_message: Optional[str]
    last_seen: str


# ==========================================
# HELPERS
# ==========================================

def can_access_channel(user: User, channel: ChatChannel) -> bool:
    """Verifica se l'utente può accedere al canale"""
    # Admin può tutto
    if user.sector == Sector.ADMIN:
        return True
    
    # Verifica livello minimo
    user_level = user.hierarchy_level or 1
    if user_level < channel.min_level:
        return False
    
    # Canale di settore - deve appartenere al settore
    if channel.sector:
        return user.sector and user.sector.value == channel.sector
    
    return True


def can_moderate(user: User, channel: ChatChannel) -> bool:
    """Verifica se l'utente può moderare nel canale"""
    # Admin può tutto
    if user.sector == Sector.ADMIN:
        return True
    
    # Livello 7+ o capo settore può moderare nel proprio settore
    user_level = user.hierarchy_level or 1
    is_chief = user.is_sector_chief
    
    if channel.sector and user.sector and user.sector.value == channel.sector:
        return user_level >= 7 or is_chief
    
    return False


def _message_to_response(msg: ChatMessage) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        channel_id=msg.channel_id,
        author_id=msg.author_id,
        author_game_name=msg.author_game_name,
        author_sector=msg.author_sector,
        author_grade=msg.author_grade,
        content=msg.content if not msg.is_deleted else "[Messaggio eliminato]",
        message_type=msg.message_type,
        is_pinned=msg.is_pinned,
        is_deleted=msg.is_deleted,
        created_at=msg.created_at.isoformat() if msg.created_at else ""
    )


# ==========================================
# INIZIALIZZAZIONE CANALI
# ==========================================

async def ensure_default_channels(db: AsyncSession):
    """Crea i canali predefiniti se non esistono"""
    for ch_data in DEFAULT_CHANNELS:
        result = await db.execute(
            select(ChatChannel).where(ChatChannel.name == ch_data["name"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            channel = ChatChannel(
                name=ch_data["name"],
                display_name=ch_data["display_name"],
                description=ch_data.get("description"),
                sector=ch_data.get("sector"),
                min_level=ch_data.get("min_level", 1),
                channel_type="sector" if ch_data.get("sector") else "general"
            )
            db.add(channel)
    
    await db.commit()


# ==========================================
# API CANALI
# ==========================================

@router.get("/channels", response_model=List[ChannelResponse])
async def get_channels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene i canali accessibili all'utente"""
    # Assicura che i canali predefiniti esistano
    await ensure_default_channels(db)
    
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.is_active == True)
    )
    all_channels = result.scalars().all()
    
    # Filtra per accesso
    accessible = [ch for ch in all_channels if can_access_channel(current_user, ch)]
    
    return [
        ChannelResponse(
            id=ch.id,
            name=ch.name,
            display_name=ch.display_name,
            description=ch.description,
            sector=ch.sector,
            min_level=ch.min_level,
            is_active=ch.is_active
        )
        for ch in accessible
    ]


@router.get("/channels/{channel_name}/messages", response_model=List[MessageResponse])
async def get_channel_messages(
    channel_name: str,
    limit: int = Query(default=50, le=100),
    before_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene i messaggi di un canale"""
    # Trova canale
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.name == channel_name)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    if not can_access_channel(current_user, channel):
        raise HTTPException(status_code=403, detail="Non hai accesso a questo canale")
    
    # Query messaggi
    query = select(ChatMessage).where(
        and_(
            ChatMessage.channel_id == channel.id,
            ChatMessage.is_deleted == False
        )
    )
    
    if before_id:
        query = query.where(ChatMessage.id < before_id)
    
    query = query.order_by(desc(ChatMessage.created_at)).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Ordina dal più vecchio al più nuovo per la UI
    messages = list(reversed(messages))
    
    return [_message_to_response(m) for m in messages]


@router.post("/channels/{channel_name}/messages", response_model=MessageResponse)
async def send_message(
    channel_name: str,
    data: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Invia un messaggio nel canale"""
    # Trova canale
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.name == channel_name)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    if not can_access_channel(current_user, channel):
        raise HTTPException(status_code=403, detail="Non hai accesso a questo canale")
    
    # Valida contenuto
    if not data.content or len(data.content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Messaggio vuoto")
    
    if len(data.content) > 2000:
        raise HTTPException(status_code=400, detail="Messaggio troppo lungo (max 2000 caratteri)")
    
    # Solo livello 3+ può inviare annunci
    if data.message_type == "announcement":
        user_level = current_user.hierarchy_level or 1
        if user_level < 3:
            raise HTTPException(status_code=403, detail="Solo livello 3+ può inviare annunci")
    
    message = ChatMessage(
        channel_id=channel.id,
        author_id=current_user.id,
        author_game_name=current_user.game_name or current_user.email,
        author_sector=current_user.sector.value if current_user.sector else "CIVIL",
        author_grade=current_user.grade,
        content=data.content.strip(),
        message_type=data.message_type
    )
    
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.CHAT_MESSAGE_SEND,
        user=current_user,
        entity_type="chat_message",
        entity_id=message.id,
        description=f"Messaggio in {channel.display_name}",
        request=request
    )
    
    # Aggiorna presenza
    await update_user_presence(db, current_user, channel.id)
    
    return _message_to_response(message)


@router.post("/channels/{channel_name}/messages/{message_id}/pin")
async def toggle_pin_message(
    channel_name: str,
    message_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fissa/sfissa un messaggio (livello 3+)"""
    # Trova canale
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.name == channel_name)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    if not can_access_channel(current_user, channel):
        raise HTTPException(status_code=403, detail="Non hai accesso a questo canale")
    
    user_level = current_user.hierarchy_level or 1
    if user_level < 3 and current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo livello 3+ può pinnare messaggi")
    
    # Trova messaggio
    result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.channel_id == channel.id
            )
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    message.is_pinned = not message.is_pinned
    await db.commit()
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.CHAT_MESSAGE_PIN,
        user=current_user,
        entity_type="chat_message",
        entity_id=message.id,
        description=f"Messaggio {'pinnato' if message.is_pinned else 'spinnato'}",
        request=request
    )
    
    return {"message": f"Messaggio {'pinnato' if message.is_pinned else 'spinnato'}"}


@router.delete("/channels/{channel_name}/messages/{message_id}")
async def delete_message(
    channel_name: str,
    message_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina un messaggio (moderazione)"""
    # Trova canale
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.name == channel_name)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    # Trova messaggio
    result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.id == message_id,
                ChatMessage.channel_id == channel.id
            )
        )
    )
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    # Verifica permessi: autore del messaggio o moderatore
    can_delete = (
        message.author_id == current_user.id or
        can_moderate(current_user, channel)
    )
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="Non puoi eliminare questo messaggio")
    
    # Soft delete
    message.is_deleted = True
    message.deleted_by_id = current_user.id
    message.deleted_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.CHAT_MESSAGE_DELETE,
        user=current_user,
        entity_type="chat_message",
        entity_id=message.id,
        description=f"Messaggio eliminato in {channel.display_name}",
        request=request
    )
    
    return {"message": "Messaggio eliminato"}


@router.get("/channels/{channel_name}/pinned", response_model=List[MessageResponse])
async def get_pinned_messages(
    channel_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene i messaggi pinnati di un canale"""
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.name == channel_name)
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    if not can_access_channel(current_user, channel):
        raise HTTPException(status_code=403, detail="Non hai accesso a questo canale")
    
    result = await db.execute(
        select(ChatMessage).where(
            and_(
                ChatMessage.channel_id == channel.id,
                ChatMessage.is_pinned == True,
                ChatMessage.is_deleted == False
            )
        ).order_by(desc(ChatMessage.created_at))
    )
    messages = result.scalars().all()
    
    return [_message_to_response(m) for m in messages]


# ==========================================
# API PRESENZA
# ==========================================

async def update_user_presence(db: AsyncSession, user: User, channel_id: int = None):
    """Aggiorna la presenza dell'utente"""
    result = await db.execute(
        select(UserPresenceRecord).where(UserPresenceRecord.user_id == user.id)
    )
    presence = result.scalar_one_or_none()
    
    if not presence:
        presence = UserPresenceRecord(
            user_id=user.id,
            status="online"
        )
        db.add(presence)
    
    presence.last_seen = datetime.now(timezone.utc)
    if channel_id:
        presence.last_channel_id = channel_id
    
    await db.commit()


@router.get("/presence", response_model=List[PresenceResponse])
async def get_presence(
    channel_name: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene la presenza degli utenti"""
    from datetime import timedelta
    
    # Filtra utenti attivi negli ultimi 5 minuti
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    
    query = select(UserPresenceRecord, User).join(
        User, UserPresenceRecord.user_id == User.id
    ).where(
        UserPresenceRecord.last_seen >= cutoff
    )
    
    # Se specificato un canale, filtra per settore
    if channel_name:
        result = await db.execute(
            select(ChatChannel).where(ChatChannel.name == channel_name)
        )
        channel = result.scalar_one_or_none()
        if channel and channel.sector:
            query = query.where(User.sector == channel.sector)
    
    result = await db.execute(query)
    records = result.all()
    
    return [
        PresenceResponse(
            user_id=presence.user_id,
            game_name=user.game_name or user.name,
            sector=user.sector.value if user.sector else "CIVIL",
            grade=user.grade,
            status=presence.status,
            status_message=presence.status_message,
            last_seen=presence.last_seen.isoformat() if presence.last_seen else ""
        )
        for presence, user in records
    ]


@router.put("/presence", response_model=PresenceResponse)
async def update_my_presence(
    data: PresenceUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna lo stato di presenza dell'utente corrente"""
    valid_statuses = ["online", "in_service", "off_duty"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Stato non valido. Valori: {valid_statuses}")
    
    result = await db.execute(
        select(UserPresenceRecord).where(UserPresenceRecord.user_id == current_user.id)
    )
    presence = result.scalar_one_or_none()
    
    old_status = presence.status if presence else "offline"
    
    if not presence:
        presence = UserPresenceRecord(user_id=current_user.id)
        db.add(presence)
    
    presence.status = data.status
    presence.status_message = data.status_message
    presence.last_seen = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(presence)
    
    # Audit solo se lo stato è cambiato
    if old_status != data.status:
        await audit_service.log(
            db,
            action=AuditAction.PRESENCE_CHANGE,
            user=current_user,
            entity_type="presence",
            entity_id=presence.id,
            description=f"Stato cambiato da {old_status} a {data.status}",
            request=request
        )
    
    return PresenceResponse(
        user_id=current_user.id,
        game_name=current_user.game_name or current_user.email,
        sector=current_user.sector.value if current_user.sector else "CIVIL",
        grade=current_user.grade,
        status=presence.status,
        status_message=presence.status_message,
        last_seen=presence.last_seen.isoformat()
    )


@router.get("/presence/me", response_model=PresenceResponse)
async def get_my_presence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene lo stato di presenza dell'utente corrente"""
    result = await db.execute(
        select(UserPresenceRecord).where(UserPresenceRecord.user_id == current_user.id)
    )
    presence = result.scalar_one_or_none()
    
    if not presence:
        # Crea record default
        presence = UserPresenceRecord(
            user_id=current_user.id,
            status="online"
        )
        db.add(presence)
        await db.commit()
        await db.refresh(presence)
    
    return PresenceResponse(
        user_id=current_user.id,
        game_name=current_user.game_name or current_user.email,
        sector=current_user.sector.value if current_user.sector else "CIVIL",
        grade=current_user.grade,
        status=presence.status,
        status_message=presence.status_message,
        last_seen=presence.last_seen.isoformat() if presence.last_seen else ""
    )
