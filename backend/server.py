"""
PURE LIFE OS - Main Server
FastAPI Application con MySQL - Extended
lb-phone WebView compatible
"""
from fastapi import FastAPI, APIRouter, Depends, Request, Response, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import os
import logging
import asyncio
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from datetime import datetime, timezone
from database import init_db, get_db, engine, async_session, run_auto_migrations, check_tables_exist
from auth import get_current_user
from sse_manager import sse_manager
from outbox_worker import outbox_worker

from routers import auth, lspd, ems, dispatch, timeline
from routers import city, news, justice, chat
from routers import admin
from routers import fivem_sso

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
    - Rimuove X-Frame-Options
    - Imposta CSP permissivo per frame-ancestors
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Rimuovi X-Frame-Options se presente
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        
        # Permetti embedding da qualsiasi origine (dev mode)
        # In produzione: restringere a domini specifici FiveM
        response.headers["Content-Security-Policy"] = "frame-ancestors *"
        
        # Permetti credenziali cross-origin per SSE
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task, db_connected, migrations_status
    logger.info("PURE LIFE OS - Avvio sistema...")
    
    try:
        # Test connessione DB
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
    
    yield
    
    outbox_worker.stop()
    if outbox_task:
        outbox_task.cancel()
        try:
            await outbox_task
        except asyncio.CancelledError:
            pass
    
    logger.info("PURE LIFE OS - Shutdown completato")


app = FastAPI(
    title="PURE LIFE OS",
    description="Sistema Operativo Digitale - LSPD / EMS / Dispatch / City Hub / Giustizia",
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
            "auth", "lspd", "ems", "dispatch", "timeline",
            "city", "news", "justice", "chat"
        ]
    }


@api_router.get("/health")
async def health_check():
    """Health check endpoint con stato dettagliato di tutti i servizi"""
    global db_connected, migrations_status
    
    # Test database connection
    db_status = {"status": "ok", "error": None}
    mig_status = migrations_status.copy()
    
    try:
        from sqlalchemy import text
        async with async_session() as session:
            # Test basic connection
            await session.execute(text("SELECT 1"))
            
            # Check if tables exist (migrations status)
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
    
    # SSE status
    sse_status = {
        "status": "ok",
        "connected_clients": len(sse_manager.clients)
    }
    
    # Overall status
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
    current_user = Depends(get_current_user)
):
    """Server-Sent Events endpoint per realtime updates"""
    client_id = str(uuid.uuid4())
    
    client = await sse_manager.connect(
        client_id=client_id,
        user_id=current_user.id,
        role=current_user.role.value
    )
    
    async def event_stream():
        try:
            async for event in sse_manager.event_generator(client):
                if await request.is_disconnected():
                    break
                yield event
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


# Include all routers
api_router.include_router(auth.router)
api_router.include_router(lspd.router)
api_router.include_router(ems.router)
api_router.include_router(dispatch.router)
api_router.include_router(timeline.router)
api_router.include_router(city.router)
api_router.include_router(news.router)
api_router.include_router(justice.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
api_router.include_router(fivem_sso.router)

# Add embedding middleware (per lb-phone WebView)
app.add_middleware(EmbeddingMiddleware)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
