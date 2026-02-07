"""
PURE LIFE OS - EMS Router
Pazienti, Referti, Templates
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from models import User, Patient, MedicalReport, TimelineEvent
from schemas import (
    PatientCreate, PatientUpdate, PatientResponse, PatientDetailResponse,
    MedicalReportCreate, MedicalReportResponse, TimelineEventResponse, MessageResponse
)
from auth import get_current_user, require_roles, UserRole
from utils import generate_patient_number, generate_report_number, get_template, fill_template, MEDICAL_TEMPLATES
from sse_manager import sse_manager

router = APIRouter(prefix="/ems", tags=["EMS"])


# ==========================================
# PAZIENTI
# ==========================================

@router.get("/patients", response_model=List[PatientResponse])
async def get_patients(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Lista pazienti"""
    query = select(Patient).order_by(desc(Patient.updated_at))
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Patient.name.ilike(search_filter)) |
            (Patient.patient_number.ilike(search_filter)) |
            (Patient.identifier.ilike(search_filter))
        )
    
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


@router.get("/patients/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(
    patient_id: int,
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio paziente con timeline clinica"""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    
    reports_result = await db.execute(
        select(MedicalReport)
        .where(MedicalReport.patient_id == patient_id)
        .order_by(desc(MedicalReport.created_at))
    )
    
    timeline_result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.entity_type == "patient", TimelineEvent.entity_id == patient_id)
        .order_by(desc(TimelineEvent.created_at))
    )
    
    return PatientDetailResponse(
        **{k: v for k, v in patient.__dict__.items() if not k.startswith('_')},
        reports=[MedicalReportResponse(**{k: v for k, v in r.__dict__.items() if not k.startswith('_')}) for r in reports_result.scalars().all()],
        timeline=[TimelineEventResponse(**{k: v for k, v in t.__dict__.items() if not k.startswith('_')}) for t in timeline_result.scalars().all()]
    )


@router.post("/patients", response_model=PatientResponse)
async def create_patient(
    request: PatientCreate,
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Registra nuovo paziente"""
    patient = Patient(
        patient_number=generate_patient_number(),
        name=request.name,
        identifier=request.identifier,
        blood_type=request.blood_type,
        allergies=request.allergies,
        medical_history=request.medical_history,
        phone_number=request.phone_number,
        emergency_contact=request.emergency_contact
    )
    
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    
    timeline_event = TimelineEvent(
        event_type="patient_registered",
        category="ems",
        title=f"Paziente registrato: {patient.name}",
        description=f"Registrato da {current_user.game_name or current_user.email}",
        entity_id=patient.id,
        entity_type="patient",
        user_id=current_user.id
    )
    db.add(timeline_event)
    await db.commit()
    
    await sse_manager.broadcast("patient_registered", {
        "patient_id": patient.id,
        "patient_number": patient.patient_number,
        "name": patient.name
    }, roles={"ems", "dispatch", "admin"})
    
    return patient


@router.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: int,
    request: PatientUpdate,
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Aggiorna dati paziente"""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
    
    await db.commit()
    await db.refresh(patient)
    
    return patient


# ==========================================
# REFERTI MEDICI
# ==========================================

@router.get("/reports", response_model=List[MedicalReportResponse])
async def get_reports(
    patient_id: Optional[int] = None,
    limit: int = Query(50, le=100),
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Lista referti medici"""
    query = select(MedicalReport).order_by(desc(MedicalReport.created_at))
    
    if patient_id:
        query = query.where(MedicalReport.patient_id == patient_id)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()


@router.post("/reports", response_model=MedicalReportResponse)
async def create_report(
    request: MedicalReportCreate,
    current_user: User = Depends(require_roles(UserRole.EMS)),
    db: AsyncSession = Depends(get_db)
):
    """Crea referto medico"""
    patient_result = await db.execute(select(Patient).where(Patient.id == request.patient_id))
    patient = patient_result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    
    report = MedicalReport(
        report_number=generate_report_number(),
        patient_id=request.patient_id,
        doctor_id=current_user.id,
        diagnosis=request.diagnosis,
        treatment=request.treatment,
        prescription=request.prescription,
        notes=request.notes,
        template_used=request.template_used
    )
    
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    timeline_event = TimelineEvent(
        event_type="report_created",
        category="ems",
        title=f"Referto medico: {report.report_number}",
        description=f"Diagnosi: {report.diagnosis[:100]}...",
        entity_id=patient.id,
        entity_type="patient",
        user_id=current_user.id,
        metadata_json={"report_id": report.id}
    )
    db.add(timeline_event)
    await db.commit()
    
    await sse_manager.broadcast("report_created", {
        "report_id": report.id,
        "report_number": report.report_number,
        "patient_name": patient.name
    }, roles={"ems", "admin"})
    
    return report


# ==========================================
# TEMPLATES
# ==========================================

@router.get("/templates")
async def get_templates(
    current_user: User = Depends(require_roles(UserRole.EMS))
):
    """Lista templates medici disponibili"""
    return {
        "templates": [
            {"id": k, "name": v["name"]} 
            for k, v in MEDICAL_TEMPLATES.items()
        ]
    }


@router.get("/templates/{template_id}")
async def get_template_detail(
    template_id: str,
    current_user: User = Depends(require_roles(UserRole.EMS))
):
    """Ottieni dettaglio template"""
    template = MEDICAL_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    
    return template


@router.post("/templates/{template_id}/fill")
async def fill_template_endpoint(
    template_id: str,
    data: dict,
    current_user: User = Depends(require_roles(UserRole.EMS))
):
    """Compila template con dati"""
    template_data = MEDICAL_TEMPLATES.get(template_id)
    if not template_data:
        raise HTTPException(status_code=404, detail="Template non trovato")
    
    data["medico"] = current_user.game_name or current_user.email
    data["data"] = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    
    filled = fill_template(template_data["template"], data)
    
    return {"filled_template": filled}


# ==========================================
# DASHBOARD STATS
# ==========================================

@router.get("/stats")
async def get_ems_stats(
    current_user: User = Depends(require_roles(UserRole.EMS, UserRole.DISPATCH)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche dashboard EMS"""
    total_patients = await db.execute(select(func.count(Patient.id)))
    
    today_reports = await db.execute(
        select(func.count(MedicalReport.id))
        .where(func.date(MedicalReport.created_at) == func.current_date())
    )
    
    total_reports = await db.execute(select(func.count(MedicalReport.id)))
    
    return {
        "pazienti_totali": total_patients.scalar() or 0,
        "referti_oggi": today_reports.scalar() or 0,
        "referti_totali": total_reports.scalar() or 0
    }
