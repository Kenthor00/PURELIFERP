"""
PURE LIFE OS - Router lb-phone Notifications
Endpoint per il bridge FiveM (plos_bridge) che interroga la coda
e invia le notifiche in-game tramite lb-phone.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
import os

from database import get_db
from services.lbphone_service import ensure_lbphone_table

router = APIRouter(prefix="/lbphone", tags=["lb-phone"])

# Chiave segreta per autenticare le richieste dal bridge FiveM
BRIDGE_SECRET = os.environ.get("FIVEM_BRIDGE_SECRET", "plos-bridge-secret-2026")


@router.get("/notifications/pending")
async def get_pending_notifications(
    secret: str = Query(...),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Restituisce le notifiche in coda non ancora inviate.
    Chiamato dal bridge FiveM (plos_bridge) periodicamente.
    """
    if secret != BRIDGE_SECRET:
        raise HTTPException(status_code=403, detail="Chiave bridge non valida")

    await ensure_lbphone_table(db)

    result = await db.execute(text("""
        SELECT id, target_identifier, target_user_id, app, title, message, icon, color, sound, created_at
        FROM lbphone_notifications
        WHERE sent = FALSE
        ORDER BY created_at ASC
        LIMIT :lim
    """), {"lim": limit})

    notifications = []
    for row in result.mappings().all():
        notifications.append({
            "id": row["id"],
            "target_identifier": row["target_identifier"],
            "target_user_id": row["target_user_id"],
            "app": row["app"],
            "title": row["title"],
            "message": row["message"],
            "icon": row["icon"],
            "color": row["color"],
            "sound": bool(row["sound"]),
            "created_at": str(row["created_at"]) if row["created_at"] else None,
        })

    return {"count": len(notifications), "notifications": notifications}


@router.post("/notifications/mark-sent")
async def mark_notifications_sent(
    secret: str = Query(...),
    ids: list[int] = [],
    db: AsyncSession = Depends(get_db)
):
    """
    Segna le notifiche come inviate dopo che il bridge le ha consegnate.
    """
    if secret != BRIDGE_SECRET:
        raise HTTPException(status_code=403, detail="Chiave bridge non valida")

    if not ids:
        return {"marked": 0}

    await ensure_lbphone_table(db)

    placeholders = ", ".join([str(int(i)) for i in ids])
    await db.execute(text(f"""
        UPDATE lbphone_notifications SET sent = TRUE, sent_at = NOW()
        WHERE id IN ({placeholders})
    """))
    await db.commit()

    return {"marked": len(ids)}


@router.get("/notifications/stats")
async def get_notification_stats(
    secret: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche coda notifiche."""
    if secret != BRIDGE_SECRET:
        raise HTTPException(status_code=403, detail="Chiave bridge non valida")

    await ensure_lbphone_table(db)

    pending = await db.execute(text("SELECT COUNT(*) FROM lbphone_notifications WHERE sent = FALSE"))
    sent = await db.execute(text("SELECT COUNT(*) FROM lbphone_notifications WHERE sent = TRUE"))
    total = await db.execute(text("SELECT COUNT(*) FROM lbphone_notifications"))

    return {
        "pending": pending.scalar(),
        "sent": sent.scalar(),
        "total": total.scalar()
    }
