"""
PURE LIFE OS - Admin Router (Minimal)
Endpoint minimali per status check
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import logging

from database import get_db
from models import User

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


@router.get("/seed/status")
async def get_seed_status(db: AsyncSession = Depends(get_db)):
    """
    Controlla lo stato del seed del database.
    Endpoint pubblico usato dal frontend per verificare se il DB è inizializzato.
    """
    try:
        # Check users count
        result = await db.execute(select(func.count(User.id)))
        users_count = result.scalar() or 0
        
        return {
            "db_connected": True,
            "users_count": users_count,
            "needs_seed": users_count == 0,
            "seed_key_accepted": users_count == 0
        }
    except Exception as e:
        logger.error(f"Errore checking seed status: {e}")
        return {
            "db_connected": False,
            "users_count": 0,
            "needs_seed": False,
            "seed_key_accepted": False,
            "error": str(e)
        }
