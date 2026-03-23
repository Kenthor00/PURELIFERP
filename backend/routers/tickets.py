"""
PURE LIFE OS - Sistema Ticket/Assistenza
Cittadini aprono ticket, Staff (GOV/ADMIN) risponde
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, desc, and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from database import get_db
from auth import get_current_user
from models import User
from services.lbphone_service import queue_notification_for_user, queue_notification_for_sector

router = APIRouter(prefix="/tickets", tags=["Tickets"])

# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class TicketCreate(BaseModel):
    subject: str
    message: str
    category: str = "generale"  # generale, documenti, multe, lavoro, reclamo, altro
    priority: str = "normal"     # low, normal, high, urgent

class TicketReply(BaseModel):
    message: str

class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed

# ============================================================
# HELPER: Create tickets table if not exists
# ============================================================

from sqlalchemy import text

async def ensure_tables(db: AsyncSession):
    """Create tickets tables if they don't exist"""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_number VARCHAR(20) UNIQUE NOT NULL,
            subject VARCHAR(500) NOT NULL,
            category VARCHAR(50) DEFAULT 'generale',
            priority VARCHAR(20) DEFAULT 'normal',
            status VARCHAR(20) DEFAULT 'open',
            created_by INT NOT NULL,
            assigned_to INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            closed_at DATETIME NULL,
            closed_by INT NULL
        )
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_name VARCHAR(100),
            sender_sector VARCHAR(50),
            message TEXT NOT NULL,
            is_staff_reply BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        )
    """))
    await db.commit()

# ============================================================
# CITIZEN ENDPOINTS
# ============================================================

@router.post("/create")
async def create_ticket(
    data: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Citizen creates a new ticket"""
    await ensure_tables(db)
    
    # Generate ticket number
    count = await db.execute(text("SELECT COUNT(*) FROM tickets"))
    num = count.scalar() + 1
    ticket_number = f"TK-{num:05d}"
    
    await db.execute(text("""
        INSERT INTO tickets (ticket_number, subject, category, priority, status, created_by)
        VALUES (:tn, :sub, :cat, :pri, 'open', :uid)
    """), {"tn": ticket_number, "sub": data.subject, "cat": data.category, "pri": data.priority, "uid": current_user.id})
    
    # Get the ticket id
    result = await db.execute(text("SELECT LAST_INSERT_ID()"))
    ticket_id = result.scalar()
    
    # Add first message
    await db.execute(text("""
        INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_sector, message, is_staff_reply)
        VALUES (:tid, :uid, :name, :sector, :msg, FALSE)
    """), {
        "tid": ticket_id,
        "uid": current_user.id,
        "name": current_user.game_name or current_user.name,
        "sector": current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector),
        "msg": data.message
    })
    
    await db.commit()
    
    # Notifica lb-phone: avvisa staff GOV/ADMIN del nuovo ticket
    try:
        await queue_notification_for_sector(
            db, "GOV",
            title="Nuovo Ticket di Assistenza",
            message=f"{current_user.game_name or 'Cittadino'}: {data.subject}",
            icon="fa-solid fa-ticket",
            color="#8b5cf6"
        )
        await queue_notification_for_sector(
            db, "ADMIN",
            title="Nuovo Ticket di Assistenza",
            message=f"{current_user.game_name or 'Cittadino'}: {data.subject}",
            icon="fa-solid fa-ticket",
            color="#8b5cf6"
        )
    except Exception:
        pass  # Non bloccare la creazione del ticket se la notifica fallisce
    
    return {
        "id": ticket_id,
        "ticket_number": ticket_number,
        "subject": data.subject,
        "category": data.category,
        "status": "open",
        "message": "Ticket creato con successo"
    }


