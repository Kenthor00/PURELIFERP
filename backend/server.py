"""
PURE LIFE OS - Main Server
FastAPI Application con MySQL
"""
from fastapi import FastAPI, APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncio
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from database import init_db, get_db, engine
from auth import get_current_user
from sse_manager import sse_manager
from outbox_worker import outbox_worker

from routers import auth, lspd, ems, dispatch, timeline

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

outbox_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global outbox_task
    logger.info("PURE LIFE OS - Avvio sistema...")
    
    try:
        await init_db()
        logger.info("Database MySQL inizializzato")
    except Exception as e:
        logger.warning(f"Errore inizializzazione DB (potrebbe richiedere MySQL attivo): {e}")
    
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
    description="Sistema Operativo Digitale - LSPD / EMS / Dispatch",
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
        "moduli": ["auth", "lspd", "ems", "dispatch", "timeline"]
    }


@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "mysql",
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


api_router.include_router(auth.router)
api_router.include_router(lspd.router)
api_router.include_router(ems.router)
api_router.include_router(dispatch.router)
api_router.include_router(timeline.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
