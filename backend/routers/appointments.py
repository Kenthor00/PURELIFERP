"""
PURE LIFE OS - Agenda / Appointments Router
CRUD completo + Reminder + WebSocket + Discord Webhook
"""
import os
import httpx
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from pydantic import BaseModel, Field

from database import get_db
from models import (
    User, Sector, Appointment, AppointmentStatus, AppointmentType,
    AuditLog, AuditAction, LegalCase, Case
)
from auth import get_current_user, require_roles, UserRole, log_audit
from websocket_engine import (
    ws_manager, WSEventType, NUIChannel,
    send_appointment_notification, send_appointment_reminder
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["Agenda"])


# ==========================================
# SCHEMAS
# ==========================================

class AppointmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    appointment_type: AppointmentType = AppointmentType.MEETING
    scheduled_at: datetime
    duration_minutes: int = 60
    location: Optional[str] = None
    location_coords_x: Optional[float] = None
    location_coords_y: Optional[float] = None
    participant_ids: Optional[List[int]] = None
    legal_case_id: Optional[int] = None
    lspd_case_id: Optional[int] = None
    reminder_settings: Optional[dict] = Field(default={"t_24h": True, "t_1h": True, "t_15m": True})
    discord_webhook_url: Optional[str] = None
    notes: Optional[str] = None
    is_private: bool = False
    is_all_day: bool = False
    color: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    appointment_type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    location_coords_x: Optional[float] = None
    location_coords_y: Optional[float] = None
    participant_ids: Optional[List[int]] = None
    reminder_settings: Optional[dict] = None
    discord_webhook_url: Optional[str] = None
    notes: Optional[str] = None
    is_private: Optional[bool] = None
    color: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    appointment_type: str
    status: str
    scheduled_at: datetime
    duration_minutes: int
    end_at: Optional[datetime]
    location: Optional[str]
    location_coords_x: Optional[float]
    location_coords_y: Optional[float]
    organizer_id: int
    organizer_name: Optional[str] = None
    participant_ids: Optional[List[int]]
    legal_case_id: Optional[int]
    lspd_case_id: Optional[int]
    reminder_settings: Optional[dict]
    notes: Optional[str]
    is_private: bool
    is_all_day: bool
    color: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CalendarView(BaseModel):
    """Vista calendario con eventi raggruppati"""
    date: str
    appointments: List[AppointmentResponse]


# ==========================================
# DISCORD WEBHOOK
# ==========================================

