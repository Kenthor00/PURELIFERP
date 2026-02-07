"""
PURE LIFE OS - Governo & Giustizia Router
Tribunale, Avvocati, Udienze
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List
from datetime import datetime, timezone
import random
import string

from database import get_db
from models import User, LegalCase, LegalCaseStatus, CourtHearing, HearingStatus, TimelineEvent
from schemas import (
    LegalCaseCreate, LegalCaseUpdate, LegalCaseResponse,
    CourtHearingCreate, CourtHearingUpdate, CourtHearingResponse,
    MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from sse_manager import sse_manager

router = APIRouter(prefix="/justice", tags=["Governo & Giustizia"])


def generate_legal_case_number():
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"LEG-{date_str}-{random_str}"


def generate_hearing_number():
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"UDI-{date_str}-{random_str}"


# ==========================================
# LEGAL CASES
# ==========================================

@router.get("/cases", response_model=List[LegalCaseResponse])
async def get_legal_cases(
    status: Optional[LegalCaseStatus] = None,
    my_cases: bool = False,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Lista pratiche legali"""
    query = select(LegalCase).order_by(desc(LegalCase.updated_at))
    
    if status:
        query = query.where(LegalCase.status == status)
    
    if my_cases:
        if current_user.role == UserRole.LAWYER:
            query = query.where(LegalCase.lawyer_id == current_user.id)
        elif current_user.role == UserRole.PROSECUTOR:
            query = query.where(LegalCase.prosecutor_id == current_user.id)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/cases/{case_id}", response_model=LegalCaseResponse)
