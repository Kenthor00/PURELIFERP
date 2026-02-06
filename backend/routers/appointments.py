"""
PURE LIFE OS - Appointments Router
Sistema di appuntamenti tra civili e settori
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (
    User, Sector, Appointment, AppointmentStatus, AuditAction
)
from auth import get_current_user
from services.audit_service import AuditService

router = APIRouter(prefix="/appointments", tags=["appointments"])
audit_service = AuditService()


# ==========================================
# SCHEMAS
# ==========================================

class CreateAppointmentRequest(BaseModel):
    target_sector: str
    subject: str
    description: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    urgency: str = "normal"


class HandleAppointmentRequest(BaseModel):
    status: str  # "accepted", "rejected", "completed", "cancelled"
    notes: Optional[str] = None
    scheduled_date: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    target_sector: str
    requester_id: int
    requester_game_name: str
    requester_sector: str
    subject: str
    description: str
    preferred_date: Optional[str]
    preferred_time: Optional[str]
    urgency: str
    status: str
    handler_id: Optional[int]
    handler_game_name: Optional[str]
    handler_notes: Optional[str]
    scheduled_date: Optional[str]
    created_at: str
    updated_at: str


# ==========================================
# ENDPOINTS - REQUESTER
# ==========================================

@router.post("/request", response_model=AppointmentResponse)
async def create_appointment(
    data: CreateAppointmentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Richiedi un appuntamento con un settore"""
    
    # Valida settore target
    try:
        target_sector = Sector(data.target_sector.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Settore non valido: {data.target_sector}")
    
    # Non può richiedere appuntamento con ADMIN o CIVIL
    if target_sector in [Sector.ADMIN, Sector.CIVIL]:
        raise HTTPException(status_code=400, detail="Non puoi richiedere appuntamenti con questo settore")
    
    # Valida urgenza
    if data.urgency not in ["low", "normal", "high"]:
        data.urgency = "normal"
    
    # Parse data preferita se fornita
    preferred_date = None
    if data.preferred_date:
        try:
            preferred_date = datetime.fromisoformat(data.preferred_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    # Crea appuntamento
    appointment = Appointment(
        target_sector=target_sector.value,
        requester_id=current_user.id,
        requester_game_name=current_user.game_name or current_user.email,
        requester_sector=current_user.sector.value,
        subject=data.subject,
        description=data.description,
        preferred_date=preferred_date,
        preferred_time=data.preferred_time,
        urgency=data.urgency,
        status=AppointmentStatus.PENDING.value
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.APPOINTMENT_CREATE,
        user=current_user,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Richiesta appuntamento con {target_sector.value}: {data.subject}",
        request=request
    )
    
    return _appointment_to_response(appointment)


@router.get("/my-requests", response_model=List[AppointmentResponse])
async def get_my_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni i tuoi appuntamenti richiesti"""
    query = select(Appointment).where(
        Appointment.requester_id == current_user.id
    )
    
    if status:
        try:
            status_enum = AppointmentStatus(status.lower())
            query = query.where(Appointment.status == status_enum.value)
        except ValueError:
            pass
    
    query = query.order_by(desc(Appointment.created_at))
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    return [_appointment_to_response(a) for a in appointments]


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Annulla un appuntamento (solo richiedente o handler)"""
    
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # Solo richiedente o handler può annullare
    if current_user.id != appointment.requester_id and current_user.id != appointment.handler_id:
        if current_user.sector != Sector.ADMIN:
            raise HTTPException(status_code=403, detail="Non puoi annullare questo appuntamento")
    
    # Solo se pending o accepted
    if appointment.status not in [AppointmentStatus.PENDING.value, AppointmentStatus.ACCEPTED.value]:
        raise HTTPException(status_code=400, detail="Non puoi annullare questo appuntamento")
    
    appointment.status = AppointmentStatus.CANCELLED.value
    appointment.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.APPOINTMENT_CANCEL,
        user=current_user,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Appuntamento annullato: {appointment.subject}",
        request=request
    )
    
    return {"message": "Appuntamento annullato"}


# ==========================================
# ENDPOINTS - SECTOR MANAGEMENT
# ==========================================

@router.get("/sector/{sector}", response_model=List[AppointmentResponse])
async def get_sector_appointments(
    sector: str,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni appuntamenti per un settore"""
    
    # Valida settore
    try:
        target_sector = Sector(sector.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Settore non valido: {sector}")
    
    # Verifica permessi
    if current_user.sector != Sector.ADMIN:
        if current_user.sector.value != target_sector.value:
            raise HTTPException(status_code=403, detail="Puoi visualizzare solo appuntamenti del tuo settore")
    
    # Query
    query = select(Appointment).where(
        Appointment.target_sector == target_sector.value
    )
    
    if status:
        try:
            status_enum = AppointmentStatus(status.lower())
            query = query.where(Appointment.status == status_enum.value)
        except ValueError:
            pass
    
    query = query.order_by(desc(Appointment.created_at))
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    return [_appointment_to_response(a) for a in appointments]


@router.put("/{appointment_id}/handle", response_model=AppointmentResponse)
async def handle_appointment(
    appointment_id: int,
    data: HandleAppointmentRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Gestisci un appuntamento (accetta, rifiuta, completa)"""
    
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appuntamento non trovato")
    
    # Verifica permessi
    if current_user.sector != Sector.ADMIN:
        if current_user.sector.value != appointment.target_sector:
            raise HTTPException(status_code=403, detail="Puoi gestire solo appuntamenti del tuo settore")
        if current_user.hierarchy_level < 3:
            raise HTTPException(status_code=403, detail="Non hai i permessi per gestire appuntamenti")
    
    # Valida status
    try:
        new_status = AppointmentStatus(data.status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Stato non valido: {data.status}")
    
    # Determina azione audit
    if new_status == AppointmentStatus.ACCEPTED:
        audit_action = AuditAction.APPOINTMENT_ACCEPT
    elif new_status == AppointmentStatus.REJECTED:
        audit_action = AuditAction.APPOINTMENT_REJECT
    elif new_status == AppointmentStatus.COMPLETED:
        audit_action = AuditAction.APPOINTMENT_COMPLETE
    else:
        audit_action = AuditAction.APPOINTMENT_CANCEL
    
    # Parse data schedulata
    scheduled_date = None
    if data.scheduled_date:
        try:
            scheduled_date = datetime.fromisoformat(data.scheduled_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    
    # Aggiorna appuntamento
    appointment.status = new_status.value
    appointment.handler_id = current_user.id
    appointment.handler_game_name = current_user.game_name
    appointment.handler_notes = data.notes
    if scheduled_date:
        appointment.scheduled_date = scheduled_date
    appointment.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(appointment)
    
    # Audit log
    await audit_service.log(
        db,
        action=audit_action,
        user=current_user,
        entity_type="appointment",
        entity_id=appointment.id,
        description=f"Appuntamento {new_status.value}: {appointment.subject}",
        request=request
    )
    
    return _appointment_to_response(appointment)


@router.get("/calendar/{sector}")
async def get_sector_calendar(
    sector: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Calendario appuntamenti accettati per un settore"""
    
    # Valida settore
    try:
        target_sector = Sector(sector.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Settore non valido: {sector}")
    
    # Verifica permessi
    if current_user.sector != Sector.ADMIN:
        if current_user.sector != target_sector:
            raise HTTPException(status_code=403, detail="Puoi visualizzare solo il calendario del tuo settore")
    
    # Query appuntamenti accettati con data schedulata
    result = await db.execute(
        select(Appointment)
        .where(Appointment.target_sector == target_sector.value)
        .where(Appointment.status == AppointmentStatus.ACCEPTED.value)
        .where(Appointment.scheduled_date != None)
        .order_by(Appointment.scheduled_date)
    )
    appointments = result.scalars().all()
    
    return [_appointment_to_response(a) for a in appointments]


@router.get("/stats")
async def get_appointment_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche appuntamenti"""
    
    # Admin vede tutto, altri solo il proprio settore
    if current_user.sector == Sector.ADMIN:
        base_query = select(Appointment)
    else:
        base_query = select(Appointment).where(
            Appointment.target_sector == current_user.sector.value
        )
    
    # Conta per stato
    pending = await db.execute(
        base_query.where(Appointment.status == AppointmentStatus.PENDING.value)
    )
    accepted = await db.execute(
        base_query.where(Appointment.status == AppointmentStatus.ACCEPTED.value)
    )
    completed = await db.execute(
        base_query.where(Appointment.status == AppointmentStatus.COMPLETED.value)
    )
    rejected = await db.execute(
        base_query.where(Appointment.status == AppointmentStatus.REJECTED.value)
    )
    
    return {
        "pending": len(pending.scalars().all()),
        "accepted": len(accepted.scalars().all()),
        "completed": len(completed.scalars().all()),
        "rejected": len(rejected.scalars().all())
    }


# ==========================================
# HELPERS
# ==========================================

def _appointment_to_response(apt: Appointment) -> AppointmentResponse:
    return AppointmentResponse(
        id=apt.id,
        target_sector=apt.target_sector,
        requester_id=apt.requester_id,
        requester_game_name=apt.requester_game_name,
        requester_sector=apt.requester_sector,
        subject=apt.subject,
        description=apt.description,
        preferred_date=apt.preferred_date.isoformat() if apt.preferred_date else None,
        preferred_time=apt.preferred_time,
        urgency=apt.urgency,
        status=apt.status,
        handler_id=apt.handler_id,
        handler_game_name=apt.handler_game_name,
        handler_notes=apt.handler_notes,
        scheduled_date=apt.scheduled_date.isoformat() if apt.scheduled_date else None,
        created_at=apt.created_at.isoformat() if apt.created_at else "",
        updated_at=apt.updated_at.isoformat() if apt.updated_at else ""
    )
