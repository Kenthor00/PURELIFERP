"""
PURE LIFE OS - RBAC Middleware
Sistema di autorizzazione ibrido Job+Grado+Override
"""
import logging
from datetime import datetime, timezone
from functools import wraps
from typing import Optional, List, Set
from fastapi import HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from database import get_db
from models import (
    User, Job, JobGrade, PermissionRecord, JobGradePermission,
    UserPermissionOverride, StaffRole, UserStaffRole, AuditLog, AuditAction
)
from auth import get_current_user

logger = logging.getLogger(__name__)


class RBACService:
    """Servizio RBAC per verifica permessi"""
    
    @staticmethod
    async def get_user_permissions(db: AsyncSession, user: User) -> Set[str]:
        """
        Ottiene tutti i permessi dell'utente:
        1. Permessi dal grado del job
        2. Override attivi (grant/revoke)
        3. Staff role bypass
        """
        permissions = set()
        
        # 1. Verifica staff role con bypass
        staff_result = await db.execute(
            select(UserStaffRole)
            .options(selectinload(UserStaffRole.staff_role))
            .where(
                and_(
                    UserStaffRole.user_id == user.id,
                    UserStaffRole.is_active == True,
                    or_(
                        UserStaffRole.expires_at.is_(None),
                        UserStaffRole.expires_at > datetime.now(timezone.utc)
                    )
                )
            )
        )
        staff_roles = staff_result.scalars().all()
        
        # Se ha un ruolo staff con bypass, ha tutti i permessi
        for sr in staff_roles:
            if sr.staff_role and sr.staff_role.bypass_job_permissions:
                # Carica tutti i permessi
                all_perms = await db.execute(select(Permission.code))
                return set(all_perms.scalars().all())
        
        # 2. Permessi dal job grade
        if user.job_grade_id:
            grade_perms = await db.execute(
                select(Permission.code)
                .join(JobGradePermission, JobGradePermission.permission_id == Permission.id)
                .where(JobGradePermission.job_grade_id == user.job_grade_id)
            )
            permissions.update(grade_perms.scalars().all())
        
        # 3. Override utente attivi
        overrides = await db.execute(
            select(UserPermissionOverride)
            .options(selectinload(UserPermissionOverride.permission))
            .where(
                and_(
                    UserPermissionOverride.user_id == user.id,
                    UserPermissionOverride.is_active == True,
                    or_(
                        UserPermissionOverride.expires_at.is_(None),
                        UserPermissionOverride.expires_at > datetime.now(timezone.utc)
                    )
                )
            )
        )
        
        for override in overrides.scalars().all():
            perm_code = override.permission.code
            if override.override_type == 'grant':
                permissions.add(perm_code)
            elif override.override_type == 'revoke':
                permissions.discard(perm_code)
        
        return permissions
    
    @staticmethod
    async def has_permission(db: AsyncSession, user: User, permission_code: str) -> bool:
        """Verifica se l'utente ha un permesso specifico"""
        permissions = await RBACService.get_user_permissions(db, user)
        return permission_code in permissions
    
    @staticmethod
    async def has_any_permission(db: AsyncSession, user: User, permission_codes: List[str]) -> bool:
        """Verifica se l'utente ha almeno uno dei permessi"""
        permissions = await RBACService.get_user_permissions(db, user)
        return bool(permissions.intersection(set(permission_codes)))
    
    @staticmethod
    async def has_all_permissions(db: AsyncSession, user: User, permission_codes: List[str]) -> bool:
        """Verifica se l'utente ha tutti i permessi"""
        permissions = await RBACService.get_user_permissions(db, user)
        return set(permission_codes).issubset(permissions)
    
    @staticmethod
    async def get_user_staff_level(db: AsyncSession, user: User) -> int:
        """Ritorna il livello staff più alto dell'utente (0 se non staff)"""
        result = await db.execute(
            select(StaffRole.level)
            .join(UserStaffRole, UserStaffRole.staff_role_id == StaffRole.id)
            .where(
                and_(
                    UserStaffRole.user_id == user.id,
                    UserStaffRole.is_active == True,
                    or_(
                        UserStaffRole.expires_at.is_(None),
                        UserStaffRole.expires_at > datetime.now(timezone.utc)
                    )
                )
            )
            .order_by(StaffRole.level.desc())
            .limit(1)
        )
        level = result.scalar()
        return level or 0
    
    @staticmethod
    async def is_staff(db: AsyncSession, user: User) -> bool:
        """Verifica se l'utente è staff"""
        level = await RBACService.get_user_staff_level(db, user)
        return level > 0
    
    @staticmethod
    async def is_admin(db: AsyncSession, user: User) -> bool:
        """Verifica se l'utente è admin (level >= 2)"""
        level = await RBACService.get_user_staff_level(db, user)
        return level >= 2
    
    @staticmethod
    async def is_superadmin(db: AsyncSession, user: User) -> bool:
        """Verifica se l'utente è superadmin (level >= 3)"""
        level = await RBACService.get_user_staff_level(db, user)
        return level >= 3
    
    @staticmethod
    async def can_manage_user(db: AsyncSession, manager: User, target: User) -> bool:
        """Verifica se manager può gestire target"""
        manager_level = await RBACService.get_user_staff_level(db, manager)
        target_level = await RBACService.get_user_staff_level(db, target)
        
        # Superadmin può gestire tutti
        if manager_level >= 3:
            return True
        
        # Admin può gestire non-staff e moderatori
        if manager_level >= 2:
            return target_level < 2
        
        # Moderatori non possono gestire altri staff
        if manager_level >= 1:
            return target_level == 0
        
        # Stesso job e grado superiore
        if manager.job_id and manager.job_id == target.job_id:
            if manager.job_grade_id and target.job_grade_id:
                # Carica i gradi
                manager_grade = await db.get(JobGrade, manager.job_grade_id)
                target_grade = await db.get(JobGrade, target.job_grade_id)
                if manager_grade and target_grade:
                    return manager_grade.grade_level > target_grade.grade_level and manager_grade.is_supervisor
        
        return False


