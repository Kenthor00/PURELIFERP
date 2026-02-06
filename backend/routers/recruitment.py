"""
PURE LIFE OS - Recruitment Router
Sistema di candidature per i settori governativi
Con notifiche real-time e workflow colloquio
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import (
    User, Sector, RecruitmentApplication, ApplicationStatus, AuditAction, NotificationType
)
from auth import get_current_user
from services.audit_service import AuditService
from routers.notifications import notify_sector_chiefs, notify_user

router = APIRouter(prefix="/recruitment", tags=["Reclutamento"])
audit_service = AuditService()


# ==========================================
# SCHEMAS
# ==========================================

class CreateApplicationRequest(BaseModel):
    target_sector: str
    motivation: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    additional_info: Optional[str] = None


class ReviewApplicationRequest(BaseModel):
    status: str  # "reviewing", "interview", "accepted", "rejected"
    notes: Optional[str] = None
    interview_assigned_to: Optional[int] = None
    interview_scheduled_at: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    target_sector: str
    user_id: int
    game_name: str
    user_sector: str
    motivation: str
    experience: Optional[str]
    availability: Optional[str]
    additional_info: Optional[str]
    status: str
    reviewer_id: Optional[int]
    reviewer_game_name: Optional[str]
    reviewer_notes: Optional[str]
    created_at: str
    reviewed_at: Optional[str]


# ==========================================
# ENDPOINTS - APPLICANT
# ==========================================

@router.post("/apply", response_model=ApplicationResponse)
async def create_application(
    data: CreateApplicationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una nuova candidatura"""
    
    # Valida il settore target
    try:
        target_sector = Sector(data.target_sector.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Settore non valido: {data.target_sector}")
    
    # Non può candidarsi per ADMIN o CIVIL
    if target_sector in [Sector.ADMIN, Sector.CIVIL]:
        raise HTTPException(status_code=400, detail="Non puoi candidarti per questo settore")
    
    # Verifica se ha già una candidatura pendente per lo stesso settore
    existing = await db.execute(
        select(RecruitmentApplication)
        .where(RecruitmentApplication.user_id == current_user.id)
        .where(RecruitmentApplication.target_sector == target_sector.value)
        .where(RecruitmentApplication.status.in_([ApplicationStatus.PENDING.value, ApplicationStatus.REVIEWING.value]))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Hai già una candidatura pendente per questo settore")
    
    # Crea candidatura
    application = RecruitmentApplication(
        target_sector=target_sector.value,
        user_id=current_user.id,
        game_name=current_user.game_name or current_user.email,
        user_sector=current_user.sector.value,
        motivation=data.motivation,
        experience=data.experience,
        availability=data.availability,
        additional_info=data.additional_info,
        status=ApplicationStatus.PENDING.value
    )
    
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    # Audit log
    await audit_service.log(
        db,
        action=AuditAction.APPLICATION_CREATE,
        user=current_user,
        entity_type="recruitment_application",
        entity_id=application.id,
        description=f"Candidatura per {target_sector.value}",
        request=request
    )
    
    return _application_to_response(application)


@router.get("/my-applications", response_model=List[ApplicationResponse])
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni le tue candidature"""
    result = await db.execute(
        select(RecruitmentApplication)
        .where(RecruitmentApplication.user_id == current_user.id)
        .order_by(desc(RecruitmentApplication.created_at))
    )
    applications = result.scalars().all()
    return [_application_to_response(a) for a in applications]


# ==========================================
# ENDPOINTS - SECTOR MANAGEMENT
# ==========================================

@router.get("/sector/{sector}", response_model=List[ApplicationResponse])
async def get_sector_applications(
    sector: str,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ottieni candidature per un settore (solo capi settore e admin)"""
    
    # Valida settore
    try:
        target_sector = Sector(sector.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Settore non valido: {sector}")
    
    # Verifica permessi
    if current_user.sector != Sector.ADMIN:
        # Solo capi settore possono vedere le candidature del proprio settore
        if not current_user.is_sector_chief:
            raise HTTPException(status_code=403, detail="Non hai i permessi per visualizzare le candidature")
        if current_user.sector != target_sector:
            raise HTTPException(status_code=403, detail="Puoi visualizzare solo le candidature del tuo settore")
    
    # Query
    query = select(RecruitmentApplication).where(
        RecruitmentApplication.target_sector == target_sector.value
    )
    
    if status:
        try:
            status_enum = ApplicationStatus(status.lower())
            query = query.where(RecruitmentApplication.status == status_enum.value)
        except ValueError:
            pass
    
    query = query.order_by(desc(RecruitmentApplication.created_at))
    
    result = await db.execute(query)
    applications = result.scalars().all()
    return [_application_to_response(a) for a in applications]


@router.put("/{application_id}/review", response_model=ApplicationResponse)
async def review_application(
    application_id: int,
    data: ReviewApplicationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revisiona una candidatura (solo capi settore livello 7+ e admin)"""
    
    # Trova candidatura
    result = await db.execute(
        select(RecruitmentApplication).where(RecruitmentApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    
    # Verifica permessi
    if current_user.sector != Sector.ADMIN:
        if not current_user.is_sector_chief:
            raise HTTPException(status_code=403, detail="Non hai i permessi per revisionare candidature")
        if current_user.sector.value != application.target_sector:
            raise HTTPException(status_code=403, detail="Puoi revisionare solo candidature del tuo settore")
        if current_user.hierarchy_level < 7:
            raise HTTPException(status_code=403, detail="Devi essere almeno livello 7 per revisionare")
    
    # Valida status
    try:
        new_status = ApplicationStatus(data.status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Stato non valido: {data.status}")
    
    if new_status not in [ApplicationStatus.REVIEWING, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Stato non valido per la revisione")
    
    # Determina azione audit
    if new_status == ApplicationStatus.REVIEWING:
        audit_action = AuditAction.APPLICATION_REVIEW
    elif new_status == ApplicationStatus.ACCEPTED:
        audit_action = AuditAction.APPLICATION_ACCEPT
    else:
        audit_action = AuditAction.APPLICATION_REJECT
    
    # Aggiorna candidatura
    application.status = new_status.value
    application.reviewer_id = current_user.id
    application.reviewer_game_name = current_user.game_name
    application.reviewer_notes = data.notes
    application.reviewed_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(application)
    
    # Audit log
    await audit_service.log(
        db,
        action=audit_action,
        user=current_user,
        entity_type="recruitment_application",
        entity_id=application.id,
        description=f"Candidatura {new_status.value}: {application.game_name} per {application.target_sector}",
        request=request
    )
    
    return _application_to_response(application)


@router.get("/stats")
async def get_recruitment_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche reclutamento"""
    
    # Admin vede tutto, capi settore solo il proprio
    if current_user.sector == Sector.ADMIN:
        base_query = select(RecruitmentApplication)
    elif current_user.is_sector_chief:
        base_query = select(RecruitmentApplication).where(
            RecruitmentApplication.target_sector == current_user.sector.value
        )
    else:
        raise HTTPException(status_code=403, detail="Non hai i permessi")
    
    # Conta per stato
    pending = await db.execute(
        base_query.where(RecruitmentApplication.status == ApplicationStatus.PENDING.value)
    )
    reviewing = await db.execute(
        base_query.where(RecruitmentApplication.status == ApplicationStatus.REVIEWING.value)
    )
    accepted = await db.execute(
        base_query.where(RecruitmentApplication.status == ApplicationStatus.ACCEPTED.value)
    )
    rejected = await db.execute(
        base_query.where(RecruitmentApplication.status == ApplicationStatus.REJECTED.value)
    )
    
    return {
        "pending": len(pending.scalars().all()),
        "reviewing": len(reviewing.scalars().all()),
        "accepted": len(accepted.scalars().all()),
        "rejected": len(rejected.scalars().all())
    }


@router.get("/available-sectors")
async def get_available_sectors(
    current_user: User = Depends(get_current_user)
):
    """Settori disponibili per candidatura"""
    return {
        "sectors": [
            {"value": "LSPD", "label": "Los Santos Police Department"},
            {"value": "EMS", "label": "Emergency Medical Services"},
            {"value": "GOV", "label": "Governo"},
            {"value": "NEWS", "label": "Weazel News"},
            {"value": "DISPATCH", "label": "Dispatch Center"}
        ]
    }


# ==========================================
# HELPERS
# ==========================================

def _application_to_response(app: RecruitmentApplication) -> ApplicationResponse:
    return ApplicationResponse(
        id=app.id,
        target_sector=app.target_sector,
        user_id=app.user_id,
        game_name=app.game_name,
        user_sector=app.user_sector,
        motivation=app.motivation,
        experience=app.experience,
        availability=app.availability,
        additional_info=app.additional_info,
        status=app.status,
        reviewer_id=app.reviewer_id,
        reviewer_game_name=app.reviewer_game_name,
        reviewer_notes=app.reviewer_notes,
        created_at=app.created_at.isoformat() if app.created_at else "",
        reviewed_at=app.reviewed_at.isoformat() if app.reviewed_at else None
    )