async def get_legal_case(
    case_id: int,
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio pratica legale"""
    result = await db.execute(select(LegalCase).where(LegalCase.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    return case


@router.post("/cases", response_model=LegalCaseResponse)
async def create_legal_case(
    request: LegalCaseCreate,
    current_user: User = Depends(require_roles(UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.JUDGE, UserRole.GOVERNMENT, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Crea pratica legale"""
    case_data = request.model_dump(exclude_none=True)
    
    case = LegalCase(
        case_number=generate_legal_case_number(),
        title=case_data.get('title'),
        police_case_id=case_data.get('police_case_id'),
        plaintiff_name=case_data.get('plaintiff_name'),
        defendant_name=case_data.get('defendant_name'),
        client_name=case_data.get('client_name') or case_data.get('plaintiff_name'),
        client_identifier=case_data.get('client_identifier'),
        case_type=case_data.get('case_type'),
        description=case_data.get('description'),
        status=LegalCaseStatus.DRAFT
    )
    
    if hasattr(current_user, 'role'):
        if current_user.role == UserRole.LAWYER:
            case.lawyer_id = current_user.id
        elif current_user.role == UserRole.PROSECUTOR:
            case.prosecutor_id = current_user.id
    
    db.add(case)
    await db.commit()
    await db.refresh(case)
    
    case_title = case.title or case.client_name or "N/A"
    
    timeline_event = TimelineEvent(
        event_type="legal_case_created",
        category="justice",
        title=f"Pratica aperta: {case.case_number}",
        description=f"Titolo: {case_title}",
        entity_id=case.id,
        entity_type="legal_case",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    return case


@router.put("/cases/{case_id}", response_model=LegalCaseResponse)
async def update_legal_case(
    case_id: int,
    request: LegalCaseUpdate,
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna pratica legale"""
    result = await db.execute(select(LegalCase).where(LegalCase.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    update_data = request.model_dump(exclude_unset=True)
    old_status = case.status
    
    for field, value in update_data.items():
        setattr(case, field, value)
    
    await db.commit()
    await db.refresh(case)
    
    if "status" in update_data and case.status != old_status:
        timeline_event = TimelineEvent(
            event_type="legal_case_status_changed",
            category="justice",
            title=f"Stato pratica: {case.status.value}",
            entity_id=case.id,
            entity_type="legal_case",
            user_id=current_user.id,
            extra_data={"old_status": old_status.value, "new_status": case.status.value}
        )
        db.add(timeline_event)
        await db.commit()
    
    return case


@router.post("/cases/{case_id}/submit", response_model=LegalCaseResponse)
async def submit_legal_case(
    case_id: int,
    current_user: User = Depends(require_roles(UserRole.LAWYER, UserRole.PROSECUTOR)),
    db: AsyncSession = Depends(get_db)
):
    """Sottometti pratica per revisione"""
    result = await db.execute(select(LegalCase).where(LegalCase.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Pratica non trovata")
    
    if case.status != LegalCaseStatus.DRAFT:
        raise HTTPException(status_code=400, detail="La pratica non è in stato bozza")
    
    case.status = LegalCaseStatus.SUBMITTED
    
    timeline_event = TimelineEvent(
        event_type="legal_case_submitted",
        category="justice",
        title=f"Pratica sottomessa: {case.case_number}",
        entity_id=case.id,
        entity_type="legal_case",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    await db.refresh(case)
    
    await sse_manager.broadcast("legal_case_submitted", {
        "case_id": case.id,
        "case_number": case.case_number
    }, roles={"judge", "government", "admin"})
    
    return case


# ==========================================
# COURT HEARINGS
# ==========================================

@router.get("/hearings", response_model=List[CourtHearingResponse])
async def get_hearings(
    status: Optional[HearingStatus] = None,
    upcoming_only: bool = True,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Lista udienze"""
    query = select(CourtHearing).order_by(CourtHearing.scheduled_date)
    
    if status:
        query = query.where(CourtHearing.status == status)
    
    if upcoming_only:
        now = datetime.now(timezone.utc)
        query = query.where(CourtHearing.scheduled_date >= now)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.get("/hearings/calendar")
async def get_hearings_calendar(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2024),
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Calendario udienze per mese"""
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    result = await db.execute(
        select(CourtHearing)
        .where(
            CourtHearing.scheduled_date >= start_date,
            CourtHearing.scheduled_date < end_date
        )
        .order_by(CourtHearing.scheduled_date)
    )
    
    hearings = result.scalars().all()
    
    calendar_data = {}
    for h in hearings:
        day = h.scheduled_date.day
        if day not in calendar_data:
            calendar_data[day] = []
        calendar_data[day].append({
            "id": h.id,
            "hearing_number": h.hearing_number,
            "title": h.title,
            "time": h.scheduled_date.strftime("%H:%M"),
            "courtroom": h.courtroom,
            "status": h.status.value
        })
    
    return {"month": month, "year": year, "calendar": calendar_data}


@router.get("/hearings/{hearing_id}", response_model=CourtHearingResponse)
async def get_hearing(
    hearing_id: int,
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio udienza"""
    result = await db.execute(select(CourtHearing).where(CourtHearing.id == hearing_id))
    hearing = result.scalar_one_or_none()
    
    if not hearing:
        raise HTTPException(status_code=404, detail="Udienza non trovata")
    
    return hearing


@router.post("/hearings", response_model=CourtHearingResponse)
async def create_hearing(
    request: CourtHearingCreate,
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Crea udienza (giudice/governo)"""
    hearing = CourtHearing(
        hearing_number=generate_hearing_number(),
        **request.model_dump(),
        status=HearingStatus.SCHEDULED
    )
    
    if current_user.role == UserRole.JUDGE:
        hearing.judge_id = current_user.id
    
    db.add(hearing)
    await db.commit()
    await db.refresh(hearing)
    
    timeline_event = TimelineEvent(
        event_type="hearing_scheduled",
        category="justice",
        title=f"Udienza programmata: {hearing.title}",
        description=f"Data: {hearing.scheduled_date.strftime('%d/%m/%Y %H:%M')}",
        entity_id=hearing.id,
        entity_type="hearing",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    await sse_manager.broadcast("hearing_scheduled", {
        "hearing_id": hearing.id,
        "hearing_number": hearing.hearing_number,
        "title": hearing.title,
        "scheduled_date": hearing.scheduled_date.isoformat()
    }, roles={"judge", "lawyer", "prosecutor", "government", "admin"})
    
    return hearing


@router.put("/hearings/{hearing_id}", response_model=CourtHearingResponse)
async def update_hearing(
    hearing_id: int,
    request: CourtHearingUpdate,
    current_user: User = Depends(require_roles(UserRole.JUDGE)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna udienza (giudice)"""
    result = await db.execute(select(CourtHearing).where(CourtHearing.id == hearing_id))
    hearing = result.scalar_one_or_none()
    
    if not hearing:
        raise HTTPException(status_code=404, detail="Udienza non trovata")
    
    update_data = request.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(hearing, field, value)
    
    if "verdict" in update_data and update_data["verdict"]:
        hearing.verdict_date = datetime.now(timezone.utc)
        hearing.status = HearingStatus.COMPLETED
        
        timeline_event = TimelineEvent(
            event_type="verdict_issued",
            category="justice",
            title=f"Verdetto emesso: {hearing.hearing_number}",
            entity_id=hearing.id,
            entity_type="hearing",
            user_id=current_user.id
        )
        db.add(timeline_event)
    
    await db.commit()
    await db.refresh(hearing)
    
    return hearing


# ==========================================
# LEGAL DOCUMENTS (TODO: Add LegalDocument model)
# ==========================================

# Endpoints for LegalDocument disabled until model is added


# ==========================================
# STATS
# ==========================================

@router.get("/stats")
async def get_justice_stats(
    current_user: User = Depends(require_roles(UserRole.JUDGE, UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.GOVERNMENT)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche giustizia"""
    pending_cases = await db.execute(
        select(func.count(LegalCase.id))
        .where(LegalCase.status.in_([LegalCaseStatus.SUBMITTED, LegalCaseStatus.REVIEW]))
    )
    
    scheduled_hearings = await db.execute(
        select(func.count(CourtHearing.id))
        .where(CourtHearing.status == HearingStatus.SCHEDULED)
    )
    
    completed_today = await db.execute(
        select(func.count(CourtHearing.id))
        .where(
            CourtHearing.status == HearingStatus.COMPLETED,
            func.date(CourtHearing.verdict_date) == func.current_date()
        )
    )
    
    return {
        "pratiche_in_attesa": pending_cases.scalar() or 0,
        "udienze_programmate": scheduled_hearings.scalar() or 0,
        "verdetti_oggi": completed_today.scalar() or 0
    }
