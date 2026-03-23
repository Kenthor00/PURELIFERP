"""
PURE LIFE OS - Main Server
FastAPI Application con MySQL
Sistema Operativo Governativo RP
"""
from fastapi import FastAPI, APIRouter, Depends, Request, Response, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import os
import logging
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import time

from database import get_db, engine, async_session, run_auto_migrations, check_tables_exist
from sqlalchemy.ext.asyncio import AsyncSession
from auth import get_current_user, decode_token
from sse_manager import sse_manager
from outbox_worker import outbox_worker
from cache import cache, get_cache_stats, clear_all_cache
from websocket_engine import ws_manager, heartbeat_checker, WSEventType
from routers.appointments import check_and_send_reminders

from routers import auth, lspd, ems, dispatch, timeline
from routers import city, news, justice, chat
from routers import fivem_sso
from routers import users, audit, admin
from routers import recruitment, appointments, announcements, advertising
from routers import notifications
from routers import news_v2, push
from routers import chat as service_chat
from routers import admin_delete

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

outbox_task = None
db_connected = False
migrations_status = {"status": "pending", "error": None}


class EmbeddingMiddleware(BaseHTTPMiddleware):
    """
    Middleware per permettere embedding in iframe (lb-phone WebView)
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        
        response.headers["Content-Security-Policy"] = "frame-ancestors *"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task, db_connected, migrations_status
    logger.info("PURE LIFE OS - Avvio sistema...")
    
    try:
        from sqlalchemy import text
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        db_connected = True
        logger.info("Database MySQL connesso")
        
        # Auto-migrations (idempotente)
        migration_result = await run_auto_migrations()
        if migration_result["success"]:
            migrations_status = {"status": "ok", "error": None}
            logger.info("Auto-migrations completate con successo")
        else:
            migrations_status = {"status": "failed", "error": migration_result.get("error")}
            logger.warning(f"Auto-migrations fallite: {migration_result.get('error')}")
            
    except Exception as e:
        db_connected = False
        migrations_status = {"status": "unknown", "error": "DB non raggiungibile"}
        logger.warning(f"Database MySQL non disponibile: {e}")
    
    outbox_task = asyncio.create_task(outbox_worker.start(interval=30))
    logger.info("Outbox Worker avviato")
    
    # Start WebSocket heartbeat checker
    heartbeat_task = asyncio.create_task(heartbeat_checker())
    logger.info("WebSocket Heartbeat Checker avviato")
    
    # Start Appointment Reminder Scheduler
    async def reminder_scheduler():
        """Background task che controlla e invia reminder ogni 60 secondi"""
        while True:
            try:
                await asyncio.sleep(60)  # Check ogni minuto
                async with async_session() as db:
                    await check_and_send_reminders(db)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Reminder scheduler error: {e}")
    
    reminder_task = asyncio.create_task(reminder_scheduler())
    logger.info("Appointment Reminder Scheduler avviato")
    
    yield
    
    outbox_worker.stop()
    if outbox_task:
        outbox_task.cancel()
        try:
            await outbox_task
        except asyncio.CancelledError:
            pass
    
    if heartbeat_task:
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
    
    if reminder_task:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass
    
    logger.info("PURE LIFE OS - Shutdown completato")


app = FastAPI(
    title="PURE LIFE OS",
    description="Sistema Operativo Governativo RP - LSPD / EMS / GOV / NEWS / Dispatch",
    version="1.0.0",
    lifespan=lifespan
)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {
        "system": "PURE LIFE OS",
        "version": "1.0.0",
        "status": "operativo",
        "moduli": [
            "auth", "users", "audit",
            "lspd", "ems", "dispatch", 
            "city", "news", "justice", "chat"
        ]
    }


@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    global db_connected, migrations_status
    
    db_status = {"status": "ok", "error": None}
    mig_status = migrations_status.copy()
    
    try:
        from sqlalchemy import text
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            
            if migrations_status["status"] == "ok":
                try:
                    await session.execute(text("SELECT COUNT(*) FROM users"))
                    mig_status = {"status": "ok", "error": None}
                except Exception as mig_err:
                    mig_status = {"status": "missing", "error": str(mig_err)[:100]}
                
        db_connected = True
    except Exception as e:
        db_status = {"status": "down", "error": str(e)[:100]}
        mig_status = {"status": "unknown", "error": "Cannot check - DB down"}
        db_connected = False
    
    sse_status = {
        "status": "ok",
        "connected_clients": len(sse_manager.clients)
    }
    
    overall_status = "ok" if db_connected and mig_status["status"] == "ok" else "degraded"
    
    return {
        "status": overall_status,
        "backend": "ok",
        "db": db_status,
        "migrations": mig_status,
        "sse": sse_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/sse/events")
async def sse_events(
    request: Request,
    token: str = None,
    db: AsyncSession = Depends(get_db)
):
    """SSE endpoint per eventi realtime - accetta token da query param o header"""
    from sqlalchemy import select
    from models import User
    
    # Try to get token from query param (for EventSource) or Authorization header
    auth_token = token
    if not auth_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            auth_token = auth_header[7:]
    
    if not auth_token:
        raise HTTPException(status_code=401, detail="Token richiesto")
    
    try:
        payload = decode_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Utente non autorizzato")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token non valido")
    async def event_stream():
        client_id = await sse_manager.connect()
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                event = await sse_manager.get_event(client_id)
                if event:
                    yield f"data: {event}\n\n"
                else:
                    yield ": heartbeat\n\n"
                
                await asyncio.sleep(1)
        finally:
            await sse_manager.disconnect(client_id)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# CORS - Configurato per FiveM NUI e browser
# Include supporto per cfx-nui-* origins
cors_origins = [
    "*",  # Permette tutte le origini
    "https://cfx-nui-purelife_computer",
    "https://cfx-nui-purelife_computer/",
    "nui://purelife_computer",
    "nui://game",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://cfx-nui-.*",  # Permette tutti i cfx-nui-*
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ==========================================
# WEBSOCKET ENDPOINT (Real-Time Engine)
# ==========================================

@app.websocket("/api/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint per real-time communication
    URL: ws://host/api/ws/{jwt_token}
    """
    # Verifica token JWT
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        user_id = int(user_id)
    except Exception as e:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    # Connetti
    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            # Ricevi messaggi dal client
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            
            if msg_type == "ping":
                # Heartbeat
                await ws_manager.update_heartbeat(user_id)
                await websocket.send_json({"type": WSEventType.PONG, "timestamp": time.time()})
            
            elif msg_type == "subscribe":
                # Subscribe a canale
                channel = data.get("channel")
                if channel:
                    await ws_manager.subscribe_channel(user_id, channel)
            
            elif msg_type == "unsubscribe":
                # Unsubscribe da canale
                channel = data.get("channel")
                if channel:
                    await ws_manager.unsubscribe_channel(user_id, channel)
            
            elif msg_type == "chat_message":
                # Forward chat message (gestito dal chat router)
                pass
            
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)


