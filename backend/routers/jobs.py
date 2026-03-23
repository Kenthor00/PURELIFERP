"""
PURE LIFE OS - Job Board Router v2
Sistema bandi di lavoro multi-dipartimento.

FLUSSO:
1. ADMIN crea Dipartimenti (LSPD, EMS, Meccanico, Concessionario...)
   -> Assegna settore, modulo candidatura, descrizione
2. STAFF di ogni dipartimento crea bandi per il proprio reparto
   -> Bando con titolo, posti, stipendio, requisiti
3. CITTADINI vedono tutti i bandi aperti e si candidano
   -> Modulo precompilato con campi del dipartimento
4. STAFF del dipartimento gestisce le candidature
   -> Accetta, rifiuta, colloquio con notifica lb-phone
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List
import json

from database import get_db
from auth import get_current_user
from models import User
from services.lbphone_service import queue_notification_for_user

router = APIRouter(prefix="/jobs", tags=["Job Board"])


# ==========================================
# SCHEMAS
# ==========================================

class CreateDepartmentRequest(BaseModel):
    name: str
    code: str  # es: LSPD, EMS, MECH, CONC
    description: str
    icon: Optional[str] = "fa-solid fa-building"
    color: Optional[str] = "#adff2f"
    form_fields: Optional[str] = None  # JSON array of custom fields

class UpdateDepartmentRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    form_fields: Optional[str] = None
    active: Optional[bool] = None

class CreatePostingRequest(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    max_slots: int = 1
    location: Optional[str] = "Los Santos"
    priority: str = "normal"

class UpdatePostingRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    max_slots: Optional[int] = None
    location: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None

class ApplyRequest(BaseModel):
    motivation: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    custom_fields: Optional[str] = None  # JSON: risposte ai campi custom del dipartimento

class ReviewRequest(BaseModel):
    status: str  # reviewing, interview, accepted, rejected
    notes: Optional[str] = None
    interview_date: Optional[str] = None


# ==========================================
# TABLE CREATION
# ==========================================

async def ensure_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_departments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(30) UNIQUE NOT NULL,
            description TEXT,
            icon VARCHAR(100) DEFAULT 'fa-solid fa-building',
            color VARCHAR(20) DEFAULT '#adff2f',
            form_fields TEXT,
            active BOOLEAN DEFAULT TRUE,
            created_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_dept_managers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dept_id INT NOT NULL,
            dept_code VARCHAR(30) NOT NULL,
            user_id INT NOT NULL,
            assigned_by INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_dept_user (dept_id, user_id),
            FOREIGN KEY (dept_id) REFERENCES job_departments(id) ON DELETE CASCADE
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_postings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dept_id INT NOT NULL,
            dept_code VARCHAR(30) NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            requirements TEXT,
            salary_range VARCHAR(100),
            max_slots INT DEFAULT 1,
            filled_slots INT DEFAULT 0,
            location VARCHAR(100) DEFAULT 'Los Santos',
            priority VARCHAR(20) DEFAULT 'normal',
            status VARCHAR(20) DEFAULT 'open',
            created_by INT NOT NULL,
            creator_name VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (dept_id) REFERENCES job_departments(id) ON DELETE CASCADE
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS job_applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            posting_id INT NOT NULL,
            dept_id INT NOT NULL,
            dept_code VARCHAR(30) NOT NULL,
            user_id INT NOT NULL,
            game_name VARCHAR(100),
            motivation TEXT NOT NULL,
            experience TEXT,
            availability VARCHAR(200),
            custom_fields TEXT,
            status VARCHAR(30) DEFAULT 'pending',
            reviewer_id INT NULL,
            reviewer_name VARCHAR(100),
            reviewer_notes TEXT,
            interview_date DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            FOREIGN KEY (posting_id) REFERENCES job_postings(id) ON DELETE CASCADE
        )
    """))
    await db.commit()

# Soglia grado per essere direttore automatico
DIRECTOR_GRADE_THRESHOLD = 8