@router.get("/my")
async def get_my_tickets(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tickets created by current user"""
    await ensure_tables(db)
    
    query = "SELECT t.*, u.game_name as assigned_name FROM tickets t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.created_by = :uid"
    params = {"uid": current_user.id}
    
    if status:
        query += " AND t.status = :status"
        params["status"] = status
    
    query += " ORDER BY t.updated_at DESC"
    
    result = await db.execute(text(query), params)
    tickets = []
    for row in result.mappings().all():
        # Count messages
        msg_count = await db.execute(text("SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = :tid"), {"tid": row["id"]})
        # Count unread staff replies
        unread = await db.execute(text("""
            SELECT COUNT(*) FROM ticket_messages 
            WHERE ticket_id = :tid AND is_staff_reply = TRUE
        """), {"tid": row["id"]})
        
        tickets.append({
            "id": row["id"],
            "ticket_number": row["ticket_number"],
            "subject": row["subject"],
            "category": row["category"],
            "priority": row["priority"],
            "status": row["status"],
            "assigned_to_name": row["assigned_name"],
            "message_count": msg_count.scalar(),
            "staff_replies": unread.scalar(),
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
        })
    
    return tickets


@router.get("/{ticket_id}")
async def get_ticket_detail(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get ticket detail with all messages"""
    await ensure_tables(db)
    
    # Check access
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    is_staff = sector in ["ADMIN", "GOV"]
    
    result = await db.execute(text("SELECT * FROM tickets WHERE id = :tid"), {"tid": ticket_id})
    ticket = result.mappings().first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    if not is_staff and ticket["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Get messages
    msgs = await db.execute(text("""
        SELECT * FROM ticket_messages WHERE ticket_id = :tid ORDER BY created_at ASC
    """), {"tid": ticket_id})
    
    messages = []
    for m in msgs.mappings().all():
        messages.append({
            "id": m["id"],
            "sender_name": m["sender_name"],
            "sender_sector": m["sender_sector"],
            "message": m["message"],
            "is_staff_reply": bool(m["is_staff_reply"]),
            "created_at": str(m["created_at"]) if m["created_at"] else None,
        })
    
    # Get creator info
    creator = await db.execute(text("SELECT game_name, email FROM users WHERE id = :uid"), {"uid": ticket["created_by"]})
    creator_info = creator.mappings().first()
    
    return {
        "id": ticket["id"],
        "ticket_number": ticket["ticket_number"],
        "subject": ticket["subject"],
        "category": ticket["category"],
        "priority": ticket["priority"],
        "status": ticket["status"],
        "created_by_name": creator_info["game_name"] if creator_info else "Sconosciuto",
        "created_by_email": creator_info["email"] if creator_info else "",
        "assigned_to": ticket["assigned_to"],
        "created_at": str(ticket["created_at"]) if ticket["created_at"] else None,
        "updated_at": str(ticket["updated_at"]) if ticket["updated_at"] else None,
        "messages": messages
    }


@router.post("/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    data: TicketReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reply to a ticket (citizen or staff)"""
    await ensure_tables(db)
    
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    is_staff = sector in ["ADMIN", "GOV"]
    
    result = await db.execute(text("SELECT * FROM tickets WHERE id = :tid"), {"tid": ticket_id})
    ticket = result.mappings().first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    if not is_staff and ticket["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="Ticket chiuso, non puoi rispondere")
    
    await db.execute(text("""
        INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_sector, message, is_staff_reply)
        VALUES (:tid, :uid, :name, :sector, :msg, :is_staff)
    """), {
        "tid": ticket_id,
        "uid": current_user.id,
        "name": current_user.game_name or current_user.name,
        "sector": sector,
        "msg": data.message,
        "is_staff": is_staff
    })
    
    # Auto-assign to staff if first staff reply
    if is_staff and not ticket["assigned_to"]:
        await db.execute(text("UPDATE tickets SET assigned_to = :uid, status = 'in_progress' WHERE id = :tid"),
                        {"uid": current_user.id, "tid": ticket_id})
    
    # Update ticket timestamp
    await db.execute(text("UPDATE tickets SET updated_at = NOW() WHERE id = :tid"), {"tid": ticket_id})
    
    await db.commit()
    
    # Notifica lb-phone
    try:
        if is_staff:
            # Staff ha risposto -> notifica al cittadino che ha aperto il ticket
            await queue_notification_for_user(
                db, ticket["created_by"],
                title="Risposta al tuo Ticket",
                message=f"Lo staff ha risposto al ticket: {ticket['subject'] if 'subject' in ticket.keys() else 'Assistenza'}",
                icon="fa-solid fa-reply",
                color="#00ff9c"
            )
        else:
            # Cittadino ha risposto -> notifica allo staff assegnato
            if ticket["assigned_to"]:
                await queue_notification_for_user(
                    db, ticket["assigned_to"],
                    title="Nuova risposta su Ticket",
                    message=f"{current_user.game_name or 'Cittadino'} ha risposto al ticket",
                    icon="fa-solid fa-comment",
                    color="#f59e0b"
                )
    except Exception:
        pass
    
    return {"message": "Risposta inviata", "is_staff_reply": is_staff}


# ============================================================
# STAFF ENDPOINTS
# ============================================================

@router.get("/staff/all")
async def get_all_tickets_staff(
    status: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff: Get all tickets"""
    await ensure_tables(db)
    
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    if sector not in ["ADMIN", "GOV"]:
        raise HTTPException(status_code=403, detail="Solo lo staff può vedere tutti i ticket")
    
    query = """
        SELECT t.*, u.game_name as creator_name, u2.game_name as assigned_name
        FROM tickets t 
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN users u2 ON t.assigned_to = u2.id
        WHERE 1=1
    """
    params = {}
    
    if status:
        query += " AND t.status = :status"
        params["status"] = status
    if category:
        query += " AND t.category = :category"
        params["category"] = category
    
    query += " ORDER BY FIELD(t.priority, 'urgent', 'high', 'normal', 'low'), t.updated_at DESC"
    
    result = await db.execute(text(query), params)
    tickets = []
    for row in result.mappings().all():
        msg_count = await db.execute(text("SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = :tid"), {"tid": row["id"]})
        tickets.append({
            "id": row["id"],
            "ticket_number": row["ticket_number"],
            "subject": row["subject"],
            "category": row["category"],
            "priority": row["priority"],
            "status": row["status"],
            "creator_name": row["creator_name"] or "Sconosciuto",
            "assigned_to_name": row["assigned_name"],
            "message_count": msg_count.scalar(),
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "updated_at": str(row["updated_at"]) if row["updated_at"] else None,
        })
    
    return tickets


@router.put("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: int,
    data: TicketStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff: Update ticket status"""
    await ensure_tables(db)
    
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    if sector not in ["ADMIN", "GOV"]:
        raise HTTPException(status_code=403, detail="Solo staff autorizzato")
    
    result = await db.execute(text("SELECT * FROM tickets WHERE id = :tid"), {"tid": ticket_id})
    ticket = result.mappings().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    
    update_q = "UPDATE tickets SET status = :status, updated_at = NOW()"
    params = {"status": data.status, "tid": ticket_id}
    
    if data.status == "closed":
        update_q += ", closed_at = NOW(), closed_by = :uid"
        params["uid"] = current_user.id
    
    if data.status == "in_progress" and not ticket["assigned_to"]:
        update_q += ", assigned_to = :uid"
        params["uid"] = current_user.id
    
    update_q += " WHERE id = :tid"
    await db.execute(text(update_q), params)
    await db.commit()
    
    return {"message": f"Ticket aggiornato a: {data.status}"}


@router.put("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    staff_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff: Assign ticket to staff member"""
    await ensure_tables(db)
    
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    if sector not in ["ADMIN", "GOV"]:
        raise HTTPException(status_code=403, detail="Solo staff autorizzato")
    
    await db.execute(text("""
        UPDATE tickets SET assigned_to = :sid, status = 'in_progress', updated_at = NOW() 
        WHERE id = :tid
    """), {"sid": staff_id, "tid": ticket_id})
    await db.commit()
    
    return {"message": "Ticket assegnato"}


@router.get("/staff/stats")
async def get_ticket_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Staff: Get ticket statistics"""
    await ensure_tables(db)
    
    sector = current_user.sector.value if hasattr(current_user.sector, 'value') else str(current_user.sector)
    if sector not in ["ADMIN", "GOV"]:
        raise HTTPException(status_code=403, detail="Solo staff")
    
    open_count = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status = 'open'"))
    progress_count = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status = 'in_progress'"))
    resolved_count = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status = 'resolved'"))
    closed_count = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE status = 'closed'"))
    urgent_count = await db.execute(text("SELECT COUNT(*) FROM tickets WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed')"))
    
    return {
        "open": open_count.scalar(),
        "in_progress": progress_count.scalar(),
        "resolved": resolved_count.scalar(),
        "closed": closed_count.scalar(),
        "urgent": urgent_count.scalar()
    }