def require_permission(*permission_codes: str, require_all: bool = False):
    """
    Decorator per richiedere permessi specifici.
    
    Usage:
        @require_permission('lspd.case.create')
        async def create_case(...)
        
        @require_permission('lspd.case.edit', 'lspd.case.delete', require_all=True)
        async def manage_case(...)
    """
    async def check_permissions(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        if require_all:
            has_perm = await RBACService.has_all_permissions(db, current_user, list(permission_codes))
        else:
            has_perm = await RBACService.has_any_permission(db, current_user, list(permission_codes))
        
        if not has_perm:
            logger.warning(f"Accesso negato: user={current_user.id} permissions={permission_codes}")
            raise HTTPException(
                status_code=403,
                detail=f"Permesso richiesto: {', '.join(permission_codes)}"
            )
        
        return current_user
    
    return check_permissions


def require_staff(min_level: int = 1):
    """
    Decorator per richiedere ruolo staff.
    
    Usage:
        @require_staff()  # Qualsiasi staff
        @require_staff(min_level=2)  # Admin+
        @require_staff(min_level=3)  # Superadmin
    """
    async def check_staff(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        level = await RBACService.get_user_staff_level(db, current_user)
        
        if level < min_level:
            level_names = {1: "Moderatore", 2: "Amministratore", 3: "Super Admin"}
            required = level_names.get(min_level, f"Staff livello {min_level}")
            raise HTTPException(
                status_code=403,
                detail=f"Ruolo richiesto: {required} o superiore"
            )
        
        return current_user
    
    return check_staff


async def log_rbac_action(
    db: AsyncSession,
    action: AuditAction,
    user: User,
    target_user_id: Optional[int] = None,
    entity_type: str = None,
    entity_id: int = None,
    description: str = None,
    old_value: dict = None,
    new_value: dict = None,
    reason: str = None
):
    """Log azione RBAC con old/new values"""
    metadata = {}
    if old_value:
        metadata['old'] = old_value
    if new_value:
        metadata['new'] = new_value
    if reason:
        metadata['reason'] = reason
    if target_user_id:
        metadata['target_user_id'] = target_user_id
    
    audit = AuditLog(
        action=action,
        user_id=user.id,
        user_email=user.email,
        game_name=user.game_name,
        sector=user.sector,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        metadata=metadata
    )
    
    db.add(audit)
    await db.commit()
