"""
PURE LIFE OS - Servizio Notifiche lb-phone
Gestisce la coda di notifiche da inviare in-game tramite lb-phone.
Il bridge plos_bridge (Lua) interroga periodicamente l'endpoint
e chiama exports['lb-phone']:SendNotification(source, data).
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)


async def ensure_lbphone_table(db: AsyncSession):
    """Crea la tabella per la coda notifiche lb-phone se non esiste."""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS lbphone_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            target_identifier VARCHAR(100) NOT NULL,
            target_user_id INT NULL,
            app VARCHAR(50) DEFAULT 'purelifeos',
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            icon VARCHAR(200) DEFAULT 'fa-solid fa-building-columns',
            color VARCHAR(20) DEFAULT '#00ff9c',
            sound BOOLEAN DEFAULT TRUE,
            sent BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            sent_at DATETIME NULL,
            INDEX idx_pending (sent, created_at)
        )
    """))
    await db.commit()


async def queue_lbphone_notification(
    db: AsyncSession,
    target_identifier: str,
    title: str,
    message: str,
    target_user_id: int = None,
    icon: str = "fa-solid fa-building-columns",
    color: str = "#00ff9c",
    sound: bool = True
):
    """
    Accoda una notifica per lb-phone.
    target_identifier: license/steam/fivem identifier del giocatore
    """
    await ensure_lbphone_table(db)
    await db.execute(text("""
        INSERT INTO lbphone_notifications (target_identifier, target_user_id, title, message, icon, color, sound)
        VALUES (:ident, :uid, :title, :msg, :icon, :color, :sound)
    """), {
        "ident": target_identifier,
        "uid": target_user_id,
        "title": title,
        "msg": message,
        "icon": icon,
        "color": color,
        "sound": sound
    })
    await db.commit()
    logger.info(f"[lb-phone] Notifica accodata per {target_identifier}: {title}")


async def queue_notification_for_user(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    icon: str = "fa-solid fa-building-columns",
    color: str = "#00ff9c"
):
    """
    Accoda notifica per un utente PLOS (cerca l'identifier nel DB).
    Se l'utente non ha un identifier FiveM, la notifica viene comunque
    creata con user_id per tracciabilita'.
    """
    await ensure_lbphone_table(db)

    # Cerca identifier dell'utente
    result = await db.execute(text("""
        SELECT game_name, fivem_identifier FROM users WHERE id = :uid
    """), {"uid": user_id})
    user_row = result.mappings().first()

    identifier = ""
    if user_row:
        identifier = user_row.get("fivem_identifier") or f"user:{user_id}"
    else:
        identifier = f"user:{user_id}"

    await db.execute(text("""
        INSERT INTO lbphone_notifications (target_identifier, target_user_id, title, message, icon, color)
        VALUES (:ident, :uid, :title, :msg, :icon, :color)
    """), {
        "ident": identifier,
        "uid": user_id,
        "title": title,
        "msg": message,
        "icon": icon,
        "color": color
    })
    await db.commit()


async def queue_notification_for_sector(
    db: AsyncSession,
    sector: str,
    title: str,
    message: str,
    icon: str = "fa-solid fa-shield",
    color: str = "#3b82f6"
):
    """
    Accoda notifica per tutti gli utenti di un settore.
    """
    await ensure_lbphone_table(db)

    result = await db.execute(text("""
        SELECT id, fivem_identifier FROM users WHERE UPPER(sector) = :sector
    """), {"sector": sector.upper()})

    users = result.mappings().all()
    for u in users:
        identifier = u.get("fivem_identifier") or f"user:{u['id']}"
        await db.execute(text("""
            INSERT INTO lbphone_notifications (target_identifier, target_user_id, title, message, icon, color)
            VALUES (:ident, :uid, :title, :msg, :icon, :color)
        """), {
            "ident": identifier,
            "uid": u["id"],
            "title": title,
            "msg": message,
            "icon": icon,
            "color": color
        })

    await db.commit()
    logger.info(f"[lb-phone] Notifica accodata per settore {sector}: {title} ({len(users)} utenti)")
