"""
PURE LIFE OS - Service Chat Router
Chat operativa interna con canali e azioni rapide
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import User, UserPresence, ChatChannel, ChatMessage, TimelineEvent
from schemas import (
    ChatChannelCreate, ChatChannelResponse,
    ChatMessageCreate, ChatMessageResponse,
    UserPresenceUpdate, MessageResponse
)
from auth import get_current_user
from sse_manager import sse_manager

router = APIRouter(prefix="/chat", tags=["Service Chat"])


# Default channels configuration
DEFAULT_CHANNELS = [
    {"name": "dispatch", "display_name": "Dispatch", "allowed_roles": ["police", "ems", "dispatch", "admin"]},
    {"name": "pattuglie", "display_name": "Pattuglie LSPD", "allowed_roles": ["police", "dispatch", "admin"]},
    {"name": "ems-radio", "display_name": "Radio EMS", "allowed_roles": ["ems", "dispatch", "admin"]},
    {"name": "tribunale", "display_name": "Tribunale", "allowed_roles": ["judge", "lawyer", "prosecutor", "government", "admin"]},
    {"name": "governo", "display_name": "Governo", "allowed_roles": ["government", "judge", "admin"]},
    {"name": "annunci", "display_name": "Annunci", "allowed_roles": None},  # All roles
]


# ==========================================
# CHANNELS
# ==========================================

@router.get("/channels", response_model=List[ChatChannelResponse])
async def get_channels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista canali accessibili all'utente"""
    result = await db.execute(
        select(ChatChannel).where(ChatChannel.is_active == True)
    )
    channels = result.scalars().all()
    
    # Filter by user role
    user_role = current_user.role.value
    accessible = []
    for ch in channels:
        if ch.allowed_roles is None or user_role in ch.allowed_roles or user_role == "admin":
            accessible.append(ch)
    
    return accessible


