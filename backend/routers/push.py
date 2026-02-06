"""
PURE LIFE OS - Web Push Notifications Router
Sistema di notifiche push con VAPID keys
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import json

from database import get_db
from models import User, PushSubscription, AuditAction
from auth import get_current_user
from services.audit_service import AuditService

router = APIRouter(prefix="/push", tags=["Push Notifications"])
audit_service = AuditService()

# ==========================================
# VAPID KEYS
# ==========================================
# Generiamo le chiavi VAPID una volta e le salviamo
# In produzione, queste dovrebbero essere in env vars

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")

# Se non esistono, usiamo chiavi di fallback (per dev)
if not VAPID_PUBLIC_KEY:
    # Chiavi di esempio - in produzione generare con: npx web-push generate-vapid-keys
    VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"

VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:admin@purelife.rp")


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}
    device_name: Optional[str] = None


class PushPreferences(BaseModel):
    notify_recruitment: bool = True
    notify_appointments: bool = True
    notify_breaking_news: bool = True
    notify_chat: bool = False


class PushSubscriptionResponse(BaseModel):
    id: int
    device_name: Optional[str]
    is_active: bool
    notify_recruitment: bool
    notify_appointments: bool
    notify_breaking_news: bool
    notify_chat: bool
    created_at: str


# ==========================================
# API ENDPOINTS
# ==========================================

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Restituisce la chiave pubblica VAPID per il client"""
    return {
        "publicKey": VAPID_PUBLIC_KEY
    }


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_push(
    data: PushSubscriptionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra una subscription push per l'utente"""
    # Verifica che la subscription non esista già
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == data.endpoint)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Aggiorna se appartiene allo stesso utente
        if existing.user_id == current_user.id:
            existing.p256dh_key = data.keys.get("p256dh", "")
            existing.auth_key = data.keys.get("auth", "")
            existing.is_active = True
            existing.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(existing)
            return _subscription_to_response(existing)
        else:
            # Subscription appartiene ad altro utente - riassegna
            existing.user_id = current_user.id
            existing.p256dh_key = data.keys.get("p256dh", "")
            existing.auth_key = data.keys.get("auth", "")
            existing.is_active = True
            await db.commit()
            await db.refresh(existing)
            return _subscription_to_response(existing)
    
    # Crea nuova subscription
    user_agent = request.headers.get("User-Agent", "")
    
    subscription = PushSubscription(
        user_id=current_user.id,
        endpoint=data.endpoint,
        p256dh_key=data.keys.get("p256dh", ""),
        auth_key=data.keys.get("auth", ""),
        user_agent=user_agent[:500] if user_agent else None,
        device_name=data.device_name
    )
    
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.PUSH_SUBSCRIBE,
        user=current_user,
        entity_type="push_subscription",
        entity_id=subscription.id,
        description=f"Push subscription attivata: {data.device_name or 'Dispositivo'}",
        request=request
    )
    
    return _subscription_to_response(subscription)


@router.delete("/unsubscribe")
async def unsubscribe_push(
    endpoint: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rimuove una subscription push"""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == current_user.id
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription non trovata")
    
    sub_id = subscription.id
    await db.delete(subscription)
    await db.commit()
    
    # Audit
    await audit_service.log(
        db,
        action=AuditAction.PUSH_UNSUBSCRIBE,
        user=current_user,
        entity_type="push_subscription",
        entity_id=sub_id,
        description="Push subscription rimossa",
        request=request
    )
    
    return {"message": "Subscription rimossa"}


@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottiene le subscription dell'utente corrente"""
    result = await db.execute(
        select(PushSubscription).where(PushSubscription.user_id == current_user.id)
    )
    subscriptions = result.scalars().all()
    
    return [_subscription_to_response(s) for s in subscriptions]


@router.put("/preferences", response_model=PushSubscriptionResponse)
async def update_preferences(
    data: PushPreferences,
    subscription_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna le preferenze di notifica per una subscription"""
    if subscription_id:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.id == subscription_id,
                PushSubscription.user_id == current_user.id
            )
        )
    else:
        # Prendi la prima subscription attiva
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == current_user.id,
                PushSubscription.is_active == True
            ).limit(1)
        )
    
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription non trovata")
    
    subscription.notify_recruitment = data.notify_recruitment
    subscription.notify_appointments = data.notify_appointments
    subscription.notify_breaking_news = data.notify_breaking_news
    subscription.notify_chat = data.notify_chat
    
    await db.commit()
    await db.refresh(subscription)
    
    return _subscription_to_response(subscription)


@router.post("/toggle/{subscription_id}")
async def toggle_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Attiva/disattiva una subscription"""
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.id == subscription_id,
            PushSubscription.user_id == current_user.id
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription non trovata")
    
    subscription.is_active = not subscription.is_active
    await db.commit()
    
    return {
        "message": f"Subscription {'attivata' if subscription.is_active else 'disattivata'}",
        "is_active": subscription.is_active
    }


# ==========================================
# HELPER PER INVIO NOTIFICHE PUSH
# ==========================================

async def send_push_notification(
    db: AsyncSession,
    user_id: int = None,
    sector: str = None,
    is_global: bool = False,
    notification_type: str = "general",
    title: str = "",
    body: str = "",
    url: str = None,
    tag: str = None
):
    """
    Invia notifica push agli utenti.
    Questa è una funzione helper che può essere chiamata da altri moduli.
    
    Per ora logga solo l'intento - l'implementazione completa richiede pywebpush.
    """
    # Determina i destinatari
    query = select(PushSubscription).where(PushSubscription.is_active == True)
    
    if user_id:
        query = query.where(PushSubscription.user_id == user_id)
    elif sector and not is_global:
        # Filtra per settore (richiede join con User)
        from models import User
        query = select(PushSubscription).join(
            User, PushSubscription.user_id == User.id
        ).where(
            PushSubscription.is_active == True,
            User.sector == sector
        )
    
    # Filtra per preferenze
    if notification_type == "recruitment":
        query = query.where(PushSubscription.notify_recruitment == True)
    elif notification_type == "appointment":
        query = query.where(PushSubscription.notify_appointments == True)
    elif notification_type == "breaking":
        query = query.where(PushSubscription.notify_breaking_news == True)
    elif notification_type == "chat":
        query = query.where(PushSubscription.notify_chat == True)
    
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    # Per ora loggiamo - l'invio vero richiede pywebpush
    if subscriptions:
        print(f"[PUSH] Would send to {len(subscriptions)} devices: {title}")
        
        # Aggiorna last_used_at
        for sub in subscriptions:
            sub.last_used_at = datetime.now(timezone.utc)
        await db.commit()
    
    return len(subscriptions)


def _subscription_to_response(sub: PushSubscription) -> PushSubscriptionResponse:
    return PushSubscriptionResponse(
        id=sub.id,
        device_name=sub.device_name,
        is_active=sub.is_active,
        notify_recruitment=sub.notify_recruitment,
        notify_appointments=sub.notify_appointments,
        notify_breaking_news=sub.notify_breaking_news,
        notify_chat=sub.notify_chat,
        created_at=sub.created_at.isoformat() if sub.created_at else ""
    )
