"""
PURE LIFE OS - Admin RBAC Router
Gestione Lavori, Gradi, Permessi, Utenti
UI 100% in italiano
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from database import get_db
from models import (
    User, Job, JobGrade, Permission, JobGradePermission,
    UserPermissionOverride, StaffRole, UserStaffRole, AuditLog, AuditAction, Sector
)
from auth import get_current_user, log_audit
from rbac import RBACService, require_staff, require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/rbac", tags=["Admin RBAC"])


# ==========================================
# SCHEMAS
# ==========================================

class JobResponse(BaseModel):
    id: int
    code: str
    name: str
    name_short: str
    category: str
    description: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    is_active: bool
    is_whitelisted: bool
    max_employees: Optional[int] = 0
    employee_count: Optional[int] = 0
    grades_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class JobGradeResponse(BaseModel):
    id: int
    job_id: int
    grade_level: int
    code: str
    name: str
    category: Optional[str]
    salary: Optional[int] = 0
    is_boss: Optional[bool] = False
    is_supervisor: Optional[bool] = False
    can_hire: Optional[bool] = False
    can_fire: Optional[bool] = False
    can_promote: Optional[bool] = False
    employee_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    category: str
    is_dangerous: bool
    requires_audit: bool
    
    class Config:
        from_attributes = True


class StaffRoleResponse(BaseModel):
    id: int
    code: str
    name: str
    level: int
    color: Optional[str]
    bypass_job_permissions: bool
    is_active: bool
    
    class Config:
        from_attributes = True


class UserRBACResponse(BaseModel):
    id: int
    email: str
    game_name: Optional[str]
    job: Optional[JobResponse]
    job_grade: Optional[JobGradeResponse]
    staff_roles: List[StaffRoleResponse] = []
    permissions: List[str] = []
    overrides: List[dict] = []
    
    class Config:
        from_attributes = True


class AssignJobRequest(BaseModel):
    user_id: int
    job_id: int
    grade_id: int
    reason: str


class AssignStaffRoleRequest(BaseModel):
    user_id: int
    staff_role_id: int
    reason: str
    expires_at: Optional[datetime] = None


class PermissionOverrideRequest(BaseModel):
    user_id: int
    permission_id: int
    override_type: str  # 'grant' o 'revoke'
    reason: str
    expires_at: Optional[datetime] = None


class GradePermissionRequest(BaseModel):
    job_grade_id: int
    permission_ids: List[int]
    reason: str


class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_email: Optional[str]
    game_name: Optional[str]
    sector: Optional[str]
    entity_type: Optional[str]
    entity_id: Optional[int]
    description: Optional[str]
    metadata: Optional[dict]
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ==========================================
# LAVORI (JOBS)
# ==========================================

@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(
    category: Optional[str] = None,
    include_inactive: bool = False,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista lavori con conteggi"""
    query = select(Job)
    
    if category:
        query = query.where(Job.category == category)
    if not include_inactive:
        query = query.where(Job.is_active == True)
    
    result = await db.execute(query.order_by(Job.category, Job.name))
    jobs = result.scalars().all()
    
    # Aggiungi conteggi
    response = []
    for job in jobs:
        # Conta dipendenti
        emp_count = await db.execute(
            select(func.count(User.id)).where(User.job_id == job.id)
        )
        # Conta gradi
        grade_count = await db.execute(
            select(func.count(JobGrade.id)).where(JobGrade.job_id == job.id)
        )
        
        job_dict = {
            "id": job.id,
            "code": job.code,
            "name": job.name,
            "name_short": job.name_short,
            "category": job.category,
            "description": job.description,
            "icon": job.icon,
            "color": job.color,
            "is_active": job.is_active,
            "is_whitelisted": job.is_whitelisted,
            "max_employees": job.max_employees,
            "employee_count": emp_count.scalar() or 0,
            "grades_count": grade_count.scalar() or 0
        }
        response.append(job_dict)
    
    return response


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio lavoro"""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return job


@router.get("/jobs/{job_id}/grades", response_model=List[JobGradeResponse])
async def list_job_grades(
    job_id: int,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista gradi di un lavoro"""
    result = await db.execute(
        select(JobGrade)
        .where(JobGrade.job_id == job_id)
        .order_by(JobGrade.grade_level.desc())
    )
    grades = result.scalars().all()
    
    # Aggiungi conteggio dipendenti per grado
    response = []
    for grade in grades:
        emp_count = await db.execute(
            select(func.count(User.id)).where(User.job_grade_id == grade.id)
        )
        
        grade_dict = {
            "id": grade.id,
            "job_id": grade.job_id,
            "grade_level": grade.grade_level,
            "code": grade.code,
            "name": grade.name,
            "category": grade.category,
            "salary": grade.salary,
            "is_boss": grade.is_boss,
            "is_supervisor": grade.is_supervisor,
            "can_hire": grade.can_hire,
            "can_fire": grade.can_fire,
            "can_promote": grade.can_promote,
            "employee_count": emp_count.scalar() or 0
        }
        response.append(grade_dict)
    
    return response


