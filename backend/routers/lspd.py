"""
PURE LIFE OS - LSPD Router
Casi, Mandati, Multe, Evidence
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import User, Case, CaseStatus, Warrant, WarrantStatus, Fine, Evidence, TimelineEvent, Outbox, OutboxStatus, AuditAction
from schemas import (
    CaseCreate, CaseUpdate, CaseResponse, CaseDetailResponse,
    WarrantCreate, WarrantResponse, FineCreate, FineResponse,
    EvidenceCreate, EvidenceResponse, TimelineEventResponse, MessageResponse
)
from auth import get_current_user, require_roles, UserRole, log_audit
from utils import generate_case_number, generate_warrant_number, generate_fine_number
from sse_manager import sse_manager
from cache import cache, ModuleCache

router = APIRouter(prefix="/lspd", tags=["LSPD"])


# ==========================================
# CASI
# ==========================================

@router.get("/cases", response_model=List[CaseResponse])
async def get_cases(
    status: Optional[CaseStatus] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    current_user: User = Depends(require_roles(UserRole.POLICE, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Lista casi con filtri"""
    query = select(Case).order_by(desc(Case.created_at))
    
    if status:
        query = query.where(Case.status == status)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Case.title.ilike(search_filter)) |
            (Case.case_number.ilike(search_filter)) |
            (Case.suspect_name.ilike(search_filter))
        )
    
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/cases/{case_id}", response_model=CaseDetailResponse)
async def get_case(
    case_id: int,
    current_user: User = Depends(require_roles(UserRole.POLICE, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio caso con timeline"""
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Caso non trovato")
    
    warrants_result = await db.execute(select(Warrant).where(Warrant.case_id == case_id))
    fines_result = await db.execute(select(Fine).where(Fine.case_id == case_id))
    evidence_result = await db.execute(select(Evidence).where(Evidence.case_id == case_id))
    timeline_result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.entity_type == "case", TimelineEvent.entity_id == case_id)
        .order_by(desc(TimelineEvent.created_at))
    )
    
    return CaseDetailResponse(
        **{k: v for k, v in case.__dict__.items() if not k.startswith('_')},
        warrants=[WarrantResponse(**{k: v for k, v in w.__dict__.items() if not k.startswith('_')}) for w in warrants_result.scalars().all()],
        fines=[FineResponse(**{k: v for k, v in f.__dict__.items() if not k.startswith('_')}) for f in fines_result.scalars().all()],
        evidence=[EvidenceResponse(**{k: v for k, v in e.__dict__.items() if not k.startswith('_')}) for e in evidence_result.scalars().all()],
        timeline=[TimelineEventResponse(**{k: v for k, v in t.__dict__.items() if not k.startswith('_')}) for t in timeline_result.scalars().all()]
    )


@router.post("/cases", response_model=CaseResponse)
async def create_case(
    request: CaseCreate,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Crea nuovo caso"""
    case = Case(
        case_number=generate_case_number(),
        title=request.title,
        description=request.description,
        priority=request.priority,
        suspect_name=request.suspect_name,
        suspect_identifier=request.suspect_identifier,
        location=request.location,
        officer_id=current_user.id,
        status=CaseStatus.OPEN
    )
    
    db.add(case)
    await db.commit()
    await db.refresh(case)
    
    timeline_event = TimelineEvent(
        event_type="case_created",
        category="lspd",
        title=f"Caso aperto: {case.title}",
        description=f"Nuovo caso creato da {current_user.game_name or current_user.email}",
        entity_id=case.id,
        entity_type="case",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    # Audit log
    await log_audit(
        db, AuditAction.CASE_CREATE,
        user=current_user,
        entity_type="case",
        entity_id=case.id,
        description=f"Creato caso: {case.case_number} - {case.title}",
        metadata={"case_number": case.case_number, "priority": case.priority}
    )
    
    # Invalidate stats cache
    await ModuleCache.invalidate_stats("lspd")
    
    await sse_manager.broadcast("case_created", {
        "case_id": case.id,
        "case_number": case.case_number,
        "title": case.title
    }, roles={"police", "dispatch", "admin"})
    
    return case


@router.put("/cases/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: int,
    request: CaseUpdate,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna caso"""
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Caso non trovato")
    
    update_data = request.model_dump(exclude_unset=True)
    old_status = case.status
    
    for field, value in update_data.items():
        setattr(case, field, value)
    
    await db.commit()
    await db.refresh(case)
    
    if "status" in update_data and update_data["status"] != old_status:
        timeline_event = TimelineEvent(
            event_type="case_status_changed",
            category="lspd",
            title=f"Stato caso aggiornato: {case.status.value}",
            description=f"Aggiornato da {current_user.game_name or current_user.email}",
            entity_id=case.id,
            entity_type="case",
            user_id=current_user.id,
            extra_data={"old_status": old_status.value, "new_status": case.status.value}
        )
        db.add(timeline_event)
        await db.commit()
    
    return case


# ==========================================
# MANDATI
# ==========================================

@router.get("/warrants", response_model=List[WarrantResponse])
async def get_warrants(
    active_only: bool = True,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.POLICE, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Lista mandati"""
    query = select(Warrant).order_by(desc(Warrant.created_at))
    
    if active_only:
        query = query.where(Warrant.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Warrant.suspect_name.ilike(search_filter)) |
            (Warrant.warrant_number.ilike(search_filter))
        )
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.post("/warrants", response_model=WarrantResponse)
async def create_warrant(
    request: WarrantCreate,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Emetti mandato"""
    warrant = Warrant(
        warrant_number=generate_warrant_number(),
        case_id=request.case_id,
        suspect_name=request.suspect_name,
        suspect_identifier=request.suspect_identifier,
        reason=request.reason,
        issued_by=current_user.id,
        expires_at=request.expires_at
    )
    
    db.add(warrant)
    await db.commit()
    await db.refresh(warrant)
    
    timeline_event = TimelineEvent(
        event_type="warrant_issued",
        category="lspd",
        title=f"Mandato emesso: {warrant.reason}",
        description=f"Soggetto: {warrant.suspect_name}",
        entity_id=warrant.id,
        entity_type="warrant",
        user_id=current_user.id
    )
    db.add(timeline_event)
    
    if request.case_id:
        case_timeline = TimelineEvent(
            event_type="warrant_linked",
            category="lspd",
            title=f"Mandato collegato: {warrant.warrant_number}",
            entity_id=request.case_id,
            entity_type="case",
            user_id=current_user.id
        )
        db.add(case_timeline)
    
    await db.commit()
    
    await sse_manager.broadcast("warrant_issued", {
        "warrant_id": warrant.id,
        "warrant_number": warrant.warrant_number,
        "subject_name": warrant.suspect_name
    }, roles={"police", "dispatch", "admin"})
    
    return warrant


@router.put("/warrants/{warrant_id}/revoke", response_model=MessageResponse)
async def revoke_warrant(
    warrant_id: int,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Revoca mandato (legacy - usa /status per il nuovo sistema)"""
    result = await db.execute(select(Warrant).where(Warrant.id == warrant_id))
    warrant = result.scalar_one_or_none()
    
    if not warrant:
        raise HTTPException(status_code=404, detail="Mandato non trovato")
    
    warrant.is_active = False
    warrant.status = WarrantStatus.CANCELLED
    warrant.cancelled_at = datetime.now(timezone.utc)
    warrant.cancelled_by = current_user.id
    await db.commit()
    
    return MessageResponse(message="Mandato revocato con successo")


@router.patch("/warrants/{warrant_id}/status", response_model=WarrantResponse)
async def update_warrant_status(
    warrant_id: int,
    new_status: str,
    reason: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Aggiorna lo stato di un mandato con validazione delle transizioni.
    
    Transizioni valide:
    - OPEN -> EXECUTED (mandato eseguito)
    - OPEN -> EXPIRED (mandato scaduto)
    - OPEN -> CANCELLED (mandato revocato)
    - Non è possibile tornare a OPEN una volta cambiato
    """
    from models import WarrantStatus
    
    result = await db.execute(select(Warrant).where(Warrant.id == warrant_id))
    warrant = result.scalar_one_or_none()
    
    if not warrant:
        raise HTTPException(status_code=404, detail="Mandato non trovato")
    
    # Valida nuovo status
    try:
        target_status = WarrantStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Stato non valido. Stati ammessi: {[s.value for s in WarrantStatus]}"
        )
    
    # Ottieni stato corrente (se non presente, assume OPEN se is_active)
    current_status = warrant.status or (WarrantStatus.OPEN if warrant.is_active else WarrantStatus.CANCELLED)
    
    # Valida transizione
    valid_transitions = {
        WarrantStatus.OPEN: [WarrantStatus.EXECUTED, WarrantStatus.EXPIRED, WarrantStatus.CANCELLED],
        WarrantStatus.EXECUTED: [],  # Stato finale
        WarrantStatus.EXPIRED: [],   # Stato finale
        WarrantStatus.CANCELLED: [], # Stato finale
    }
    
    if target_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Transizione non valida: {current_status.value} -> {target_status.value}"
        )
    
    # Applica transizione
    warrant.status = target_status
    
    if target_status == WarrantStatus.EXECUTED:
        warrant.executed = True
        warrant.executed_at = datetime.now(timezone.utc)
        warrant.executed_by = current_user.id
        warrant.is_active = False
    elif target_status == WarrantStatus.CANCELLED:
        warrant.is_active = False
        warrant.cancelled_at = datetime.now(timezone.utc)
        warrant.cancelled_by = current_user.id
        warrant.cancellation_reason = reason
    elif target_status == WarrantStatus.EXPIRED:
        warrant.is_active = False
    
    # Timeline event
    status_labels = {
        WarrantStatus.EXECUTED: "Eseguito",
        WarrantStatus.EXPIRED: "Scaduto",
        WarrantStatus.CANCELLED: "Revocato"
    }
    
    timeline_event = TimelineEvent(
        event_type="warrant_status_changed",
        category="lspd",
        title=f"Mandato {status_labels.get(target_status, target_status.value)}: {warrant.warrant_number}",
        description=f"Da {current_user.game_name or current_user.email}. {reason or ''}".strip(),
        entity_id=warrant.id,
        entity_type="warrant",
        user_id=current_user.id,
        extra_data={"old_status": current_status.value, "new_status": target_status.value, "reason": reason}
    )
    db.add(timeline_event)
    
    await db.commit()
    await db.refresh(warrant)
    
    await sse_manager.broadcast("warrant_status_changed", {
        "warrant_id": warrant.id,
        "warrant_number": warrant.warrant_number,
        "old_status": current_status.value,
        "new_status": target_status.value
    }, roles={"police", "dispatch", "admin"})
    
    return warrant


# ==========================================
# MULTE
# ==========================================

@router.get("/fines", response_model=List[FineResponse])
async def get_fines(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.POLICE, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Lista multe - senza filtro pagata/non pagata"""
    query = select(Fine).order_by(desc(Fine.created_at))
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Fine.citizen_name.ilike(search_filter)) |
            (Fine.fine_number.ilike(search_filter))
        )
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.post("/fines", response_model=FineResponse)
async def create_fine(
    request: FineCreate,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Emetti multa"""
    fine = Fine(
        fine_number=generate_fine_number(),
        case_id=request.case_id,
        citizen_name=request.citizen_name,
        citizen_identifier=request.citizen_identifier,
        amount=request.amount,
        reason=request.reason,
        issued_by=current_user.id
    )
    
    db.add(fine)
    await db.commit()
    await db.refresh(fine)
    
    outbox_event = Outbox(
        event_type="fine_created",
        payload={
            "fine_number": fine.fine_number,
            "citizen_name": fine.citizen_name,
            "citizen_identifier": fine.citizen_identifier,
            "amount": fine.amount,
            "reason": fine.reason
        },
        status=OutboxStatus.PENDING
    )
    db.add(outbox_event)
    
    timeline_event = TimelineEvent(
        event_type="fine_issued",
        category="lspd",
        title=f"Multa emessa: €{fine.amount}",
        description=f"Soggetto: {fine.citizen_name} - {fine.reason}",
        entity_id=fine.id,
        entity_type="fine",
        user_id=current_user.id
    )
    db.add(timeline_event)
    
    await db.commit()
    
    await sse_manager.broadcast("fine_issued", {
        "fine_id": fine.id,
        "fine_number": fine.fine_number,
        "amount": fine.amount
    }, roles={"police", "dispatch", "admin"})
    
    return fine


@router.put("/fines/{fine_id}", response_model=FineResponse)
async def update_fine(
    fine_id: int,
    citizen_name: Optional[str] = None,
    amount: Optional[float] = None,
    reason: Optional[str] = None,
    modification_reason: str = Query(..., description="Motivo della modifica (obbligatorio)"),
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Modifica una multa esistente.
    Solo il creatore o un superiore può modificare.
    """
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()
    
    if not fine:
        raise HTTPException(status_code=404, detail="Multa non trovata")
    
    # Verifica permessi: creatore o superiore
    is_owner = fine.issued_by == current_user.id
    is_superior = current_user.hierarchy_level >= 7  # Comandante+
    
    if not is_owner and not is_superior:
        raise HTTPException(
            status_code=403, 
            detail="Solo il creatore della multa o un superiore può modificarla"
        )
    
    # Aggiorna campi
    if citizen_name:
        fine.citizen_name = citizen_name
    if amount is not None:
        fine.amount = amount
    if reason:
        fine.reason = reason
    
    fine.last_modified_by = current_user.id
    fine.modification_reason = modification_reason
    
    timeline_event = TimelineEvent(
        event_type="fine_modified",
        category="lspd",
        title=f"Multa modificata: {fine.fine_number}",
        description=f"Modificata da {current_user.game_name or current_user.email}. Motivo: {modification_reason}",
        entity_id=fine.id,
        entity_type="fine",
        user_id=current_user.id
    )
    db.add(timeline_event)
    
    await db.commit()
    await db.refresh(fine)
    
    return fine


@router.delete("/fines/{fine_id}", response_model=MessageResponse)
async def delete_fine(
    fine_id: int,
    deletion_reason: str = Query(..., description="Motivo della cancellazione (obbligatorio)"),
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancella una multa.
    Solo il creatore o un superiore può cancellare.
    """
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()
    
    if not fine:
        raise HTTPException(status_code=404, detail="Multa non trovata")
    
    # Verifica permessi: creatore o superiore
    is_owner = fine.issued_by == current_user.id
    is_superior = current_user.hierarchy_level >= 7  # Comandante+
    
    if not is_owner and not is_superior:
        raise HTTPException(
            status_code=403, 
            detail="Solo il creatore della multa o un superiore può cancellarla"
        )
    
    # Log timeline prima di eliminare
    timeline_event = TimelineEvent(
        event_type="fine_deleted",
        category="lspd",
        title=f"Multa eliminata: {fine.fine_number}",
        description=f"Eliminata da {current_user.game_name or current_user.email}. Motivo: {deletion_reason}",
        entity_id=fine.id,
        entity_type="fine",
        user_id=current_user.id,
        extra_data={
            "fine_number": fine.fine_number,
            "citizen_name": fine.citizen_name,
            "amount": fine.amount,
            "reason": fine.reason,
            "deletion_reason": deletion_reason
        }
    )
    db.add(timeline_event)
    
    await db.delete(fine)
    await db.commit()
    
    return MessageResponse(message=f"Multa {fine.fine_number} eliminata con successo")


# ==========================================
# EVIDENCE
# ==========================================

@router.get("/evidence/{case_id}", response_model=List[EvidenceResponse])
async def get_evidence(
    case_id: int,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Lista prove per caso"""
    result = await db.execute(
        select(Evidence).where(Evidence.case_id == case_id).order_by(Evidence.created_at)
    )
    return result.scalars().all()


@router.post("/evidence", response_model=EvidenceResponse)
async def add_evidence(
    request: EvidenceCreate,
    current_user: User = Depends(require_roles(UserRole.POLICE)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiungi prova a caso"""
    result = await db.execute(select(Case).where(Case.id == request.case_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Caso non trovato")
    
    evidence = Evidence(
        case_id=request.case_id,
        evidence_type=request.evidence_type,
        title=request.title,
        description=request.description,
        file_url=request.file_url
    )
    
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    
    timeline_event = TimelineEvent(
        event_type="evidence_added",
        category="lspd",
        title=f"Prova aggiunta: {evidence.title}",
        description=f"Tipo: {evidence.evidence_type}",
        entity_id=request.case_id,
        entity_type="case",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    return evidence


# ==========================================
# DASHBOARD STATS
# ==========================================

@router.get("/stats")
async def get_lspd_stats(
    current_user: User = Depends(require_roles(UserRole.POLICE, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche dashboard LSPD - CACHED 30s"""
    # Check cache first
    cached_stats = await ModuleCache.get_stats("lspd")
    if cached_stats:
        return cached_stats
    
    # Query stats
    open_cases = await db.execute(
        select(func.count(Case.id)).where(Case.status.in_([CaseStatus.OPEN, CaseStatus.INVESTIGATING]))
    )
    
    active_warrants = await db.execute(
        select(func.count(Warrant.id)).where(Warrant.is_active == True)
    )
    
    unpaid_fines = await db.execute(
        select(func.count(Fine.id)).where(Fine.is_paid == False)
    )
    
    total_fines_amount = await db.execute(
        select(func.sum(Fine.amount)).where(Fine.is_paid == False)
    )
    
    stats = {
        "casi_aperti": open_cases.scalar() or 0,
        "mandati_attivi": active_warrants.scalar() or 0,
        "multe_non_pagate": unpaid_fines.scalar() or 0,
        "totale_multe": total_fines_amount.scalar() or 0
    }
    
    # Cache for 30 seconds
    await ModuleCache.set_stats("lspd", stats, ttl=30)
    
    return stats
