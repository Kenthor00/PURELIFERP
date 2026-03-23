"""
PURE LIFE OS - Job Board Router
Sistema completo di bandi di lavoro.
- Admin crea/modifica/elimina posizioni lavorative
- Cittadini consultano i bandi aperti e si candidano
- Admin/Staff gestisce le candidature (accetta/rifiuta/colloquio)
- Notifiche lb-phone per ogni aggiornamento
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from auth import get_current_user
from models import User
from services.lbphone_service import queue_notification_for_user

router = APIRouter(prefix="/jobs", tags=["Job Board"])


# ==========================================
# SCHEMAS
# ==========================================

class CreateJobRequest(BaseModel):
    title: str
    department: str
    description: str
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    max_slots: int = 1
    location: Optional[str] = "Los Santos"
    contact_info: Optional[str] = None
    priority: str = "normal"  # normal, high, urgent

class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    max_slots: Optional[int] = None
    location: Optional[str] = None
    contact_info: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None  # open, closed, paused

class ApplyJobRequest(BaseModel):
    motivation: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    additional_info: Optional[str] = None

class ReviewApplicationRequest(BaseModel):
    status: str  # reviewing, interview, accepted, rejected
    notes: Optional[str] = None
    interview_date: Optional[str] = None


# ==========================================
# TABLE CREATION
# ==========================================

async def ensure_job_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_postings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            department VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            requirements TEXT,
            salary_range VARCHAR(100),
            max_slots INT DEFAULT 1,
            filled_slots INT DEFAULT 0,
            location VARCHAR(100) DEFAULT 'Los Santos',
            contact_info VARCHAR(200),
            priority VARCHAR(20) DEFAULT 'normal',
            status VARCHAR(20) DEFAULT 'open',
            created_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            closed_at DATETIME NULL
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_id INT NOT NULL,
            user_id INT NOT NULL,
            game_name VARCHAR(100),
            motivation TEXT NOT NULL,
            experience TEXT,
            availability VARCHAR(200),
            additional_info TEXT,
            status VARCHAR(30) DEFAULT 'pending',
            reviewer_id INT NULL,
            reviewer_name VARCHAR(100),
            reviewer_notes TEXT,
            interview_date DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE
        )
    """))
    await db.commit()


def _is_admin(user: User) -> bool:
    sector = user.sector.value if hasattr(user.sector, 'value') else str(user.sector)
    return sector in ["ADMIN", "GOV"]


# ==========================================
# ADMIN - GESTIONE BANDI
# ==========================================

@router.post("/create")
async def create_job(
    data: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin crea un nuovo bando di lavoro"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin/GOV possono creare bandi")
    
    await ensure_job_tables(db)
    
    result = await db.execute(text("""
        INSERT INTO job_postings (title, department, description, requirements, salary_range, max_slots, location, contact_info, priority, created_by)
        VALUES (:title, :dept, :desc, :req, :salary, :slots, :loc, :contact, :prio, :uid)
    """), {
        "title": data.title,
        "dept": data.department,
        "desc": data.description,
        "req": data.requirements,
        "salary": data.salary_range,
        "slots": data.max_slots,
        "loc": data.location,
        "contact": data.contact_info,
        "prio": data.priority,
        "uid": current_user.id
    })
    await db.commit()
    
    job_id = result.lastrowid
    
    return {
        "id": job_id,
        "title": data.title,
        "department": data.department,
        "status": "open",
        "message": "Bando creato con successo"
    }