def _is_admin(user: User) -> bool:
    sector = user.sector.value if hasattr(user.sector, 'value') else str(user.sector)
    return sector in ["ADMIN", "GOV"]


def _get_sector(user: User) -> str:
    return user.sector.value if hasattr(user.sector, 'value') else str(user.sector)


def user_grade_int(user: User) -> int:
    grade = getattr(user, 'hierarchy_level', None) or getattr(user, 'grade', None) or 0
    if isinstance(grade, str):
        try:
            grade = int(grade)
        except (ValueError, TypeError):
            grade = 0
    return grade


async def _is_dept_director(user: User, dept_code: str, db: AsyncSession) -> bool:
    """
    Controlla se l'utente e' un direttore di questo dipartimento.
    Un direttore e':
    1. Admin/GOV -> puo' gestire tutto
    2. Assegnato manualmente come manager nella tabella job_dept_managers
    3. Stesso settore + grado >= DIRECTOR_GRADE_THRESHOLD
    4. Stesso settore + is_sector_chief = True
    """
    if _is_admin(user):
        return True

    sector = _get_sector(user)

    # Check manual assignment
    manual = await db.execute(text(
        "SELECT id FROM job_dept_managers WHERE dept_code = :code AND user_id = :uid"
    ), {"code": dept_code.upper(), "uid": user.id})
    if manual.mappings().first():
        return True

    # Check same sector + high grade or sector chief
    if sector.upper() == dept_code.upper():
        grade = user_grade_int(user)
        if grade >= DIRECTOR_GRADE_THRESHOLD:
            return True
        if getattr(user, 'is_sector_chief', False):
            return True

    return False


# ==========================================
# ADMIN - GESTIONE DIPARTIMENTI
# ==========================================

@router.post("/departments/create")
async def create_department(
    data: CreateDepartmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin crea un nuovo dipartimento/job"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin puo' creare dipartimenti")
    await ensure_tables(db)

    existing = await db.execute(text(
        "SELECT id FROM job_departments WHERE code = :code"
    ), {"code": data.code.upper()})
    if existing.mappings().first():
        raise HTTPException(status_code=400, detail="Codice dipartimento gia' esistente")

    result = await db.execute(text("""
        INSERT INTO job_departments (name, code, description, icon, color, form_fields, created_by)
        VALUES (:name, :code, :desc, :icon, :color, :fields, :uid)
    """), {
        "name": data.name,
        "code": data.code.upper(),
        "desc": data.description,
        "icon": data.icon,
        "color": data.color,
        "fields": data.form_fields,
        "uid": current_user.id
    })
    await db.commit()
    return {"id": result.lastrowid, "name": data.name, "code": data.code.upper(), "message": "Dipartimento creato"}


@router.get("/departments")
async def list_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista tutti i dipartimenti (admin vede tutti, staff vede i propri)"""
    await ensure_tables(db)
    result = await db.execute(text("SELECT * FROM job_departments ORDER BY name"))
    depts = []
    for row in result.mappings().all():
        posting_count = await db.execute(text(
            "SELECT COUNT(*) FROM job_postings WHERE dept_id = :did AND status = 'open'"
        ), {"did": row["id"]})
        app_count = await db.execute(text(
            "SELECT COUNT(*) FROM job_applications WHERE dept_id = :did AND status = 'pending'"
        ), {"did": row["id"]})
        mgr_count = await db.execute(text(
            "SELECT COUNT(*) FROM job_dept_managers WHERE dept_id = :did"
        ), {"did": row["id"]})
        depts.append({
            "id": row["id"], "name": row["name"], "code": row["code"],
            "description": row["description"], "icon": row["icon"],
            "color": row["color"], "form_fields": row["form_fields"],
            "active": bool(row["active"]),
            "open_postings": posting_count.scalar(),
            "pending_applications": app_count.scalar(),
            "managers_count": mgr_count.scalar(),
        })
    return depts


@router.put("/departments/{dept_id}")
async def update_department(
    dept_id: int, data: UpdateDepartmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin o Capo dipartimento modifica un dipartimento"""
    await ensure_tables(db)
    # Trova il dipartimento per prendere il codice
    dept = await db.execute(text("SELECT code FROM job_departments WHERE id = :did"), {"did": dept_id})
    dept_row = dept.mappings().first()
    if not dept_row:
        raise HTTPException(status_code=404, detail="Dipartimento non trovato")

    # Admin puo' tutto, il capo/direttore puo' modificare il proprio
    if not _is_admin(current_user) and not await _is_dept_director(current_user, dept_row["code"], db):
        raise HTTPException(status_code=403, detail="Non hai i permessi per modificare questo dipartimento")

    updates, params = [], {"did": dept_id}
    for field in ["name", "description", "icon", "color", "form_fields"]:
        v = getattr(data, field, None)
        if v is not None:
            updates.append(f"{field} = :{field}")
            params[field] = v
    if data.active is not None:
        # Solo admin puo' attivare/disattivare
        if not _is_admin(current_user):
            raise HTTPException(status_code=403, detail="Solo admin puo' attivare/disattivare dipartimenti")
        updates.append("active = :active")
        params["active"] = data.active
    if updates:
        await db.execute(text(f"UPDATE job_departments SET {', '.join(updates)} WHERE id = :did"), params)
        await db.commit()
    return {"message": "Dipartimento aggiornato"}