# ==========================================
# PERMESSI
# ==========================================

@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    category: Optional[str] = None,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista permessi disponibili"""
    query = select(Permission)
    if category:
        query = query.where(Permission.category == category)
    
    result = await db.execute(query.order_by(Permission.category, Permission.name))
    return result.scalars().all()


@router.get("/permissions/categories")
async def list_permission_categories(
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista categorie permessi"""
    result = await db.execute(
        select(Permission.category).distinct().order_by(Permission.category)
    )
    categories = result.scalars().all()
    
    # Traduzioni italiane
    translations = {
        "lspd": "LSPD - Polizia",
        "ems": "EMS - Sanitario",
        "justice": "Giustizia",
        "news": "News/Media",
        "dispatch": "Dispatch",
        "admin": "Amministrazione",
        "system": "Sistema"
    }
    
    return [{"code": c, "name": translations.get(c, c.title())} for c in categories]


@router.get("/grades/{grade_id}/permissions", response_model=List[PermissionResponse])
async def get_grade_permissions(
    grade_id: int,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista permessi assegnati a un grado"""
    result = await db.execute(
        select(Permission)
        .join(JobGradePermission, JobGradePermission.permission_id == Permission.id)
        .where(JobGradePermission.job_grade_id == grade_id)
    )
    return result.scalars().all()


@router.post("/grades/permissions")
async def set_grade_permissions(
    request: GradePermissionRequest,
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Imposta permessi per un grado (sostituisce esistenti)"""
    grade = await db.get(JobGrade, request.job_grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grado non trovato")
    
    # Salva old value per audit
    old_perms = await db.execute(
        select(Permission.code)
        .join(JobGradePermission, JobGradePermission.permission_id == Permission.id)
        .where(JobGradePermission.job_grade_id == request.job_grade_id)
    )
    old_perm_codes = list(old_perms.scalars().all())
    
    # Rimuovi permessi esistenti
    await db.execute(
        select(JobGradePermission).where(JobGradePermission.job_grade_id == request.job_grade_id)
    )
    from sqlalchemy import delete
    await db.execute(
        delete(JobGradePermission).where(JobGradePermission.job_grade_id == request.job_grade_id)
    )
    
    # Aggiungi nuovi permessi
    new_perm_codes = []
    for perm_id in request.permission_ids:
        perm = await db.get(Permission, perm_id)
        if perm:
            new_perm_codes.append(perm.code)
            db.add(JobGradePermission(
                job_grade_id=request.job_grade_id,
                permission_id=perm_id,
                granted_by=current_user.id
            ))
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db, AuditAction.PERMISSION_CHANGE,
        user=current_user,
        entity_type="job_grade",
        entity_id=request.job_grade_id,
        description=f"Permessi grado {grade.name} aggiornati",
        metadata={
            "old": old_perm_codes,
            "new": new_perm_codes,
            "reason": request.reason
        }
    )
    
    return {"message": "Permessi aggiornati", "count": len(request.permission_ids)}


# ==========================================
# RUOLI STAFF
# ==========================================

@router.get("/staff-roles", response_model=List[StaffRoleResponse])
async def list_staff_roles(
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista ruoli staff"""
    result = await db.execute(
        select(StaffRole).where(StaffRole.is_active == True).order_by(StaffRole.level)
    )
    return result.scalars().all()


@router.post("/staff-roles/assign")
async def assign_staff_role(
    request: AssignStaffRoleRequest,
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Assegna ruolo staff a utente"""
    target_user = await db.get(User, request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    staff_role = await db.get(StaffRole, request.staff_role_id)
    if not staff_role:
        raise HTTPException(status_code=404, detail="Ruolo staff non trovato")
    
    # Verifica permesso (solo superadmin può assegnare admin+)
    manager_level = await RBACService.get_user_staff_level(db, current_user)
    if staff_role.level >= 2 and manager_level < 3:
        raise HTTPException(status_code=403, detail="Solo Super Admin può assegnare ruoli Admin")
    
    # Verifica se già assegnato
    existing = await db.execute(
        select(UserStaffRole).where(
            and_(
                UserStaffRole.user_id == request.user_id,
                UserStaffRole.staff_role_id == request.staff_role_id,
                UserStaffRole.is_active == True
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ruolo già assegnato")
    
    # Assegna ruolo
    assignment = UserStaffRole(
        user_id=request.user_id,
        staff_role_id=request.staff_role_id,
        reason=request.reason,
        assigned_by=current_user.id,
        expires_at=request.expires_at
    )
    db.add(assignment)
    await db.commit()
    
    # Audit
    await log_audit(
        db, AuditAction.ROLE_ASSIGN,
        user=current_user,
        entity_type="user_staff_role",
        entity_id=assignment.id,
        description=f"Assegnato ruolo {staff_role.name} a {target_user.game_name or target_user.email}",
        metadata={
            "target_user_id": target_user.id,
            "staff_role": staff_role.name,
            "reason": request.reason,
            "expires_at": request.expires_at.isoformat() if request.expires_at else None
        }
    )
    
    return {"message": f"Ruolo {staff_role.name} assegnato", "assignment_id": assignment.id}


@router.delete("/staff-roles/revoke/{assignment_id}")
async def revoke_staff_role(
    assignment_id: int,
    reason: str = Query(..., min_length=5),
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Revoca ruolo staff"""
    assignment = await db.execute(
        select(UserStaffRole)
        .options(selectinload(UserStaffRole.staff_role), selectinload(UserStaffRole.user))
        .where(UserStaffRole.id == assignment_id)
    )
    assignment = assignment.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assegnazione non trovata")
    
    # Verifica permesso
    manager_level = await RBACService.get_user_staff_level(db, current_user)
    if assignment.staff_role.level >= 2 and manager_level < 3:
        raise HTTPException(status_code=403, detail="Solo Super Admin può revocare ruoli Admin")
    
    assignment.is_active = False
    assignment.revoked_at = datetime.now(timezone.utc)
    assignment.revoked_by = current_user.id
    
    await db.commit()
    
    # Audit
    await log_audit(
        db, AuditAction.ROLE_REVOKE,
        user=current_user,
        entity_type="user_staff_role",
        entity_id=assignment.id,
        description=f"Revocato ruolo {assignment.staff_role.name} da {assignment.user.game_name or assignment.user.email}",
        metadata={
            "target_user_id": assignment.user_id,
            "staff_role": assignment.staff_role.name,
            "reason": reason
        }
    )
    
    return {"message": "Ruolo revocato"}


# ==========================================
# ASSEGNAZIONE LAVORI
# ==========================================

@router.post("/users/assign-job")
async def assign_user_job(
    request: AssignJobRequest,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Assegna lavoro e grado a utente"""
    target_user = await db.get(User, request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    job = await db.get(Job, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    
    grade = await db.get(JobGrade, request.grade_id)
    if not grade or grade.job_id != job.id:
        raise HTTPException(status_code=404, detail="Grado non valido per questo lavoro")
    
    # Verifica permesso di gestione
    can_manage = await RBACService.can_manage_user(db, current_user, target_user)
    if not can_manage:
        raise HTTPException(status_code=403, detail="Non hai i permessi per gestire questo utente")
    
    # Salva old values
    old_job_name = None
    old_grade_name = None
    if target_user.job_id:
        old_job = await db.get(Job, target_user.job_id)
        old_job_name = old_job.name if old_job else None
    if target_user.job_grade_id:
        old_grade = await db.get(JobGrade, target_user.job_grade_id)
        old_grade_name = old_grade.name if old_grade else None
    
    # Aggiorna utente
    target_user.job_id = job.id
    target_user.job_grade_id = grade.id
    target_user.grade = grade.name
    target_user.hierarchy_level = grade.grade_level
    
    # Mappa job -> sector per retrocompatibilità
    job_to_sector = {
        "lspd": Sector.LSPD,
        "bcso": Sector.LSPD,
        "ems": Sector.EMS,
        "gov": Sector.GOV,
        "justice": Sector.GOV,
        "dispatch": Sector.DISPATCH,
        "weazel": Sector.NEWS
    }
    if job.code in job_to_sector:
        target_user.sector = job_to_sector[job.code]
    else:
        target_user.sector = Sector.CIVIL
    
    await db.commit()
    
    # Audit
    await log_audit(
        db, AuditAction.JOB_CHANGE,
        user=current_user,
        entity_type="user",
        entity_id=target_user.id,
        description=f"Assegnato {job.name} - {grade.name} a {target_user.game_name or target_user.email}",
        metadata={
            "target_user_id": target_user.id,
            "old_job": old_job_name,
            "old_grade": old_grade_name,
            "new_job": job.name,
            "new_grade": grade.name,
            "reason": request.reason
        }
    )
    
    return {"message": f"Assegnato {job.name_short} - {grade.name}"}


# ==========================================
# OVERRIDE PERMESSI UTENTE
# ==========================================

@router.post("/users/permission-override")
async def create_permission_override(
    request: PermissionOverrideRequest,
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Crea override permesso per utente"""
    target_user = await db.get(User, request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    permission = await db.get(Permission, request.permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permesso non trovato")
    
    if request.override_type not in ('grant', 'revoke'):
        raise HTTPException(status_code=400, detail="Tipo override non valido")
    
    # Verifica permessi pericolosi
    if permission.is_dangerous:
        manager_level = await RBACService.get_user_staff_level(db, current_user)
        if manager_level < 3:
            raise HTTPException(status_code=403, detail="Solo Super Admin può gestire permessi pericolosi")
    
    # Crea override
    override = UserPermissionOverride(
        user_id=request.user_id,
        permission_id=request.permission_id,
        override_type=request.override_type,
        reason=request.reason,
        expires_at=request.expires_at,
        granted_by=current_user.id
    )
    db.add(override)
    await db.commit()
    
    # Audit
    action_type = "Concesso" if request.override_type == 'grant' else "Revocato"
    await log_audit(
        db, AuditAction.PERMISSION_CHANGE,
        user=current_user,
        entity_type="user_permission_override",
        entity_id=override.id,
        description=f"{action_type} permesso {permission.name} a {target_user.game_name or target_user.email}",
        metadata={
            "target_user_id": target_user.id,
            "permission": permission.code,
            "override_type": request.override_type,
            "reason": request.reason,
            "expires_at": request.expires_at.isoformat() if request.expires_at else None
        }
    )
    
    return {"message": f"Override creato", "override_id": override.id}


@router.delete("/users/permission-override/{override_id}")
async def revoke_permission_override(
    override_id: int,
    reason: str = Query(..., min_length=5),
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Revoca override permesso"""
    override = await db.execute(
        select(UserPermissionOverride)
        .options(selectinload(UserPermissionOverride.permission), selectinload(UserPermissionOverride.user))
        .where(UserPermissionOverride.id == override_id)
    )
    override = override.scalar_one_or_none()
    
    if not override:
        raise HTTPException(status_code=404, detail="Override non trovato")
    
    override.is_active = False
    override.revoked_at = datetime.now(timezone.utc)
    override.revoked_by = current_user.id
    
    await db.commit()
    
    # Audit
    await log_audit(
        db, AuditAction.PERMISSION_CHANGE,
        user=current_user,
        entity_type="user_permission_override",
        entity_id=override.id,
        description=f"Revocato override {override.permission.name} da {override.user.game_name or override.user.email}",
        metadata={
            "target_user_id": override.user_id,
            "permission": override.permission.code,
            "reason": reason
        }
    )
    
    return {"message": "Override revocato"}


# ==========================================
# GESTIONE UTENTI
# ==========================================

@router.get("/users")
async def list_users_rbac(
    job_id: Optional[int] = None,
    grade_id: Optional[int] = None,
    staff_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista utenti con info RBAC"""
    query = select(User).where(User.is_deleted == False)
    
    if job_id:
        query = query.where(User.job_id == job_id)
    if grade_id:
        query = query.where(User.job_grade_id == grade_id)
    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.game_name.ilike(f"%{search}%")
            )
        )
    
    # Conta totale
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()
    
    # Fetch users
    result = await db.execute(
        query.order_by(User.game_name).offset(offset).limit(limit)
    )
    users = result.scalars().all()
    
    response = []
    for user in users:
        # Carica job e grade
        job = await db.get(Job, user.job_id) if user.job_id else None
        grade = await db.get(JobGrade, user.job_grade_id) if user.job_grade_id else None
        
        # Carica staff roles
        staff_result = await db.execute(
            select(StaffRole)
            .join(UserStaffRole, UserStaffRole.staff_role_id == StaffRole.id)
            .where(
                and_(
                    UserStaffRole.user_id == user.id,
                    UserStaffRole.is_active == True
                )
            )
        )
        staff_roles = staff_result.scalars().all()
        
        if staff_only and not staff_roles:
            continue
        
        # Carica permessi
        permissions = await RBACService.get_user_permissions(db, user)
        
        # Carica overrides attivi
        overrides_result = await db.execute(
            select(UserPermissionOverride)
            .options(selectinload(UserPermissionOverride.permission))
            .where(
                and_(
                    UserPermissionOverride.user_id == user.id,
                    UserPermissionOverride.is_active == True
                )
            )
        )
        overrides = overrides_result.scalars().all()
        
        user_data = {
            "id": user.id,
            "email": user.email,
            "game_name": user.game_name,
            "is_active": user.is_active,
            "job": {
                "id": job.id,
                "code": job.code,
                "name": job.name,
                "name_short": job.name_short,
                "color": job.color
            } if job else None,
            "job_grade": {
                "id": grade.id,
                "name": grade.name,
                "category": grade.category,
                "grade_level": grade.grade_level
            } if grade else None,
            "staff_roles": [{"id": sr.id, "code": sr.code, "name": sr.name, "level": sr.level, "color": sr.color} for sr in staff_roles],
            "permissions_count": len(permissions),
            "overrides": [
                {
                    "id": o.id,
                    "permission": o.permission.code,
                    "permission_name": o.permission.name,
                    "type": o.override_type,
                    "expires_at": o.expires_at.isoformat() if o.expires_at else None
                }
                for o in overrides
            ]
        }
        response.append(user_data)
    
    return {"users": response, "total": total, "limit": limit, "offset": offset}


@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: int,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista completa permessi utente con origine"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    permissions = await RBACService.get_user_permissions(db, user)
    
    # Dettagli per ogni permesso
    detailed = []
    for perm_code in sorted(permissions):
        perm = await db.execute(
            select(Permission).where(Permission.code == perm_code)
        )
        perm = perm.scalar_one_or_none()
        if perm:
            detailed.append({
                "code": perm.code,
                "name": perm.name,
                "category": perm.category,
                "is_dangerous": perm.is_dangerous
            })
    
    return {"user_id": user_id, "permissions": detailed, "count": len(detailed)}


# ==========================================
# AUDIT LOG
# ==========================================

@router.get("/audit", response_model=List[AuditLogResponse])
async def get_audit_log_full(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Audit log completo con filtri"""
    query = select(AuditLog)
    
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if from_date:
        query = query.where(AuditLog.timestamp >= from_date)
    if to_date:
        query = query.where(AuditLog.timestamp <= to_date)
    
    result = await db.execute(
        query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": log.id,
            "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
            "user_email": log.user_email,
            "game_name": log.game_name,
            "sector": log.sector.value if log.sector and hasattr(log.sector, 'value') else str(log.sector) if log.sector else None,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "metadata": log.metadata,
            "timestamp": log.timestamp
        }
        for log in logs
    ]


@router.get("/audit/actions")
async def get_audit_actions(
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Lista azioni disponibili per filtro"""
    result = await db.execute(
        select(AuditLog.action).distinct()
    )
    actions = result.scalars().all()
    
    # Traduzioni italiane
    translations = {
        "login_success": "Login Riuscito",
        "login_failed": "Login Fallito",
        "logout": "Logout",
        "password_change": "Cambio Password",
        "role_assign": "Assegnazione Ruolo",
        "role_revoke": "Revoca Ruolo",
        "permission_change": "Modifica Permessi",
        "job_change": "Cambio Lavoro",
        "case_create": "Creazione Caso",
        "warrant_create": "Emissione Mandato",
        "warrant_execute": "Esecuzione Mandato",
        "fine_create": "Emissione Multa",
        "appointment_create": "Creazione Appuntamento",
        "appointment_update": "Modifica Appuntamento"
    }
    
    return [
        {"code": a.value if hasattr(a, 'value') else str(a), "name": translations.get(a.value if hasattr(a, 'value') else str(a), str(a))}
        for a in actions
    ]


@router.get("/audit/export")
async def export_audit_log(
    from_date: datetime,
    to_date: datetime,
    format: str = Query("json", enum=["json", "csv"]),
    current_user: User = Depends(require_staff(min_level=2)),
    db: AsyncSession = Depends(get_db)
):
    """Esporta audit log"""
    result = await db.execute(
        select(AuditLog)
        .where(
            and_(
                AuditLog.timestamp >= from_date,
                AuditLog.timestamp <= to_date
            )
        )
        .order_by(AuditLog.timestamp)
    )
    logs = result.scalars().all()
    
    # Log export action
    await log_audit(
        db, AuditAction.AUDIT_EXPORT if hasattr(AuditAction, 'AUDIT_EXPORT') else AuditAction.LOGIN_SUCCESS,
        user=current_user,
        entity_type="audit_log",
        description=f"Esportazione audit log dal {from_date} al {to_date}",
        metadata={"from": from_date.isoformat(), "to": to_date.isoformat(), "count": len(logs), "format": format}
    )
    
    if format == "csv":
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse
        
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Timestamp", "Azione", "Utente", "Nome IG", "Tipo Entità", "ID Entità", "Descrizione"])
        
        for log in logs:
            writer.writerow([
                log.id,
                log.timestamp.isoformat(),
                log.action.value if hasattr(log.action, 'value') else str(log.action),
                log.user_email,
                log.game_name,
                log.entity_type,
                log.entity_id,
                log.description
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_log_{from_date.date()}_{to_date.date()}.csv"}
        )
    
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
            "user_email": log.user_email,
            "game_name": log.game_name,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "metadata": log.metadata
        }
        for log in logs
    ]


# ==========================================
# STATISTICHE
# ==========================================

@router.get("/stats")
async def get_rbac_stats(
    current_user: User = Depends(require_staff(min_level=1)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche sistema RBAC"""
    # Conta jobs attivi
    jobs_count = await db.execute(select(func.count(Job.id)).where(Job.is_active == True))
    
    # Conta utenti per job
    users_by_job = await db.execute(
        select(Job.name_short, func.count(User.id))
        .join(User, User.job_id == Job.id, isouter=True)
        .group_by(Job.id)
        .order_by(func.count(User.id).desc())
    )
    
    # Conta staff
    staff_count = await db.execute(
        select(func.count(func.distinct(UserStaffRole.user_id)))
        .where(UserStaffRole.is_active == True)
    )
    
    # Conta override attivi
    overrides_count = await db.execute(
        select(func.count(UserPermissionOverride.id))
        .where(UserPermissionOverride.is_active == True)
    )
    
    # Audit recenti (ultime 24h)
    from datetime import timedelta
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    audit_24h = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.timestamp >= yesterday)
    )
    
    return {
        "lavori_attivi": jobs_count.scalar() or 0,
        "utenti_per_lavoro": [{"lavoro": row[0], "utenti": row[1]} for row in users_by_job.all()],
        "staff_attivi": staff_count.scalar() or 0,
        "override_attivi": overrides_count.scalar() or 0,
        "azioni_24h": audit_24h.scalar() or 0
    }