# ==========================================
# PERFORMANCE / CACHE ENDPOINTS
# ==========================================

@api_router.get("/system/cache/stats")
async def cache_stats_endpoint(current_user = Depends(get_current_user)):
    """Statistiche cache (admin only)"""
    return {
        "cache": await get_cache_stats(),
        "websocket": ws_manager.stats(),
        "sse": {"connected_clients": len(sse_manager.clients)}
    }


@api_router.post("/system/cache/clear")
async def clear_cache_endpoint(current_user = Depends(get_current_user)):
    """Svuota cache (admin only)"""
    if current_user.sector.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await clear_all_cache()
    return {"status": "ok", "message": "Cache cleared"}


@api_router.get("/system/performance")
async def performance_metrics():
    """Metriche performance sistema"""
    start = time.time()
    
    # Quick DB check
    db_latency = None
    try:
        from sqlalchemy import text
        db_start = time.time()
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        db_latency = round((time.time() - db_start) * 1000, 2)
    except:
        db_latency = -1
    
    return {
        "api_latency_ms": round((time.time() - start) * 1000, 2),
        "db_latency_ms": db_latency,
        "cache": await get_cache_stats(),
        "websocket": ws_manager.stats(),
        "online_users": ws_manager.get_online_users()
    }


# Include all routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)
api_router.include_router(admin.router)
api_router.include_router(lspd.router)
api_router.include_router(ems.router)
api_router.include_router(dispatch.router)
api_router.include_router(timeline.router)
api_router.include_router(city.router)
api_router.include_router(news.router)
api_router.include_router(justice.router)
api_router.include_router(chat.router)
api_router.include_router(fivem_sso.router)

# City Hub routers
api_router.include_router(recruitment.router)
api_router.include_router(appointments.router)
api_router.include_router(announcements.router)
api_router.include_router(advertising.router)
api_router.include_router(notifications.router)

# FASE 4 - Weazel News 2.0, Service Chat 2.0, Push Notifications
api_router.include_router(news_v2.router)
api_router.include_router(push.router)

# FASE P1 - Admin Delete System
api_router.include_router(admin_delete.router)

# Map POI System
from routers import poi
api_router.include_router(poi.router)

# FiveM NUI Integration
from routers import nui_integration
api_router.include_router(nui_integration.router)

# Agenda / Appointments
from routers import appointments
api_router.include_router(appointments.router)

# RBAC Admin System
from routers import admin_rbac
api_router.include_router(admin_rbac.router)

# Documents System (QR Verification)
from routers import documents
api_router.include_router(documents.router)

# Marketplace System
from routers import marketplace
api_router.include_router(marketplace.router)

# Ticket System
from routers import tickets
api_router.include_router(tickets.router)

# Citizen API
from routers import citizen
api_router.include_router(citizen.router)

# Add embedding middleware
app.add_middleware(EmbeddingMiddleware)

app.include_router(api_router)