@router.post("/channels/init")
async def init_default_channels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Inizializza canali default (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admin")
    
    created = []
    for ch_data in DEFAULT_CHANNELS:
        result = await db.execute(
            select(ChatChannel).where(ChatChannel.name == ch_data["name"])
        )
        if not result.scalar_one_or_none():
            channel = ChatChannel(**ch_data)
            db.add(channel)
            created.append(ch_data["name"])
    
    await db.commit()
    
    return {"created_channels": created}


@router.get("/channels/{channel_id}/messages", response_model=List[ChatMessageResponse])
async def get_channel_messages(
    channel_id: int,
    limit: int = Query(50, le=200),
    before_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista messaggi canale"""
    # Verify channel access
    result = await db.execute(select(ChatChannel).where(ChatChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    user_role = current_user.role.value
    if channel.allowed_roles and user_role not in channel.allowed_roles and user_role != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato al canale")
    
    query = select(ChatMessage).where(ChatMessage.channel_id == channel_id)
    
    if before_id:
        query = query.where(ChatMessage.id < before_id)
    
    query = query.order_by(desc(ChatMessage.created_at)).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Add sender names
    response = []
    for msg in reversed(messages):
        sender_result = await db.execute(select(User.name).where(User.id == msg.sender_id))
        sender_name = sender_result.scalar_one_or_none()
        
        response.append(ChatMessageResponse(
            id=msg.id,
            channel_id=msg.channel_id,
            sender_id=msg.sender_id,
            content=msg.content,
            message_type=msg.message_type,
            action_type=msg.action_type,
            action_data=msg.action_data,
            is_pinned=msg.is_pinned,
            created_at=msg.created_at,
            sender_name=sender_name
        ))
    
    return response


@router.post("/messages", response_model=ChatMessageResponse)
async def send_message(
    request: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Invia messaggio"""
    # Verify channel access
    result = await db.execute(select(ChatChannel).where(ChatChannel.id == request.channel_id))
    channel = result.scalar_one_or_none()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Canale non trovato")
    
    user_role = current_user.role.value
    if channel.allowed_roles and user_role not in channel.allowed_roles and user_role != "admin":
        raise HTTPException(status_code=403, detail="Accesso negato al canale")
    
    message = ChatMessage(
        channel_id=request.channel_id,
        sender_id=current_user.id,
        content=request.content,
        message_type=request.message_type,
        action_type=request.action_type,
        action_data=request.action_data
    )
    
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Broadcast to channel
    await sse_manager.broadcast(f"chat_message_{channel.name}", {
        "message_id": message.id,
        "channel_id": message.channel_id,
        "channel_name": channel.name,
        "sender_id": current_user.id,
        "sender_name": current_user.name,
        "content": message.content,
        "message_type": message.message_type,
        "action_type": message.action_type,
        "action_data": message.action_data,
        "created_at": message.created_at.isoformat()
    })
    
    return ChatMessageResponse(
        id=message.id,
        channel_id=message.channel_id,
        sender_id=message.sender_id,
        content=message.content,
        message_type=message.message_type,
        action_type=message.action_type,
        action_data=message.action_data,
        is_pinned=message.is_pinned,
        created_at=message.created_at,
        sender_name=current_user.name
    )


@router.post("/messages/{message_id}/pin", response_model=MessageResponse)
async def pin_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fissa messaggio"""
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Messaggio non trovato")
    
    message.is_pinned = not message.is_pinned
    await db.commit()
    
    return MessageResponse(message=f"Messaggio {'fissato' if message.is_pinned else 'rimosso dai fissati'}")


# ==========================================
# QUICK ACTIONS
# ==========================================

@router.post("/actions/create-call")
async def quick_create_call(
    location: str,
    call_type: str,
    priority: str = "P3",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Azione rapida: crea chiamata dispatch"""
    from models import DispatchCall, CallPriority, CallStatus
    from utils import generate_call_number
    
    call = DispatchCall(
        call_number=generate_call_number(),
        priority=CallPriority(priority),
        call_type=call_type,
        location=location,
        dispatcher_id=current_user.id,
        status=CallStatus.PENDING
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    await sse_manager.broadcast("call_created", {
        "call_id": call.id,
        "call_number": call.call_number,
        "call_type": call_type,
        "location": location,
        "priority": priority
    })
    
    return {"call_id": call.id, "call_number": call.call_number}


@router.post("/actions/send-location")
async def quick_send_location(
    channel_id: int,
    coords_x: float,
    coords_y: float,
    coords_z: float,
    label: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Azione rapida: invia posizione"""
    message = ChatMessage(
        channel_id=channel_id,
        sender_id=current_user.id,
        content=label or "Posizione condivisa",
        message_type="location",
        action_type="location",
        action_data={
            "x": coords_x,
            "y": coords_y,
            "z": coords_z,
            "label": label
        }
    )
    
    db.add(message)
    await db.commit()
    
    return {"success": True, "message_id": message.id}


# ==========================================
# PRESENCE
# ==========================================

@router.put("/presence", response_model=MessageResponse)
async def update_presence(
    request: UserPresenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna stato presenza"""
    current_user.presence = request.presence
    current_user.last_seen = datetime.now(timezone.utc)
    await db.commit()
    
    await sse_manager.broadcast("presence_update", {
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.role.value,
        "presence": request.presence.value
    })
    
    return MessageResponse(message=f"Stato aggiornato: {request.presence.value}")


@router.get("/online")
async def get_online_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista utenti online"""
    result = await db.execute(
        select(User)
        .where(User.presence.in_([UserPresence.ONLINE, UserPresence.IN_SERVICE]))
        .order_by(User.role, User.name)
    )
    
    users = result.scalars().all()
    
    return {
        "online": [
            {
                "id": u.id,
                "name": u.name,
                "role": u.role.value,
                "presence": u.presence.value,
                "badge": u.badge_number
            }
            for u in users
        ]
    }