@router.get("/admin/all")
async def get_all_jobs_admin(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin vede tutti i bandi (inclusi chiusi/pausa)"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    
    query = "SELECT * FROM job_postings"
    params = {}
    if status:
        query += " WHERE status = :status"
        params["status"] = status
    query += " ORDER BY created_at DESC"
    
    result = await db.execute(text(query), params)
    jobs = []
    for row in result.mappings().all():
        # Count applications
        app_count = await db.execute(text(
            "SELECT COUNT(*) FROM job_applications WHERE job_id = :jid"
        ), {"jid": row["id"]})
        
        jobs.append({
            "id": row["id"],
            "title": row["title"],
            "department": row["department"],
            "description": row["description"],
            "requirements": row["requirements"],
            "salary_range": row["salary_range"],
            "max_slots": row["max_slots"],
            "filled_slots": row["filled_slots"],
            "location": row["location"],
            "contact_info": row["contact_info"],
            "priority": row["priority"],
            "status": row["status"],
            "applications_count": app_count.scalar(),
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
        })
    
    return jobs


@router.put("/{job_id}")
async def update_job(
    job_id: int,
    data: UpdateJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin modifica un bando"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    
    # Check exists
    job = await db.execute(text("SELECT id FROM job_postings WHERE id = :jid"), {"jid": job_id})
    if not job.mappings().first():
        raise HTTPException(status_code=404, detail="Bando non trovato")
    
    updates = []
    params = {"jid": job_id}
    
    for field in ["title", "department", "description", "requirements", "salary_range", "max_slots", "location", "contact_info", "priority", "status"]:
        value = getattr(data, field, None)
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value
    
    if data.status == "closed":
        updates.append("closed_at = NOW()")
    
    if updates:
        await db.execute(text(f"UPDATE job_postings SET {', '.join(updates)} WHERE id = :jid"), params)
        await db.commit()
    
    return {"message": "Bando aggiornato", "id": job_id}


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin elimina un bando"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    await db.execute(text("DELETE FROM job_postings WHERE id = :jid"), {"jid": job_id})
    await db.commit()
    
    return {"message": "Bando eliminato"}


# ==========================================
# ADMIN - GESTIONE CANDIDATURE
# ==========================================

@router.get("/{job_id}/applications")
async def get_job_applications(
    job_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin vede le candidature per un bando"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    
    query = "SELECT * FROM job_applications WHERE job_id = :jid"
    params = {"jid": job_id}
    if status:
        query += " AND status = :status"
        params["status"] = status
    query += " ORDER BY created_at DESC"
    
    result = await db.execute(text(query), params)
    apps = []
    for row in result.mappings().all():
        apps.append({
            "id": row["id"],
            "job_id": row["job_id"],
            "user_id": row["user_id"],
            "game_name": row["game_name"],
            "motivation": row["motivation"],
            "experience": row["experience"],
            "availability": row["availability"],
            "additional_info": row["additional_info"],
            "status": row["status"],
            "reviewer_name": row["reviewer_name"],
            "reviewer_notes": row["reviewer_notes"],
            "interview_date": str(row["interview_date"]) if row["interview_date"] else None,
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
        })
    
    return apps


@router.put("/applications/{app_id}/review")
async def review_application(
    app_id: int,
    data: ReviewApplicationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin gestisce una candidatura"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    
    # Get application
    app_result = await db.execute(text("SELECT * FROM job_applications WHERE id = :aid"), {"aid": app_id})
    app = app_result.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    
    valid_statuses = ["reviewing", "interview", "accepted", "rejected"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Stato non valido. Usa: {', '.join(valid_statuses)}")
    
    updates = {
        "aid": app_id,
        "status": data.status,
        "reviewer_id": current_user.id,
        "reviewer_name": current_user.game_name or current_user.email,
        "notes": data.notes,
    }
    
    query = """UPDATE job_applications SET 
        status = :status, reviewer_id = :reviewer_id, reviewer_name = :reviewer_name, 
        reviewer_notes = :notes, reviewed_at = NOW()"""
    
    if data.interview_date:
        query += ", interview_date = :idate"
        updates["idate"] = data.interview_date
    
    query += " WHERE id = :aid"
    
    await db.execute(text(query), updates)
    
    # If accepted, increment filled_slots
    if data.status == "accepted":
        await db.execute(text("""
            UPDATE job_postings SET filled_slots = filled_slots + 1 WHERE id = :jid
        """), {"jid": app["job_id"]})
    
    await db.commit()
    
    # Notify citizen via lb-phone
    status_labels = {
        "reviewing": "In Revisione",
        "interview": "Colloquio Programmato",
        "accepted": "ACCETTATA",
        "rejected": "Non Accettata"
    }
    
    try:
        # Get job title
        job_result = await db.execute(text("SELECT title FROM job_postings WHERE id = :jid"), {"jid": app["job_id"]})
        job = job_result.mappings().first()
        job_title = job["title"] if job else "Lavoro"
        
        icon = "fa-solid fa-check-circle" if data.status == "accepted" else "fa-solid fa-briefcase"
        color = "#adff2f" if data.status == "accepted" else "#f59e0b" if data.status == "interview" else "#8b5cf6"
        
        await queue_notification_for_user(
            db, app["user_id"],
            title=f"Candidatura {status_labels.get(data.status, data.status)}",
            message=f"{job_title}: la tua candidatura e' stata {status_labels.get(data.status, 'aggiornata')}.",
            icon=icon,
            color=color
        )
    except Exception:
        pass
    
    return {"message": f"Candidatura {status_labels.get(data.status, 'aggiornata')}", "status": data.status}


@router.get("/admin/stats")
async def get_job_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche bandi per admin"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    
    await ensure_job_tables(db)
    
    total = await db.execute(text("SELECT COUNT(*) FROM job_postings"))
    open_count = await db.execute(text("SELECT COUNT(*) FROM job_postings WHERE status = 'open'"))
    total_apps = await db.execute(text("SELECT COUNT(*) FROM job_applications"))
    pending_apps = await db.execute(text("SELECT COUNT(*) FROM job_applications WHERE status = 'pending'"))
    accepted_apps = await db.execute(text("SELECT COUNT(*) FROM job_applications WHERE status = 'accepted'"))
    
    return {
        "total_jobs": total.scalar(),
        "open_jobs": open_count.scalar(),
        "total_applications": total_apps.scalar(),
        "pending_applications": pending_apps.scalar(),
        "accepted_applications": accepted_apps.scalar()
    }


# ==========================================
# CITIZEN - BANDI APERTI E CANDIDATURE
# ==========================================

@router.get("/open")
async def get_open_jobs(
    department: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista bandi aperti (visibile a tutti gli utenti autenticati)"""
    await ensure_job_tables(db)
    
    query = "SELECT * FROM job_postings WHERE status = 'open' AND filled_slots < max_slots"
    params = {}
    if department:
        query += " AND department = :dept"
        params["dept"] = department
    query += " ORDER BY FIELD(priority, 'urgent', 'high', 'normal'), created_at DESC"
    
    result = await db.execute(text(query), params)
    jobs = []
    for row in result.mappings().all():
        # Check if user already applied
        applied = await db.execute(text(
            "SELECT id, status FROM job_applications WHERE job_id = :jid AND user_id = :uid"
        ), {"jid": row["id"], "uid": current_user.id})
        user_app = applied.mappings().first()
        
        jobs.append({
            "id": row["id"],
            "title": row["title"],
            "department": row["department"],
            "description": row["description"],
            "requirements": row["requirements"],
            "salary_range": row["salary_range"],
            "max_slots": row["max_slots"],
            "filled_slots": row["filled_slots"],
            "available_slots": row["max_slots"] - row["filled_slots"],
            "location": row["location"],
            "priority": row["priority"],
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "user_applied": user_app is not None,
            "user_application_status": user_app["status"] if user_app else None,
        })
    
    return jobs


@router.post("/{job_id}/apply")
async def apply_to_job(
    job_id: int,
    data: ApplyJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cittadino si candida per un bando"""
    await ensure_job_tables(db)
    
    # Check job exists and is open
    job = await db.execute(text(
        "SELECT * FROM job_postings WHERE id = :jid AND status = 'open'"
    ), {"jid": job_id})
    job_data = job.mappings().first()
    if not job_data:
        raise HTTPException(status_code=404, detail="Bando non trovato o chiuso")
    
    if job_data["filled_slots"] >= job_data["max_slots"]:
        raise HTTPException(status_code=400, detail="Tutti i posti sono stati occupati")
    
    # Check if already applied
    existing = await db.execute(text(
        "SELECT id FROM job_applications WHERE job_id = :jid AND user_id = :uid AND status NOT IN ('rejected')"
    ), {"jid": job_id, "uid": current_user.id})
    if existing.mappings().first():
        raise HTTPException(status_code=400, detail="Hai gia' una candidatura per questo bando")
    
    # Create application
    result = await db.execute(text("""
        INSERT INTO job_applications (job_id, user_id, game_name, motivation, experience, availability, additional_info)
        VALUES (:jid, :uid, :name, :motiv, :exp, :avail, :info)
    """), {
        "jid": job_id,
        "uid": current_user.id,
        "name": current_user.game_name or current_user.email,
        "motiv": data.motivation,
        "exp": data.experience,
        "avail": data.availability,
        "info": data.additional_info,
    })
    await db.commit()
    
    return {
        "id": result.lastrowid,
        "job_title": job_data["title"],
        "status": "pending",
        "message": "Candidatura inviata con successo"
    }


@router.get("/my-applications")
async def get_my_job_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cittadino vede le sue candidature"""
    await ensure_job_tables(db)
    
    result = await db.execute(text("""
        SELECT ja.*, jp.title as job_title, jp.department as job_department, jp.status as job_status
        FROM job_applications ja
        JOIN job_postings jp ON ja.job_id = jp.id
        WHERE ja.user_id = :uid
        ORDER BY ja.created_at DESC
    """), {"uid": current_user.id})
    
    apps = []
    for row in result.mappings().all():
        apps.append({
            "id": row["id"],
            "job_id": row["job_id"],
            "job_title": row["job_title"],
            "job_department": row["job_department"],
            "job_status": row["job_status"],
            "motivation": row["motivation"],
            "status": row["status"],
            "reviewer_name": row["reviewer_name"],
            "reviewer_notes": row["reviewer_notes"],
            "interview_date": str(row["interview_date"]) if row["interview_date"] else None,
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "reviewed_at": str(row["reviewed_at"]) if row["reviewed_at"] else None,
        })
    
    return apps
