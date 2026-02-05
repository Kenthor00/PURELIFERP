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
from database import init_db, get_db, engine, async_session, run_auto_migrations, check_tables_exist, check_users_exist
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


async def run_auto_seed():
    """Esegue il seed automatico se il database è vuoto"""
    from passlib.context import CryptContext
    from models import (
        User, UserRole, UserPresence,
        Case, CaseStatus, Patient, MedicalReport,
        DispatchCall, CallPriority, CallStatus,
        Business, CityEvent, EventStatus, EventCategory,
        NewsArticle, CourtHearing, HearingStatus,
        ChatChannel, ChatMessage, TimelineEvent
    )
    from datetime import timedelta
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash("demo123")
    
    DEMO_USERS = [
        {"email": "admin@purelife.rp", "name": "Admin Sistema", "role": UserRole.ADMIN, "badge_number": "ADMIN-001"},
        {"email": "lspd@purelife.rp", "name": "Officer Johnson", "role": UserRole.POLICE, "badge_number": "LSPD-1234", "department": "LSPD"},
        {"email": "ems@purelife.rp", "name": "Dr. Martinez", "role": UserRole.EMS, "badge_number": "EMS-5678", "department": "EMS"},
        {"email": "dispatch@purelife.rp", "name": "Dispatch Central", "role": UserRole.DISPATCH, "badge_number": "DSP-0001", "department": "Dispatch"},
        {"email": "gov@purelife.rp", "name": "Gov. Williams", "role": UserRole.GOVERNMENT, "badge_number": "GOV-0001", "department": "Government"},
        {"email": "judge@purelife.rp", "name": "Judge Thompson", "role": UserRole.JUDGE, "badge_number": "JDG-0001", "department": "Tribunal"},
        {"email": "lawyer@purelife.rp", "name": "Avv. Rossi", "role": UserRole.LAWYER, "badge_number": "LAW-0001"},
        {"email": "prosecutor@purelife.rp", "name": "Proc. Bianchi", "role": UserRole.PROSECUTOR, "badge_number": "PRO-0001", "department": "Procura"},
        {"email": "weazel@purelife.rp", "name": "Reporter Smith", "role": UserRole.WEAZEL, "badge_number": "WZL-0001", "department": "Weazel News"},
        {"email": "citizen@purelife.rp", "name": "Mario Cittadino", "role": UserRole.CITIZEN},
    ]
    
    DEFAULT_CHANNELS = [
        {"name": "dispatch", "display_name": "Dispatch", "description": "Canale principale dispatch", "allowed_roles": ["police", "ems", "dispatch", "admin"]},
        {"name": "lspd", "display_name": "LSPD Radio", "description": "Comunicazioni LSPD", "allowed_roles": ["police", "dispatch", "admin"]},
        {"name": "ems-radio", "display_name": "EMS Radio", "description": "Comunicazioni EMS", "allowed_roles": ["ems", "dispatch", "admin"]},
        {"name": "government", "display_name": "Governo", "description": "Canale governativo", "allowed_roles": ["government", "judge", "admin"]},
        {"name": "tribunal", "display_name": "Tribunale", "description": "Comunicazioni tribunale", "allowed_roles": ["judge", "lawyer", "prosecutor", "government", "admin"]},
        {"name": "city", "display_name": "Annunci Città", "description": "Annunci pubblici", "allowed_roles": None},
    ]
    
    try:
        async with async_session() as db:
            # 1. Crea utenti demo
            for user_data in DEMO_USERS:
                user = User(
                    email=user_data["email"],
                    password_hash=password_hash,
                    name=user_data["name"],
                    role=user_data["role"],
                    badge_number=user_data.get("badge_number"),
                    department=user_data.get("department"),
                    presence=UserPresence.OFFLINE,
                    is_active=True
                )
                db.add(user)
            await db.commit()
            logger.info("Auto-seed: utenti demo creati")
            
            # 2. Crea canali chat
            for ch_data in DEFAULT_CHANNELS:
                channel = ChatChannel(**ch_data)
                db.add(channel)
            await db.commit()
            logger.info("Auto-seed: canali chat creati")
            
            # 3. Crea business demo
            business = Business(
                name="Pure Life Motors",
                owner_name="Tony Stark",
                category="concessionario",
                description="Il miglior concessionario di Los Santos",
                address="Vinewood Blvd 123",
                phone="555-CARS",
                is_verified=True
            )
            db.add(business)
            await db.commit()
            
            # 4. Crea eventi città
            events = [
                {"title": "Gran Premio di Los Santos", "category": EventCategory.SPORT, "location": "Los Santos Racetrack"},
                {"title": "Gala di Beneficenza", "category": EventCategory.BENEFICENZA, "location": "Vinewood Hills Mansion"},
                {"title": "Apertura Club Eclipse", "category": EventCategory.CLUB, "location": "Downtown LS"},
                {"title": "Festival Gastronomico", "category": EventCategory.RISTORANTE, "location": "Vespucci Beach"},
                {"title": "Conferenza Stampa Sindaco", "category": EventCategory.GOVERNO, "location": "City Hall"},
            ]
            for i, ev in enumerate(events):
                event = CityEvent(
                    title=ev["title"],
                    description=f"Descrizione evento {ev['title']}",
                    category=ev["category"],
                    location=ev["location"],
                    event_date=datetime.now(timezone.utc) + timedelta(days=i+1, hours=20),
                    status=EventStatus.APPROVED,
                    business_id=business.id
                )
                db.add(event)
            await db.commit()
            logger.info("Auto-seed: eventi città creati")
            
            # 5. Crea news
            news_data = [
                {"title": "BREAKING: Sparatoria a Grove Street", "category": "cronaca", "is_breaking": True},
                {"title": "Nuova iniziativa del Governo", "category": "politica", "is_breaking": False},
                {"title": "Record di pazienti all'ospedale", "category": "sanità", "is_breaking": False},
                {"title": "Apertura centro commerciale", "category": "economia", "is_breaking": False},
                {"title": "Intervista al capo polizia", "category": "interviste", "is_breaking": False},
            ]
            
            from sqlalchemy import select
            admin_result = await db.execute(select(User).where(User.email == "admin@purelife.rp"))
            admin_user = admin_result.scalar_one()
            
            for n in news_data:
                article = NewsArticle(
                    title=n["title"],
                    subtitle="Sottotitolo news",
                    content=f"Contenuto dell'articolo {n['title']}",
                    category=n["category"],
                    author_id=admin_user.id,
                    is_breaking_news=n["is_breaking"],
                    is_published=True,
                    published_at=datetime.now(timezone.utc),
                    views=50
                )
                db.add(article)
            await db.commit()
            logger.info("Auto-seed: news create")
            
            # 6. Crea casi LSPD
            lspd_result = await db.execute(select(User).where(User.email == "lspd@purelife.rp"))
            lspd_user = lspd_result.scalar_one()
            
            case1 = Case(
                case_number="CASE-2026-1001",
                title="Rapina alla Fleeca Bank",
                description="Rapina a mano armata",
                status=CaseStatus.INVESTIGATING,
                officer_id=lspd_user.id,
                suspect_name="John Doe",
                location="Fleeca Bank Vinewood"
            )
            db.add(case1)
            await db.commit()
            logger.info("Auto-seed: casi LSPD creati")
            
            # 7. Crea paziente EMS
            ems_result = await db.execute(select(User).where(User.email == "ems@purelife.rp"))
            ems_user = ems_result.scalar_one()
            
            patient = Patient(
                patient_number="PAT-2026-0001",
                name="Mario Rossi",
                identifier="ABC123",
                blood_type="A+",
                allergies="Penicillina"
            )
            db.add(patient)
            await db.commit()
            
            report = MedicalReport(
                report_number="REP-2026-0001",
                patient_id=patient.id,
                doctor_id=ems_user.id,
                diagnosis="Trauma cranico lieve",
                treatment="Riposo e osservazione"
            )
            db.add(report)
            await db.commit()
            logger.info("Auto-seed: pazienti EMS creati")
            
            # 8. Crea chiamata dispatch
            call = DispatchCall(
                call_number="CALL-2026-0001",
                priority=CallPriority.P2,
                status=CallStatus.PENDING,
                call_type="Rapina in corso",
                location="Fleeca Bank, Vinewood",
                description="Segnalazione rapina",
                caller_name="Anonimo",
                caller_phone="911"
            )
            db.add(call)
            await db.commit()
            logger.info("Auto-seed: chiamate dispatch create")
            
            # 9. Crea udienza tribunale
            judge_result = await db.execute(select(User).where(User.email == "judge@purelife.rp"))
            judge_user = judge_result.scalar_one()
            
            hearing = CourtHearing(
                hearing_number="UDI-2026-0001",
                title="Udienza Rapina Fleeca",
                description="Prima udienza",
                case_id=case1.id,
                judge_id=judge_user.id,
                scheduled_date=datetime.now(timezone.utc) + timedelta(days=7),
                courtroom="Aula 1",
                status=HearingStatus.SCHEDULED
            )
            db.add(hearing)
            await db.commit()
            logger.info("Auto-seed: udienze create")
            
            logger.info("Auto-seed completato con successo!")
            
    except Exception as e:
        logger.error(f"Errore auto-seed: {e}")


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
            
            # Auto-seed se database vuoto
            users_exist = await check_users_exist()
            if not users_exist:
                logger.info("Database vuoto - esecuzione auto-seed...")
                await run_auto_seed()
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
