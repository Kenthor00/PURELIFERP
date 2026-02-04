"""
PURE LIFE OS - Main Server
FastAPI Application con MySQL - Extended
"""
from fastapi import FastAPI, APIRouter, Depends, Request, Response, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncio
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from database import init_db, get_db, engine, async_session
from auth import get_current_user
from sse_manager import sse_manager
from outbox_worker import outbox_worker

from routers import auth, lspd, ems, dispatch, timeline
from routers import city, news, justice, chat

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

outbox_task = None
db_connected = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task, db_connected
    logger.info("PURE LIFE OS - Avvio sistema...")
    
    try:
        await init_db()
        db_connected = True
        logger.info("Database MySQL connesso")
    except Exception as e:
        db_connected = False
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
    version="2.0.0",
    lifespan=lifespan
)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {
        "system": "PURE LIFE OS",
        "version": "2.0.0",
        "status": "operativo",
        "moduli": [
            "auth", "lspd", "ems", "dispatch", "timeline",
            "city", "news", "justice", "chat"
        ]
    }


@api_router.get("/health")
async def health_check():
    global db_connected
    
    # Test database connection
    db_status = "connected"
    try:
        async with async_session() as session:
            await session.execute("SELECT 1")
        db_connected = True
    except Exception as e:
        db_status = f"disconnected: {str(e)[:50]}"
        db_connected = False
    
    return {
        "status": "healthy" if db_connected else "degraded",
        "database": "mysql",
        "db_connected": db_connected,
        "db_status": db_status,
        "sse_clients": len(sse_manager.clients)
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
