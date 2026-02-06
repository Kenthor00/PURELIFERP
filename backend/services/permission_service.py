"""
PURE LIFE OS - Permission Service
Sistema di permessi multi-livello basato su settore e grado
"""
from functools import wraps
from typing import List, Optional, Callable
from fastapi import HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Sector, Permission, PERMISSION_MATRIX, SECTOR_GRADES
from database import get_db

import logging

logger = logging.getLogger(__name__)


class PermissionService:
    """Servizio per la gestione dei permessi"""
    
    @staticmethod
    def get_user_permissions(user: User) -> List[Permission]:
        """Ottiene la lista di permessi per un utente"""
        if user.sector == Sector.ADMIN:
            # Admin ha tutti i permessi
            return list(Permission)
        
        sector_perms = PERMISSION_MATRIX.get(user.sector, {})
        return sector_perms.get(user.hierarchy_level, [])
    
    @staticmethod
    def has_permission(user: User, permission: Permission) -> bool:
        """Verifica se un utente ha un permesso specifico"""
        if user.sector == Sector.ADMIN:
            return True
        
        user_permissions = PermissionService.get_user_permissions(user)
        return permission in user_permissions
    
    @staticmethod
    def can_view_sector(user: User, target_sector: Sector) -> bool:
        """Verifica se un utente può vedere un settore"""
        if user.sector == Sector.ADMIN:
            return True
        
        # Può vedere il proprio settore
        if user.sector == target_sector:
            return True
        
        # Dispatch può vedere LSPD e EMS
        if user.sector == Sector.DISPATCH:
            return target_sector in [Sector.LSPD, Sector.EMS]
        
        # GOV può vedere LSPD (per casi legali)
        if user.sector == Sector.GOV:
            return target_sector == Sector.LSPD
        
        return False
    
    @staticmethod
    def can_manage_user(manager: User, target: User) -> bool:
        """Verifica se un manager può gestire un utente target"""
        # Admin può gestire tutti tranne altri admin di livello superiore
        if manager.sector == Sector.ADMIN:
            if target.sector == Sector.ADMIN:
                return manager.hierarchy_level > target.hierarchy_level
            return True
        
        # Non può gestire admin
        if target.sector == Sector.ADMIN:
            return False
        
        # Può gestire solo stesso settore
        if manager.sector != target.sector:
            return False
        
        # Deve avere livello superiore
        if manager.hierarchy_level <= target.hierarchy_level:
            return False
        
        # Verifica permesso di gestione settore
        manage_perm_map = {
            Sector.LSPD: Permission.MANAGE_LSPD_USERS,
            Sector.EMS: Permission.MANAGE_EMS_USERS,
            Sector.GOV: Permission.MANAGE_GOV_USERS,
            Sector.NEWS: Permission.MANAGE_NEWS_USERS,
            Sector.DISPATCH: Permission.MANAGE_DISPATCH_USERS,
        }
        
        required_perm = manage_perm_map.get(manager.sector)
        if not required_perm:
            return False
        
        return PermissionService.has_permission(manager, required_perm)
    
    @staticmethod
    def get_available_grades(sector: Sector) -> dict:
        """Ottiene i gradi disponibili per un settore"""
        return SECTOR_GRADES.get(sector, {})
    
    @staticmethod
    def get_grade_name(sector: Sector, level: int) -> str:
        """Ottiene il nome del grado per un livello"""
        sector_grades = SECTOR_GRADES.get(sector, {})
        return sector_grades.get(level, "Sconosciuto")
    
    @staticmethod
    def get_max_manageable_level(user: User) -> int:
        """Ottiene il livello massimo che un utente può gestire"""
        if user.sector == Sector.ADMIN:
            return 10
        
        # Può gestire fino a un livello sotto il proprio
        return max(0, user.hierarchy_level - 1)


def require_permission(*permissions: Permission):
    """
    Decorator per proteggere endpoint con permessi specifici.
    Richiede almeno uno dei permessi specificati.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Trova l'utente nei kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Autenticazione richiesta")
            
            # Verifica game_name
            if current_user.needs_game_name:
                raise HTTPException(
                    status_code=403, 
                    detail="Devi impostare il tuo nome in game prima di procedere"
                )
            
            # Verifica permessi
            has_any = any(
                PermissionService.has_permission(current_user, perm)
                for perm in permissions
            )
            
            if not has_any:
                logger.warning(
                    f"Permesso negato: user={current_user.email}, "
                    f"sector={current_user.sector.value}, "
                    f"level={current_user.hierarchy_level}, "
                    f"required={[p.value for p in permissions]}"
                )
                raise HTTPException(
                    status_code=403, 
                    detail="Non hai i permessi necessari per questa azione"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_sector(*sectors: Sector):
    """
    Decorator per limitare endpoint a settori specifici.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Autenticazione richiesta")
            
            # Admin ha sempre accesso
            if current_user.sector == Sector.ADMIN:
                return await func(*args, **kwargs)
            
            if current_user.sector not in sectors:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Accesso riservato a: {', '.join(s.value for s in sectors)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_hierarchy_level(min_level: int):
    """
    Decorator per richiedere un livello gerarchico minimo.
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Autenticazione richiesta")
            
            # Admin ha sempre accesso
            if current_user.sector == Sector.ADMIN:
                return await func(*args, **kwargs)
            
            if current_user.hierarchy_level < min_level:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Richiesto livello gerarchico minimo: {min_level}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Singleton instance
permission_service = PermissionService()
