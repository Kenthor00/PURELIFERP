"""
PURE LIFE OS - Dispatch Router
Chiamate, Unità, Gestione emergenze
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List

from database import get_db
from models import User, DispatchCall, TimelineEvent
from schemas import (
    DispatchCallCreate, DispatchCallUpdate, DispatchCallResponse,
    TimelineEventResponse, MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from utils import generate_call_number
from sse_manager import sse_manager
from cache import ModuleCache

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])


# ==========================================
# CHIAMATE
# ==========================================

@router.get("/calls", response_model=List[DispatchCallResponse])
async def get_calls(
    status: Optional[str] = None,
    priority: Optional[str] = None,
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
        DispatchCall.status.in_(["pending", "assigned", "in_progress"])
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
        created_by=current_user.id,
        status="pending"
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    timeline_event = TimelineEvent(
        event_type="call_created",
        category="dispatch",
        title=f"Chiamata {call.priority}: {call.call_type}",
        description=f"Posizione: {call.location}",
        entity_id=call.id,
        entity_type="call",
        user_id=current_user.id,
        extra_data={"priority": call.priority}
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
        "priority": call.priority,
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
            title=f"Stato chiamata: {call.status}",
            description=f"Aggiornato da {current_user.game_name or current_user.email}",
            entity_id=call.id,
            entity_type="call",
            user_id=current_user.id,
            extra_data={"old_status": old_status, "new_status": call.status}
        )
        db.add(timeline_event)
        await db.commit()
        
        await sse_manager.broadcast("call_updated", {
            "call_id": call.id,
            "call_number": call.call_number,
            "status": call.status,
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
    call.status = "assigned"
    
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
    
    call.status = "completed"
    
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
    """Statistiche dashboard Dispatch - CACHED 15s (più frequente per emergenze)"""
    # Check cache first (TTL più breve per dispatch)
    cached_stats = await ModuleCache.get_stats("dispatch")
    if cached_stats:
        return cached_stats
    
    pending_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(DispatchCall.status == "pending")
    )
    
    active_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(DispatchCall.status.in_(["assigned", "in_progress"]))
    )
    
    p1_calls = await db.execute(
        select(func.count(DispatchCall.id))
        .where(
            DispatchCall.priority == "P1",
            DispatchCall.status.in_(["pending", "assigned", "in_progress"])
        )
    )
    
    today_completed = await db.execute(
        select(func.count(DispatchCall.id))
        .where(
            DispatchCall.status == "completed",
            func.date(DispatchCall.updated_at) == func.current_date()
        )
    )
    
    stats = {
        "chiamate_in_attesa": pending_calls.scalar() or 0,
        "chiamate_attive": active_calls.scalar() or 0,
        "chiamate_p1": p1_calls.scalar() or 0,
        "completate_oggi": today_completed.scalar() or 0
    }
    
    # Cache for 15 seconds (dispatch needs fresher data)
    await ModuleCache.set_stats("dispatch", stats, ttl=15)
    
    return stats


@router.get("/zones/activity")
async def get_zone_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restituisce l'attività per zona basata su chiamate dispatch e casi LSPD.
    Le zone sono predefinite (mappa GTA).
    """
    from datetime import datetime, timedelta
    from sqlalchemy import or_, and_
    from models import Case
    
    # Zone predefinite della mappa
    zones = {
        'vinewood': {'name': 'Vinewood', 'level': 0, 'incidents': 0},
        'downtown': {'name': 'Downtown', 'level': 0, 'incidents': 0},
        'pillbox': {'name': 'Pillbox Hill', 'level': 0, 'incidents': 0},
        'vespucci': {'name': 'Vespucci', 'level': 0, 'incidents': 0},
        'la_mesa': {'name': 'La Mesa', 'level': 0, 'incidents': 0},
        'sandy': {'name': 'Sandy Shores', 'level': 0, 'incidents': 0},
        'paleto': {'name': 'Paleto Bay', 'level': 0, 'incidents': 0},
        'grapeseed': {'name': 'Grapeseed', 'level': 0, 'incidents': 0},
        'del_perro': {'name': 'Del Perro', 'level': 0, 'incidents': 0},
        'rockford': {'name': 'Rockford Hills', 'level': 0, 'incidents': 0},
    }
    
    # Ottieni chiamate attive delle ultime 24 ore
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    # Chiamate Dispatch attive
    calls_result = await db.execute(
        select(DispatchCall).where(
            or_(
                DispatchCall.status.in_(["pending", "assigned", "in_progress"]),
                and_(
                    DispatchCall.status == "completed",
                    DispatchCall.created_at >= yesterday
                )
            )
        )
    )
    calls = calls_result.scalars().all()
    
    # Casi LSPD aperti
    cases_result = await db.execute(
        select(Case).where(Case.status.in_(['open', 'investigating']))
    )
    cases = cases_result.scalars().all()
    
    # Analizza location delle chiamate e casi per calcolare attività per zona
    for call in calls:
        if call.location:
            location_lower = call.location.lower()
            for zone_id, zone_data in zones.items():
                if zone_id.replace('_', ' ') in location_lower or zone_data['name'].lower() in location_lower:
                    zones[zone_id]['incidents'] += 1
                    # P1 = +40, P2 = +20, P3 = +10
                    if call.priority == "P1":
                        zones[zone_id]['level'] += 40
                    elif call.priority == "P2":
                        zones[zone_id]['level'] += 20
                    else:
                        zones[zone_id]['level'] += 10
    
    for case in cases:
        if case.location:
            location_lower = case.location.lower()
            for zone_id, zone_data in zones.items():
                if zone_id.replace('_', ' ') in location_lower or zone_data['name'].lower() in location_lower:
                    zones[zone_id]['incidents'] += 1
                    zones[zone_id]['level'] += 15  # Caso aperto = +15
    
    # Normalizza i livelli a 0-100
    for zone_id in zones:
        zones[zone_id]['level'] = min(100, zones[zone_id]['level'])
        zones[zone_id]['type'] = (
            'critica' if zones[zone_id]['level'] > 70 else
            'elevata' if zones[zone_id]['level'] > 40 else
            'normale'
        )
    
    return zones