@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin elimina un dipartimento"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    await ensure_tables(db)
    await db.execute(text("DELETE FROM job_departments WHERE id = :did"), {"did": dept_id})
    await db.commit()
    return {"message": "Dipartimento eliminato"}


# ==========================================
# GESTIONE MANAGER/DIRETTORI
# ==========================================

@router.post("/departments/{dept_id}/managers")
async def add_dept_manager(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_id: int = Query(..., description="ID utente da assegnare"),
):
    """Admin assegna un manager a un dipartimento"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin puo' assegnare manager")
    await ensure_tables(db)

    dept = await db.execute(text("SELECT id, code FROM job_departments WHERE id = :did"), {"did": dept_id})
    dept_row = dept.mappings().first()
    if not dept_row:
        raise HTTPException(status_code=404, detail="Dipartimento non trovato")

    try:
        await db.execute(text("""
            INSERT INTO job_dept_managers (dept_id, dept_code, user_id, assigned_by)
            VALUES (:did, :code, :uid, :by)
        """), {"did": dept_id, "code": dept_row["code"], "uid": user_id, "by": current_user.id})
        await db.commit()
    except Exception:
        raise HTTPException(status_code=409, detail="Manager gia' assegnato")

    return {"message": "Manager assegnato"}


@router.delete("/departments/{dept_id}/managers/{user_id}")
async def remove_dept_manager(
    dept_id: int, user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin rimuove un manager da un dipartimento"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    await ensure_tables(db)
    await db.execute(text(
        "DELETE FROM job_dept_managers WHERE dept_id = :did AND user_id = :uid"
    ), {"did": dept_id, "uid": user_id})
    await db.commit()
    return {"message": "Manager rimosso"}


@router.get("/departments/{dept_id}/managers")
async def get_dept_managers(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Vedi i manager assegnati a un dipartimento"""
    await ensure_tables(db)
    result = await db.execute(text("""
        SELECT jdm.id, jdm.user_id, jdm.created_at, u.game_name, u.email, u.sector
        FROM job_dept_managers jdm
        JOIN users u ON jdm.user_id = u.id
        WHERE jdm.dept_id = :did
        ORDER BY jdm.created_at ASC
    """), {"did": dept_id})
    return [{
        "id": r["id"], "user_id": r["user_id"],
        "game_name": r["game_name"], "email": r["email"],
        "sector": r["sector"].value if hasattr(r["sector"], 'value') else str(r["sector"]),
        "assigned_at": str(r["created_at"]) if r["created_at"] else None
    } for r in result.mappings().all()]


