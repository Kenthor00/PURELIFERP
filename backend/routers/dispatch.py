"""
PURE LIFE OS - Dispatch Router
Chiamate, Unità, Gestione emergenze
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List

from database import get_db
from models import User, DispatchCall, CallPriority, CallStatus, TimelineEvent
from schemas import (
    DispatchCallCreate, DispatchCallUpdate, DispatchCallResponse,
    TimelineEventResponse, MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from utils import generate_call_number
from sse_manager import sse_manager

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])


# ==========================================
# CHIAMATE
# ==========================================

@router.get("/calls", response_model=List[DispatchCallResponse])
async def get_calls(
    status: Optional[CallStatus] = None,
    priority: Optional[CallPriority] = None,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.DISPATCH, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Lista chiamate con filtri"""
    query = select(DispatchCall).order_by(
        DispatchCall.priority,
        desc(DispatchCall.created_at)
    )
    
    if status:
        query = query.where(DispatchCall.status == status)
    
    if priority:
        query = query.where(DispatchCall.priority == priority)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/calls/active", response_model=List[DispatchCallResponse])
async def get_active_calls(
    current_user: User = Depends(require_roles(UserRole.DISPATCH, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Lista chiamate attive (non completate/cancellate)"""
    query = select(DispatchCall).where(
        DispatchCall.status.in_([
            CallStatus.PENDING,
            CallStatus.ASSIGNED,
            CallStatus.IN_PROGRESS
        ])
    ).order_by(
        DispatchCall.priority,
        desc(DispatchCall.created_at)
    )
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/calls/{call_id}", response_model=DispatchCallResponse)
async def get_call(
    call_id: int,
    current_user: User = Depends(require_roles(UserRole.DISPATCH, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio chiamata"""
    result = await db.execute(select(DispatchCall).where(DispatchCall.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Chiamata non trovata")
    
    return call


@router.post("/calls", response_model=DispatchCallResponse)
async def create_call(
    request: DispatchCallCreate,
    current_user: User = Depends(require_roles(UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Crea nuova chiamata"""
    call = DispatchCall(
        call_number=generate_call_number(),
        priority=request.priority,
        call_type=request.call_type,
        location=request.location,
        description=request.description,
        caller_name=request.caller_name,
        caller_phone=request.caller_phone,
        dispatcher_id=current_user.id,
        status=CallStatus.PENDING
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    timeline_event = TimelineEvent(
        event_type="call_created",
        category="dispatch",
        title=f"Chiamata {call.priority.value}: {call.call_type}",
        description=f"Posizione: {call.location}",
        entity_id=call.id,
        entity_type="call",
        user_id=current_user.id,
        metadata_json={"priority": call.priority.value}
    )
    db.add(timeline_event)
    await db.commit()
    
    target_roles = {"dispatch", "admin"}
    if call.call_type.lower() in ["rapina", "sparatoria", "inseguimento", "arresto"]:
        target_roles.add("police")
    if call.call_type.lower() in ["emergenza medica", "incidente", "ferito"]:
        target_roles.add("ems")
    
    await sse_manager.broadcast("call_created", {
        "call_id": call.id,
        "call_number": call.call_number,
        "priority": call.priority.value,
        "call_type": call.call_type,
        "location": call.location
    }, roles=target_roles)
    
    return call


@router.put("/calls/{call_id}", response_model=DispatchCallResponse)
async def update_call(
    call_id: int,
    request: DispatchCallUpdate,
    current_user: User = Depends(require_roles(UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna chiamata"""
    result = await db.execute(select(DispatchCall).where(DispatchCall.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Chiamata non trovata")
    
    update_data = request.model_dump(exclude_unset=True)
    old_status = call.status
    
    for field, value in update_data.items():
        setattr(call, field, value)
    
    await db.commit()
    await db.refresh(call)
    
    if "status" in update_data and update_data["status"] != old_status:
        timeline_event = TimelineEvent(
            event_type="call_status_changed",
            category="dispatch",
            title=f"Stato chiamata: {call.status.value}",
            description=f"Aggiornato da {current_user.game_name or current_user.email}",
            entity_id=call.id,
            entity_type="call",
            user_id=current_user.id,
            metadata_json={"old_status": old_status.value, "new_status": call.status.value}
        )
        db.add(timeline_event)
        await db.commit()
        
        await sse_manager.broadcast("call_updated", {
            "call_id": call.id,
            "call_number": call.call_number,
            "status": call.status.value,
            "assigned_units": call.assigned_units
        })
    
    return call


@router.put("/calls/{call_id}/assign", response_model=DispatchCallResponse)
async def assign_units(
    call_id: int,
    units: List[str],
    current_user: User = Depends(require_roles(UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Assegna unità a chiamata"""
    result = await db.execute(select(DispatchCall).where(DispatchCall.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Chiamata non trovata")
    
    call.assigned_units = units
    call.status = CallStatus.ASSIGNED
    
    await db.commit()
    await db.refresh(call)
    
    timeline_event = TimelineEvent(
        event_type="units_assigned",
        category="dispatch",
        title=f"Unità assegnate: {', '.join(units)}",
        entity_id=call.id,
        entity_type="call",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    await sse_manager.broadcast("units_assigned", {
        "call_id": call.id,
        "call_number": call.call_number,
        "units": units
    })
    
    return call


@router.put("/calls/{call_id}/complete", response_model=MessageResponse)
async def complete_call(
    call_id: int,
    current_user: User = Depends(require_roles(UserRole.DISPATCH, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Completa chiamata"""
    result = await db.execute(select(DispatchCall).where(DispatchCall.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Chiamata non trovata")
    
    call.status = CallStatus.COMPLETED
    
    timeline_event = TimelineEvent(
        event_type="call_completed",
        category="dispatch",
        title=f"Chiamata completata: {call.call_number}",
        entity_id=call.id,
        entity_type="call",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    await sse_manager.broadcast("call_completed", {
        "call_id": call.id,
        "call_number": call.call_number
    })
    
    return MessageResponse(message="Chiamata completata con successo")


# ==========================================
# DASHBOARD STATS
# ==========================================

@router.get("/stats")
async def get_dispatch_stats(
    current_user: User = Depends(require_roles(UserRole.DISPATCH, UserRole.POLICE, UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche dashboard Dispatch"""
    pending_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(DispatchCall.status == CallStatus.PENDING)
    )
    
    active_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(DispatchCall.status.in_([CallStatus.ASSIGNED, CallStatus.IN_PROGRESS]))
    )
    
    p1_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(
            DispatchCall.priority == CallPriority.P1,
            DispatchCall.status.in_([CallStatus.PENDING, CallStatus.ASSIGNED, CallStatus.IN_PROGRESS])
        )
    )
    
    today_completed = await db.execute(
        select(func.count(DispatchCall.id))
        .where(
            DispatchCall.status == CallStatus.COMPLETED,
            func.date(DispatchCall.updated_at) == func.current_date()
        )
    )
    
    return {
        "chiamate_in_attesa": pending_calls.scalar() or 0,
        "chiamate_attive": active_calls.scalar() or 0,
        "chiamate_p1": p1_calls.scalar() or 0,
        "completate_oggi": today_completed.scalar() or 0
    }
