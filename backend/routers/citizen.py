"""
PURE LIFE OS - API Cittadino
Endpoint specifici per i cittadini: multe, mandati, profilo, dashboard
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from database import get_db
from auth import get_current_user
from models import User

router = APIRouter(prefix="/citizen", tags=["Cittadino"])


@router.get("/dashboard")
async def citizen_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dashboard cittadino con riepilogo di tutte le attivita'"""
    game_name = current_user.game_name or current_user.name or "Cittadino"
    
    # Multe pendenti
    fines_result = await db.execute(text("""
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
        FROM fines WHERE (citizen_name = :name OR subject_name = :name) AND is_paid = FALSE
    """), {"name": game_name})
    fines_row = fines_result.mappings().first()
    
    # Mandati attivi
    warrants_result = await db.execute(text("""
        SELECT COUNT(*) as count FROM warrants 
        WHERE (suspect_name = :name OR subject_name = :name) AND is_active = TRUE
    """), {"name": game_name})
    warrants_count = warrants_result.mappings().first()["count"]
    
    # Ticket aperti
    try:
        tickets_result = await db.execute(text("""
            SELECT COUNT(*) as count FROM tickets 
            WHERE created_by = :uid AND status NOT IN ('closed', 'resolved')
        """), {"uid": current_user.id})
        tickets_count = tickets_result.mappings().first()["count"]
    except:
        tickets_count = 0
    
    # Documenti
    try:
        docs_result = await db.execute(text("""
            SELECT COUNT(*) as count FROM documents WHERE holder_name = :name
        """), {"name": game_name})
        docs_count = docs_result.mappings().first()["count"]
    except:
        docs_count = 0
    
    # Annunci marketplace attivi
    try:
        market_result = await db.execute(text("""
            SELECT COUNT(*) as count FROM marketplace_listings 
            WHERE seller_id = :uid AND status = 'active'
        """), {"uid": current_user.id})
        market_count = market_result.mappings().first()["count"]
    except:
        market_count = 0
    
    return {
        "game_name": game_name,
        "fines": {
            "pending_count": fines_row["count"],
            "pending_total": float(fines_row["total"])
        },
        "warrants": {
            "active_count": warrants_count
        },
        "tickets": {
            "open_count": tickets_count
        },
        "documents": {
            "count": docs_count
        },
        "marketplace": {
            "active_count": market_count
        }
    }


@router.get("/fines")
async def get_my_fines(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Le mie multe - cerca per game_name"""
    game_name = current_user.game_name or current_user.name or ""
    
    query = """
        SELECT f.*, u.game_name as officer_name
        FROM fines f 
        LEFT JOIN users u ON f.issued_by = u.id
        WHERE (f.citizen_name = :name OR f.subject_name = :name)
    """
    params = {"name": game_name}
    
    if status == "paid":
        query += " AND f.is_paid = TRUE"
    elif status == "unpaid":
        query += " AND f.is_paid = FALSE"
    
    query += " ORDER BY f.created_at DESC"
    
    result = await db.execute(text(query), params)
    fines = []
    for row in result.mappings().all():
        fines.append({
            "id": row["id"],
            "fine_number": row["fine_number"],
            "reason": row.get("reason") or row.get("description") or "",
            "amount": float(row["amount"]) if row["amount"] else 0,
            "is_paid": bool(row["is_paid"]),
            "officer_name": row["officer_name"] or "Sconosciuto",
            "created_at": str(row["created_at"]) if row["created_at"] else None,
        })
    
    return fines


@router.post("/fines/{fine_id}/pay")
async def pay_fine(
    fine_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Segna una multa come pagata"""
    game_name = current_user.game_name or current_user.name or ""
    
    result = await db.execute(text("""
        SELECT * FROM fines WHERE id = :fid AND (citizen_name = :name OR subject_name = :name)
    """), {"fid": fine_id, "name": game_name})
    fine = result.mappings().first()
    
    if not fine:
        raise HTTPException(status_code=404, detail="Multa non trovata")
    
    if fine["is_paid"]:
        raise HTTPException(status_code=400, detail="Multa gia' pagata")
    
    await db.execute(text("""
        UPDATE fines SET is_paid = TRUE, paid_at = NOW() WHERE id = :fid
    """), {"fid": fine_id})
    await db.commit()
    
    return {"message": "Multa pagata con successo", "fine_number": fine["fine_number"]}


@router.get("/warrants")
async def get_my_warrants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """I miei mandati - cerca per game_name"""
    game_name = current_user.game_name or current_user.name or ""
    
    result = await db.execute(text("""
        SELECT w.*, u.game_name as officer_name
        FROM warrants w
        LEFT JOIN users u ON w.issued_by = u.id
        WHERE (w.suspect_name = :name OR w.subject_name = :name)
        ORDER BY w.is_active DESC, w.created_at DESC
    """), {"name": game_name})
    
    warrants = []
    for row in result.mappings().all():
        warrants.append({
            "id": row["id"],
            "warrant_number": row["warrant_number"],
            "reason": row.get("reason") or row.get("description") or "",
            "status": row.get("status") or ("Attivo" if row["is_active"] else "Inattivo"),
            "is_active": bool(row["is_active"]),
            "officer_name": row["officer_name"] or "Sconosciuto",
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "expires_at": str(row["expires_at"]) if row.get("expires_at") else None,
        })
    
    return warrants


@router.get("/profile")
async def get_citizen_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Profilo cittadino completo"""
    game_name = current_user.game_name or current_user.name or ""
    
    # Storico multe
    fines_total = await db.execute(text("""
        SELECT COUNT(*) as total, SUM(CASE WHEN is_paid = TRUE THEN 1 ELSE 0 END) as paid,
               SUM(CASE WHEN is_paid = FALSE THEN 1 ELSE 0 END) as unpaid,
               COALESCE(SUM(CASE WHEN is_paid = FALSE THEN amount ELSE 0 END), 0) as debt
        FROM fines WHERE (citizen_name = :name OR subject_name = :name)
    """), {"name": game_name})
    fines_stats = fines_total.mappings().first()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "game_name": game_name,
        "sector": current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector),
        "registered_at": str(current_user.created_at) if current_user.created_at else None,
        "fines_stats": {
            "total": fines_stats["total"],
            "paid": fines_stats["paid"],
            "unpaid": fines_stats["unpaid"],
            "debt": float(fines_stats["debt"])
        }
    }