@router.get("/users/search")
async def search_users_for_manager(
    q: str = Query("", min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin cerca utenti per assegnarli come manager"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Solo admin")
    result = await db.execute(text("""
        SELECT id, game_name, email, sector FROM users
        WHERE (game_name LIKE :q OR email LIKE :q) AND sector != 'CIVIL'
        LIMIT 10
    """), {"q": f"%{q}%"})
    return [{
        "id": r["id"], "game_name": r["game_name"], "email": r["email"],
        "sector": r["sector"].value if hasattr(r["sector"], 'value') else str(r["sector"]),
    } for r in result.mappings().all()]


# ==========================================
# STAFF DIPARTIMENTO - GESTIONE BANDI
# ==========================================

@router.post("/postings/create")
async def create_posting(
    data: CreatePostingRequest,
    dept_code: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff del dipartimento crea un bando"""
    await ensure_tables(db)
    if not await _is_dept_director(current_user, dept_code, db):
        raise HTTPException(status_code=403, detail="Solo i direttori del dipartimento possono creare bandi")

    dept = await db.execute(text(
        "SELECT * FROM job_departments WHERE code = :code AND active = TRUE"
    ), {"code": dept_code.upper()})
    dept_row = dept.mappings().first()
    if not dept_row:
        raise HTTPException(status_code=404, detail="Dipartimento non trovato o disattivato")

    result = await db.execute(text("""
        INSERT INTO job_postings (dept_id, dept_code, title, description, requirements, salary_range, max_slots, location, priority, created_by, creator_name)
        VALUES (:did, :dcode, :title, :desc, :req, :salary, :slots, :loc, :prio, :uid, :uname)
    """), {
        "did": dept_row["id"], "dcode": dept_code.upper(),
        "title": data.title, "desc": data.description,
        "req": data.requirements, "salary": data.salary_range,
        "slots": data.max_slots, "loc": data.location,
        "prio": data.priority, "uid": current_user.id,
        "uname": current_user.game_name or current_user.email,
    })
    await db.commit()
    return {"id": result.lastrowid, "title": data.title, "department": dept_row["name"], "message": "Bando creato"}


@router.get("/postings/my-dept")
async def get_my_dept_postings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Direttore vede i bandi dei dipartimenti che gestisce"""
    await ensure_tables(db)
    sector = _get_sector(current_user)

    if _is_admin(current_user):
        query = "SELECT jp.*, jd.name as dept_name, jd.color as dept_color FROM job_postings jp JOIN job_departments jd ON jp.dept_id = jd.id ORDER BY jp.created_at DESC"
        result = await db.execute(text(query))
    else:
        # Trova i codici dipartimento che questo utente puo' gestire
        # 1. Stesso settore con grado alto o sector chief
        managed_codes = set()
        grade = user_grade_int(current_user)
        if grade >= DIRECTOR_GRADE_THRESHOLD or getattr(current_user, 'is_sector_chief', False):
            managed_codes.add(sector.upper())

        # 2. Assegnazioni manuali
        manual = await db.execute(text(
            "SELECT dept_code FROM job_dept_managers WHERE user_id = :uid"
        ), {"uid": current_user.id})
        for row in manual.mappings().all():
            managed_codes.add(row["dept_code"])

        if not managed_codes:
            return []

        codes_str = ", ".join([f"'{c}'" for c in managed_codes])
        result = await db.execute(text(f"""
            SELECT jp.*, jd.name as dept_name, jd.color as dept_color
            FROM job_postings jp JOIN job_departments jd ON jp.dept_id = jd.id
            WHERE jp.dept_code IN ({codes_str}) ORDER BY jp.created_at DESC
        """))

    postings = []
    for row in result.mappings().all():
        app_count = await db.execute(text(
            "SELECT COUNT(*) FROM job_applications WHERE posting_id = :pid"
        ), {"pid": row["id"]})
        pending = await db.execute(text(
            "SELECT COUNT(*) FROM job_applications WHERE posting_id = :pid AND status = 'pending'"
        ), {"pid": row["id"]})
        postings.append({
            "id": row["id"], "title": row["title"], "dept_code": row["dept_code"],
            "dept_name": row["dept_name"], "dept_color": row["dept_color"],
            "description": row["description"], "requirements": row["requirements"],
            "salary_range": row["salary_range"], "max_slots": row["max_slots"],
            "filled_slots": row["filled_slots"], "location": row["location"],
            "priority": row["priority"], "status": row["status"],
            "creator_name": row["creator_name"],
            "total_applications": app_count.scalar(),
            "pending_applications": pending.scalar(),
            "created_at": str(row["created_at"]) if row["created_at"] else None,
        })
    return postings


@router.put("/postings/{posting_id}")
async def update_posting(
    posting_id: int, data: UpdatePostingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff modifica un bando del proprio dipartimento"""
    await ensure_tables(db)
    posting = await db.execute(text("SELECT dept_code FROM job_postings WHERE id = :pid"), {"pid": posting_id})
    p = posting.mappings().first()
    if not p:
        raise HTTPException(status_code=404, detail="Bando non trovato")
    if not await _is_dept_director(current_user, p["dept_code"], db):
        raise HTTPException(status_code=403, detail="Non puoi modificare bandi di altri dipartimenti")

    updates, params = [], {"pid": posting_id}
    for field in ["title", "description", "requirements", "salary_range", "max_slots", "location", "priority", "status"]:
        v = getattr(data, field, None)
        if v is not None:
            updates.append(f"{field} = :{field}")
            params[field] = v
    if updates:
        await db.execute(text(f"UPDATE job_postings SET {', '.join(updates)} WHERE id = :pid"), params)
        await db.commit()
    return {"message": "Bando aggiornato"}


@router.delete("/postings/{posting_id}")
async def delete_posting(
    posting_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff elimina un bando del proprio dipartimento"""
    await ensure_tables(db)
    posting = await db.execute(text("SELECT dept_code FROM job_postings WHERE id = :pid"), {"pid": posting_id})
    p = posting.mappings().first()
    if not p:
        raise HTTPException(status_code=404, detail="Bando non trovato")
    if not await _is_dept_director(current_user, p["dept_code"], db):
        raise HTTPException(status_code=403, detail="Non puoi eliminare bandi di altri dipartimenti")
    await db.execute(text("DELETE FROM job_postings WHERE id = :pid"), {"pid": posting_id})
    await db.commit()
    return {"message": "Bando eliminato"}


# ==========================================
# STAFF - GESTIONE CANDIDATURE
# ==========================================

@router.get("/postings/{posting_id}/applications")
async def get_posting_applications(
    posting_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff vede le candidature per un bando del proprio dipartimento"""
    await ensure_tables(db)
    posting = await db.execute(text("SELECT dept_code, title FROM job_postings WHERE id = :pid"), {"pid": posting_id})
    p = posting.mappings().first()
    if not p:
        raise HTTPException(status_code=404, detail="Bando non trovato")
    if not await _is_dept_director(current_user, p["dept_code"], db):
        raise HTTPException(status_code=403, detail="Non hai accesso")

    result = await db.execute(text("""
        SELECT * FROM job_applications WHERE posting_id = :pid ORDER BY created_at DESC
    """), {"pid": posting_id})
    return [{
        "id": r["id"], "game_name": r["game_name"], "motivation": r["motivation"],
        "experience": r["experience"], "availability": r["availability"],
        "custom_fields": r["custom_fields"], "status": r["status"],
        "reviewer_name": r["reviewer_name"], "reviewer_notes": r["reviewer_notes"],
        "interview_date": str(r["interview_date"]) if r["interview_date"] else None,
        "created_at": str(r["created_at"]) if r["created_at"] else None,
    } for r in result.mappings().all()]


@router.put("/applications/{app_id}/review")
async def review_application(
    app_id: int, data: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff gestisce una candidatura del proprio dipartimento"""
    await ensure_tables(db)
    app_row = await db.execute(text("SELECT * FROM job_applications WHERE id = :aid"), {"aid": app_id})
    app = app_row.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidatura non trovata")
    if not await _is_dept_director(current_user, app["dept_code"], db):
        raise HTTPException(status_code=403, detail="Non puoi gestire candidature di altri dipartimenti")

    valid = ["reviewing", "interview", "accepted", "rejected"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Stato non valido: {', '.join(valid)}")

    q = """UPDATE job_applications SET status = :st, reviewer_id = :rid, reviewer_name = :rname,
           reviewer_notes = :notes, reviewed_at = NOW()"""
    params = {"aid": app_id, "st": data.status, "rid": current_user.id,
              "rname": current_user.game_name or current_user.email, "notes": data.notes}
    if data.interview_date:
        q += ", interview_date = :idate"
        params["idate"] = data.interview_date
    q += " WHERE id = :aid"
    await db.execute(text(q), params)

    if data.status == "accepted":
        await db.execute(text("UPDATE job_postings SET filled_slots = filled_slots + 1 WHERE id = :pid"), {"pid": app["posting_id"]})

    await db.commit()

    labels = {"reviewing": "In Revisione", "interview": "Colloquio", "accepted": "ACCETTATA", "rejected": "Non Accettata"}
    try:
        posting = await db.execute(text("SELECT title, dept_code FROM job_postings WHERE id = :pid"), {"pid": app["posting_id"]})
        p = posting.mappings().first()
        dept = await db.execute(text("SELECT name FROM job_departments WHERE code = :code"), {"code": p["dept_code"]})
        d = dept.mappings().first()
        await queue_notification_for_user(
            db, app["user_id"],
            title=f"Candidatura {labels.get(data.status, data.status)}",
            message=f"{d['name'] if d else p['dept_code']} - {p['title']}: {labels.get(data.status, '')}",
            icon="fa-solid fa-briefcase",
            color="#adff2f" if data.status == "accepted" else "#f59e0b"
        )
    except Exception:
        pass

    return {"message": f"Candidatura {labels.get(data.status, 'aggiornata')}", "status": data.status}


@router.get("/dept-stats")
async def get_dept_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche per lo staff del proprio dipartimento"""
    await ensure_tables(db)
    sector = _get_sector(current_user)
    is_admin = _is_admin(current_user)

    if is_admin:
        cond, params = "", {}
    else:
        cond, params = "WHERE dept_code = :sector", {"sector": sector.upper()}

    postings = await db.execute(text(f"SELECT COUNT(*) FROM job_postings {cond}"), params)
    open_p = await db.execute(text(f"SELECT COUNT(*) FROM job_postings {'WHERE status = ' + repr('open') + ' AND dept_code = :sector' if not is_admin else 'WHERE status = ' + repr('open')}"), params if not is_admin else {})
    apps = await db.execute(text(f"SELECT COUNT(*) FROM job_applications {cond}"), params)
    pending = await db.execute(text(f"SELECT COUNT(*) FROM job_applications {('WHERE status = ' + repr('pending') + ' AND dept_code = :sector') if not is_admin else ('WHERE status = ' + repr('pending'))}"), params if not is_admin else {})
    accepted = await db.execute(text(f"SELECT COUNT(*) FROM job_applications {('WHERE status = ' + repr('accepted') + ' AND dept_code = :sector') if not is_admin else ('WHERE status = ' + repr('accepted'))}"), params if not is_admin else {})

    return {
        "total_postings": postings.scalar(), "open_postings": open_p.scalar(),
        "total_applications": apps.scalar(), "pending_applications": pending.scalar(),
        "accepted_applications": accepted.scalar()
    }


# ==========================================
# CITIZEN - BANDI APERTI E CANDIDATURE
# ==========================================

@router.get("/open")
async def get_open_postings(
    dept_code: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista bandi aperti con info dipartimento"""
    await ensure_tables(db)
    query = """SELECT jp.*, jd.name as dept_name, jd.color as dept_color, jd.icon as dept_icon, jd.form_fields
               FROM job_postings jp JOIN job_departments jd ON jp.dept_id = jd.id
               WHERE jp.status = 'open' AND jp.filled_slots < jp.max_slots AND jd.active = TRUE"""
    params = {}
    if dept_code:
        query += " AND jp.dept_code = :dept"
        params["dept"] = dept_code.upper()
    query += " ORDER BY FIELD(jp.priority, 'urgent', 'high', 'normal'), jp.created_at DESC"

    result = await db.execute(text(query), params)
    postings = []
    for row in result.mappings().all():
        applied = await db.execute(text(
            "SELECT id, status FROM job_applications WHERE posting_id = :pid AND user_id = :uid"
        ), {"pid": row["id"], "uid": current_user.id})
        user_app = applied.mappings().first()
        postings.append({
            "id": row["id"], "title": row["title"], "dept_code": row["dept_code"],
            "dept_name": row["dept_name"], "dept_color": row["dept_color"], "dept_icon": row["dept_icon"],
            "description": row["description"], "requirements": row["requirements"],
            "salary_range": row["salary_range"], "max_slots": row["max_slots"],
            "filled_slots": row["filled_slots"],
            "available_slots": row["max_slots"] - row["filled_slots"],
            "location": row["location"], "priority": row["priority"],
            "creator_name": row["creator_name"], "form_fields": row["form_fields"],
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "user_applied": user_app is not None,
            "user_application_status": user_app["status"] if user_app else None,
        })
    return postings


@router.post("/postings/{posting_id}/apply")
async def apply_to_posting(
    posting_id: int, data: ApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cittadino si candida"""
    await ensure_tables(db)
    posting = await db.execute(text("""
        SELECT jp.*, jd.name as dept_name FROM job_postings jp
        JOIN job_departments jd ON jp.dept_id = jd.id
        WHERE jp.id = :pid AND jp.status = 'open'
    """), {"pid": posting_id})
    p = posting.mappings().first()
    if not p:
        raise HTTPException(status_code=404, detail="Bando non trovato o chiuso")
    if p["filled_slots"] >= p["max_slots"]:
        raise HTTPException(status_code=400, detail="Posti esauriti")

    existing = await db.execute(text(
        "SELECT id FROM job_applications WHERE posting_id = :pid AND user_id = :uid AND status NOT IN ('rejected')"
    ), {"pid": posting_id, "uid": current_user.id})
    if existing.mappings().first():
        raise HTTPException(status_code=400, detail="Hai gia' una candidatura attiva per questo bando")

    result = await db.execute(text("""
        INSERT INTO job_applications (posting_id, dept_id, dept_code, user_id, game_name, motivation, experience, availability, custom_fields)
        VALUES (:pid, :did, :dcode, :uid, :name, :motiv, :exp, :avail, :custom)
    """), {
        "pid": posting_id, "did": p["dept_id"], "dcode": p["dept_code"],
        "uid": current_user.id, "name": current_user.game_name or current_user.email,
        "motiv": data.motivation, "exp": data.experience,
        "avail": data.availability, "custom": data.custom_fields,
    })
    await db.commit()
    return {"id": result.lastrowid, "job_title": p["title"], "department": p["dept_name"], "status": "pending", "message": "Candidatura inviata"}


@router.get("/my-applications")
async def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cittadino vede le sue candidature"""
    await ensure_tables(db)
    result = await db.execute(text("""
        SELECT ja.*, jp.title as job_title, jd.name as dept_name, jd.color as dept_color
        FROM job_applications ja
        JOIN job_postings jp ON ja.posting_id = jp.id
        JOIN job_departments jd ON ja.dept_id = jd.id
        WHERE ja.user_id = :uid ORDER BY ja.created_at DESC
    """), {"uid": current_user.id})
    return [{
        "id": r["id"], "posting_id": r["posting_id"], "job_title": r["job_title"],
        "dept_name": r["dept_name"], "dept_color": r["dept_color"], "dept_code": r["dept_code"],
        "motivation": r["motivation"], "status": r["status"],
        "reviewer_name": r["reviewer_name"], "reviewer_notes": r["reviewer_notes"],
        "interview_date": str(r["interview_date"]) if r["interview_date"] else None,
        "created_at": str(r["created_at"]) if r["created_at"] else None,
    } for r in result.mappings().all()]