async def send_discord_reminder(appointment: Appointment, reminder_type: str):
    """Invia reminder su Discord via webhook"""
    if not appointment.discord_webhook_url:
        return False
    
    try:
        # Formatta il messaggio embed
        embed = {
            "title": f"📅 Reminder: {appointment.title}",
            "description": appointment.description or "Nessuna descrizione",
            "color": 0x00ff9c,  # Verde PLOS
            "fields": [
                {
                    "name": "⏰ Data/Ora",
                    "value": appointment.scheduled_at.strftime("%d/%m/%Y alle %H:%M"),
                    "inline": True
                },
                {
                    "name": "⏱️ Durata",
                    "value": f"{appointment.duration_minutes} minuti",
                    "inline": True
                },
                {
                    "name": "📍 Luogo",
                    "value": appointment.location or "Non specificato",
                    "inline": True
                },
                {
                    "name": "🔔 Tipo Reminder",
                    "value": reminder_type,
                    "inline": True
                }
            ],
            "footer": {
                "text": "PURE LIFE OS - Agenda"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Aggiungi link se è un'udienza
        if appointment.legal_case_id:
            embed["fields"].append({
                "name": "⚖️ Pratica",
                "value": f"ID: {appointment.legal_case_id}",
                "inline": True
            })
        
        payload = {
            "username": "PURE LIFE OS",
            "avatar_url": "https://i.imgur.com/YourLogo.png",
            "embeds": [embed]
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(appointment.discord_webhook_url, json=payload)
            return response.status_code == 204
            
    except Exception as e:
        logger.error(f"Discord webhook error: {e}")
        return False


# ==========================================
# REMINDER SCHEDULER
# ==========================================

async def check_and_send_reminders(db: AsyncSession):
    """
    Controlla appuntamenti e invia reminder.
    Chiamato periodicamente da un background task.
    """
    now = datetime.now(timezone.utc)
    
    # Trova appuntamenti con reminder da inviare
    # T-24h, T-1h, T-15m
    reminder_windows = [
        ("t_24h", timedelta(hours=24), timedelta(hours=23, minutes=55)),
        ("t_1h", timedelta(hours=1), timedelta(minutes=55)),
        ("t_15m", timedelta(minutes=15), timedelta(minutes=10)),
    ]
    
    for reminder_key, delta_start, delta_end in reminder_windows:
        window_start = now + delta_end
        window_end = now + delta_start
        
        # Query appuntamenti nella finestra
        query = select(Appointment).where(
            and_(
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
                Appointment.scheduled_at >= window_start,
                Appointment.scheduled_at <= window_end,
            )
        )
        
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        for apt in appointments:
            # Check se reminder già inviato
            sent = apt.reminder_sent or {}
            settings = apt.reminder_settings or {}
            
            if settings.get(reminder_key) and not sent.get(reminder_key):
                # Invia reminder
                logger.info(f"Sending {reminder_key} reminder for appointment {apt.id}")
                
                # WebSocket notification all'organizzatore
                await send_appointment_reminder(apt.organizer_id, {
                    "id": apt.id,
                    "title": apt.title,
                    "scheduled_at": apt.scheduled_at.isoformat(),
                    "location": apt.location,
                    "reminder_type": reminder_key
                })
                
                # WebSocket ai partecipanti
                if apt.participant_ids:
                    for pid in apt.participant_ids:
                        await send_appointment_reminder(pid, {
                            "id": apt.id,
                            "title": apt.title,
                            "scheduled_at": apt.scheduled_at.isoformat(),
                            "location": apt.location,
                            "reminder_type": reminder_key
                        })
                
                # Discord webhook
                reminder_labels = {
                    "t_24h": "24 ore prima",
                    "t_1h": "1 ora prima",
                    "t_15m": "15 minuti prima"
                }
                await send_discord_reminder(apt, reminder_labels.get(reminder_key, reminder_key))
                
                # Marca come inviato
                sent[reminder_key] = datetime.now(timezone.utc).isoformat()
                apt.reminder_sent = sent
                await db.commit()


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("", response_model=List[AppointmentResponse])
async def get_appointments(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[AppointmentStatus] = None,
    appointment_type: Optional[AppointmentType] = None,
    include_private: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista appuntamenti con filtri.
    Default: prossimi 30 giorni.
    """
    if not start_date:
        start_date = datetime.now(timezone.utc)
    if not end_date:
        end_date = start_date + timedelta(days=30)
    
    query = select(Appointment).where(
        Appointment.scheduled_at >= start_date,
        Appointment.scheduled_at <= end_date
    )
    
    # Filtro privacy: mostra solo appuntamenti dove utente è organizzatore o partecipante
    if not include_private or current_user.sector not in [Sector.ADMIN, Sector.GOV]:
        query = query.where(
            or_(
                Appointment.is_private == False,
                Appointment.organizer_id == current_user.id,
                # Participant check (JSON contains)
                func.json_contains(Appointment.participant_ids, str(current_user.id))
            )
        )
    
    if status:
        query = query.where(Appointment.status == status)
    
    if appointment_type:
        query = query.where(Appointment.appointment_type == appointment_type)
    
    query = query.order_by(Appointment.scheduled_at).offset(offset).limit(limit)
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Enrich with organizer name
    responses = []
    for apt in appointments:
        apt_dict = {
            "id": apt.id,
            "title": apt.title,
            "description": apt.description,
            "appointment_type": apt.appointment_type.value if apt.appointment_type else "meeting",
            "status": apt.status.value if apt.status else "scheduled",
            "scheduled_at": apt.scheduled_at,
            "duration_minutes": apt.duration_minutes,
            "end_at": apt.end_at or (apt.scheduled_at + timedelta(minutes=apt.duration_minutes)),
            "location": apt.location,
            "location_coords_x": apt.location_coords_x,
            "location_coords_y": apt.location_coords_y,
            "organizer_id": apt.organizer_id,
            "organizer_name": apt.organizer.game_name if apt.organizer else None,
            "participant_ids": apt.participant_ids,
            "legal_case_id": apt.legal_case_id,
            "lspd_case_id": apt.lspd_case_id,
            "reminder_settings": apt.reminder_settings,
            "notes": apt.notes,
            "is_private": apt.is_private,
            "is_all_day": apt.is_all_day,
            "color": apt.color,
            "created_at": apt.created_at,
            "updated_at": apt.updated_at
        }
        responses.append(AppointmentResponse(**apt_dict))
    
    return responses


@router.get("/calendar/{year}/{month}")
async def get_calendar_month(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Vista calendario mensile"""
    from calendar import monthrange
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    _, last_day = monthrange(year, month)
    end_date = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    
    query = select(Appointment).where(
        Appointment.scheduled_at >= start_date,
        Appointment.scheduled_at <= end_date,
        or_(
            Appointment.is_private == False,
            Appointment.organizer_id == current_user.id,
        )
    ).order_by(Appointment.scheduled_at)
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Raggruppa per giorno
    calendar = {}
    for apt in appointments:
        day_key = apt.scheduled_at.strftime("%Y-%m-%d")
        if day_key not in calendar:
            calendar[day_key] = []
        calendar[day_key].append({
            "id": apt.id,
            "title": apt.title,
            "appointment_type": apt.appointment_type.value if apt.appointment_type else "meeting",
            "status": apt.status.value if apt.status else "scheduled",
            "scheduled_at": apt.scheduled_at.isoformat(),
            "duration_minutes": apt.duration_minutes,
            "location": apt.location,
            "color": apt.color,
            "is_all_day": apt.is_all_day
        })
    
    return {
        "year": year,
        "month": month,
        "days": calendar
    }


@router.get("/week")
async def get_calendar_week(
    date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Vista calendario settimanale"""
    if not date:
        date = datetime.now(timezone.utc)
    
    # Trova inizio settimana (lunedì)
    start_of_week = date - timedelta(days=date.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    query = select(Appointment).where(
        Appointment.scheduled_at >= start_of_week,
        Appointment.scheduled_at <= end_of_week,
        or_(
            Appointment.is_private == False,
            Appointment.organizer_id == current_user.id,
        )
    ).order_by(Appointment.scheduled_at)
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Raggruppa per giorno
    week = {}
    for i in range(7):
        day = start_of_week + timedelta(days=i)
        day_key = day.strftime("%Y-%m-%d")
        week[day_key] = []
    
    for apt in appointments:
        day_key = apt.scheduled_at.strftime("%Y-%m-%d")
        if day_key in week:
            week[day_key].append({
                "id": apt.id,
                "title": apt.title,
                "appointment_type": apt.appointment_type.value if apt.appointment_type else "meeting",
                "status": apt.status.value if apt.status else "scheduled",
                "scheduled_at": apt.scheduled_at.isoformat(),
                "duration_minutes": apt.duration_minutes,
                "location": apt.location,
                "color": apt.color
            })
    
    return {
        "start_date": start_of_week.strftime("%Y-%m-%d"),
        "end_date": end_of_week.strftime("%Y-%m-%d"),
        "days": week
    }


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio singolo appuntamento"""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # Check accesso
    if apt.is_private and apt.organizer_id != current_user.id:
        if not (apt.participant_ids and current_user.id in apt.participant_ids):
            if current_user.sector not in [Sector.ADMIN, Sector.GOV]:
                raise HTTPException(status_code=403, detail="Appuntamento privato")
    
    return AppointmentResponse(
        id=apt.id,
        title=apt.title,
        description=apt.description,
        appointment_type=apt.appointment_type.value if apt.appointment_type else "meeting",
        status=apt.status.value if apt.status else "scheduled",
        scheduled_at=apt.scheduled_at,
        duration_minutes=apt.duration_minutes,
        end_at=apt.end_at or (apt.scheduled_at + timedelta(minutes=apt.duration_minutes)),
        location=apt.location,
        location_coords_x=apt.location_coords_x,
        location_coords_y=apt.location_coords_y,
        organizer_id=apt.organizer_id,
        organizer_name=apt.organizer.game_name if apt.organizer else None,
        participant_ids=apt.participant_ids,
        legal_case_id=apt.legal_case_id,
        lspd_case_id=apt.lspd_case_id,
        reminder_settings=apt.reminder_settings,
        notes=apt.notes,
        is_private=apt.is_private,
        is_all_day=apt.is_all_day,
        color=apt.color,
        created_at=apt.created_at,
        updated_at=apt.updated_at
    )


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    request: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea nuovo appuntamento"""
    # Calcola end_at
    end_at = request.scheduled_at + timedelta(minutes=request.duration_minutes)
    
    apt = Appointment(
        title=request.title,
        description=request.description,
        appointment_type=request.appointment_type,
        scheduled_at=request.scheduled_at,
        duration_minutes=request.duration_minutes,
        end_at=end_at,
        location=request.location,
        location_coords_x=request.location_coords_x,
        location_coords_y=request.location_coords_y,
        organizer_id=current_user.id,
        participant_ids=request.participant_ids,
        legal_case_id=request.legal_case_id,
        lspd_case_id=request.lspd_case_id,
        reminder_settings=request.reminder_settings,
        discord_webhook_url=request.discord_webhook_url,
        notes=request.notes,
        is_private=request.is_private,
        is_all_day=request.is_all_day,
        color=request.color
    )
    
    db.add(apt)
    await db.commit()
    await db.refresh(apt)
    
    # Audit log
    await log_audit(
        db, AuditAction.APPOINTMENT_CREATE,
        user=current_user,
        entity_type="appointment",
        entity_id=apt.id,
        description=f"Creato appuntamento: {apt.title}",
        metadata={"scheduled_at": apt.scheduled_at.isoformat(), "location": apt.location}
    )
    
    # WebSocket notification
    await send_appointment_notification(current_user.id, WSEventType.APPOINTMENT_CREATED, {
        "id": apt.id,
        "title": apt.title,
        "scheduled_at": apt.scheduled_at.isoformat()
    })
    
    # Notify participants
    if apt.participant_ids:
        for pid in apt.participant_ids:
            await send_appointment_notification(pid, WSEventType.APPOINTMENT_CREATED, {
                "id": apt.id,
                "title": apt.title,
                "scheduled_at": apt.scheduled_at.isoformat(),
                "organizer": current_user.game_name
            })
    
    return AppointmentResponse(
        id=apt.id,
        title=apt.title,
        description=apt.description,
        appointment_type=apt.appointment_type.value,
        status=apt.status.value,
        scheduled_at=apt.scheduled_at,
        duration_minutes=apt.duration_minutes,
        end_at=apt.end_at,
        location=apt.location,
        location_coords_x=apt.location_coords_x,
        location_coords_y=apt.location_coords_y,
        organizer_id=apt.organizer_id,
        organizer_name=current_user.game_name,
        participant_ids=apt.participant_ids,
        legal_case_id=apt.legal_case_id,
        lspd_case_id=apt.lspd_case_id,
        reminder_settings=apt.reminder_settings,
        notes=apt.notes,
        is_private=apt.is_private,
        is_all_day=apt.is_all_day,
        color=apt.color,
        created_at=apt.created_at,
        updated_at=apt.updated_at
    )


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    request: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifica appuntamento"""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # Solo organizzatore o admin può modificare
    if apt.organizer_id != current_user.id and current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo l'organizzatore può modificare")
    
    # Store old values for audit
    old_values = {
        "title": apt.title,
        "scheduled_at": apt.scheduled_at.isoformat() if apt.scheduled_at else None,
        "status": apt.status.value if apt.status else None
    }
    
    # Apply updates
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(apt, field, value)
    
    # Ricalcola end_at se necessario
    if request.scheduled_at or request.duration_minutes:
        apt.end_at = apt.scheduled_at + timedelta(minutes=apt.duration_minutes)
    
    await db.commit()
    await db.refresh(apt)
    
    # Audit log
    await log_audit(
        db, AuditAction.APPOINTMENT_UPDATE,
        user=current_user,
        entity_type="appointment",
        entity_id=apt.id,
        description=f"Modificato appuntamento: {apt.title}",
        metadata={"old": old_values, "new": update_data}
    )
    
    # WebSocket notification
    await send_appointment_notification(apt.organizer_id, WSEventType.APPOINTMENT_UPDATED, {
        "id": apt.id,
        "title": apt.title,
        "scheduled_at": apt.scheduled_at.isoformat()
    })
    
    if apt.participant_ids:
        for pid in apt.participant_ids:
            await send_appointment_notification(pid, WSEventType.APPOINTMENT_UPDATED, {
                "id": apt.id,
                "title": apt.title,
                "scheduled_at": apt.scheduled_at.isoformat()
            })
    
    return AppointmentResponse(
        id=apt.id,
        title=apt.title,
        description=apt.description,
        appointment_type=apt.appointment_type.value,
        status=apt.status.value,
        scheduled_at=apt.scheduled_at,
        duration_minutes=apt.duration_minutes,
        end_at=apt.end_at,
        location=apt.location,
        location_coords_x=apt.location_coords_x,
        location_coords_y=apt.location_coords_y,
        organizer_id=apt.organizer_id,
        participant_ids=apt.participant_ids,
        legal_case_id=apt.legal_case_id,
        lspd_case_id=apt.lspd_case_id,
        reminder_settings=apt.reminder_settings,
        notes=apt.notes,
        is_private=apt.is_private,
        is_all_day=apt.is_all_day,
        color=apt.color,
        created_at=apt.created_at,
        updated_at=apt.updated_at
    )


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    reason: str = Query(None, description="Motivo cancellazione"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancella appuntamento"""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # Solo organizzatore o admin può cancellare
    if apt.organizer_id != current_user.id and current_user.sector != Sector.ADMIN:
        raise HTTPException(status_code=403, detail="Solo l'organizzatore può cancellare")
    
    apt.status = AppointmentStatus.CANCELLED
    apt.cancelled_at = datetime.now(timezone.utc)
    apt.cancelled_by = current_user.id
    apt.cancellation_reason = reason
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db, AuditAction.RESOURCE_DELETE,
        user=current_user,
        entity_type="appointment",
        entity_id=apt.id,
        description=f"Cancellato appuntamento: {apt.title}",
        metadata={"reason": reason}
    )
    
    # WebSocket notification
    await send_appointment_notification(apt.organizer_id, WSEventType.APPOINTMENT_CANCELLED, {
        "id": apt.id,
        "title": apt.title,
        "reason": reason
    })
    
    if apt.participant_ids:
        for pid in apt.participant_ids:
            await send_appointment_notification(pid, WSEventType.APPOINTMENT_CANCELLED, {
                "id": apt.id,
                "title": apt.title,
                "reason": reason
            })
    
    return {"message": "Appuntamento cancellato", "id": appointment_id}


@router.post("/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Conferma partecipazione a un appuntamento"""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    if apt.status == AppointmentStatus.SCHEDULED:
        apt.status = AppointmentStatus.CONFIRMED
        await db.commit()
    
    return {"message": "Partecipazione confermata", "id": appointment_id}


@router.post("/test-reminder/{appointment_id}")
async def test_reminder(
    appointment_id: int,
    reminder_type: str = Query("t_15m", description="Tipo reminder: t_24h, t_1h, t_15m"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test invio reminder (solo per debug)"""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # WebSocket
    await send_appointment_reminder(apt.organizer_id, {
        "id": apt.id,
        "title": apt.title,
        "scheduled_at": apt.scheduled_at.isoformat(),
        "location": apt.location,
        "reminder_type": reminder_type
    })
    
    # Discord
    reminder_labels = {
        "t_24h": "24 ore prima",
        "t_1h": "1 ora prima",
        "t_15m": "15 minuti prima"
    }
    discord_sent = await send_discord_reminder(apt, reminder_labels.get(reminder_type, reminder_type))
    
    return {
        "message": "Test reminder inviato",
        "websocket_sent": True,
        "discord_sent": discord_sent
    }
