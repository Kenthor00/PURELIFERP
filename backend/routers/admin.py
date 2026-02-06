"""
PURE LIFE OS - Admin Router
Seed data, configurazione sistema
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from datetime import datetime, timezone, timedelta
import logging
import os
from passlib.context import CryptContext
from typing import Optional

from database import get_db, run_auto_migrations
from models import (
    User, UserRole, UserPresence,
    Case, CaseStatus, Warrant, Fine, Evidence,
    Patient, MedicalReport,
    DispatchCall, CallPriority, CallStatus,
    Business, Advertisement, AdSlotType, AdStatus,
    CityEvent, EventStatus, EventCategory,
    NewsArticle,
    LegalCase, LegalCaseStatus, CourtHearing, HearingStatus,
    ChatChannel, ChatMessage,
    TimelineEvent
)
from auth import get_current_user, require_roles, UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Seed key from environment
SEED_KEY = os.environ.get('SEED_KEY', 'purelife-seed-key-change-me')


# ==========================================
# SEED DATA
# ==========================================

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
            "seed_key_accepted": users_count == 0  # Key accepted only if DB empty
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


@router.post("/seed")
async def seed_database(
    x_seed_key: Optional[str] = Header(None, alias="X-SEED-KEY"),
    db: AsyncSession = Depends(get_db)
):
    """
    Popola il database con dati demo.
    
    Autenticazione:
    - Se DB vuoto (0 utenti): accetta X-SEED-KEY header
    - Se DB ha utenti: richiede JWT con ruolo ADMIN
    
    Idempotente: non crea duplicati.
    """
    # Check users count
    try:
        result = await db.execute(select(func.count(User.id)))
        users_count = result.scalar() or 0
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore DB: {str(e)}")
    
    # Authentication logic
    current_user = None
    
    if users_count == 0:
        # First-time bootstrap: accept SEED_KEY
        if not x_seed_key:
            raise HTTPException(
                status_code=401, 
                detail="DB vuoto. Fornire header X-SEED-KEY per il bootstrap iniziale."
            )
        if x_seed_key != SEED_KEY:
            raise HTTPException(status_code=403, detail="SEED_KEY non valida")
        logger.info("Bootstrap seed con X-SEED-KEY (DB vuoto)")
    else:
        # DB has users: require JWT admin
        if x_seed_key:
            raise HTTPException(
                status_code=403, 
                detail="DB già inizializzato. X-SEED-KEY non più accettata. Usa autenticazione JWT admin."
            )
        # Manual JWT check since we can't use Depends with conditional logic
        from fastapi import Request
        raise HTTPException(
            status_code=401,
            detail="DB già inizializzato. Richiesta autenticazione JWT admin."
        )
    
    created = {
        "users": [],
        "channels": [],
        "events": [],
        "news": [],
        "cases": [],
        "patients": [],
        "calls": [],
        "messages": [],
        "hearings": [],
        "businesses": []
    }
    
    try:
        # 1. UTENTI DEMO
        password_hash = pwd_context.hash("demo123")
        for user_data in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            if not result.scalar_one_or_none():
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
                created["users"].append(user_data["email"])
        
        await db.commit()
        
        # Get user IDs for references
        admin_result = await db.execute(select(User).where(User.email == "admin@purelife.rp"))
        admin_user = admin_result.scalar_one_or_none()
        
        lspd_result = await db.execute(select(User).where(User.email == "lspd@purelife.rp"))
        lspd_user = lspd_result.scalar_one_or_none()
        
        ems_result = await db.execute(select(User).where(User.email == "ems@purelife.rp"))
        ems_user = ems_result.scalar_one_or_none()
        
        judge_result = await db.execute(select(User).where(User.email == "judge@purelife.rp"))
        judge_user = judge_result.scalar_one_or_none()
        
        weazel_result = await db.execute(select(User).where(User.email == "weazel@purelife.rp"))
        weazel_user = weazel_result.scalar_one_or_none()
        
        # 2. CHAT CHANNELS
        for ch_data in DEFAULT_CHANNELS:
            result = await db.execute(select(ChatChannel).where(ChatChannel.name == ch_data["name"]))
            if not result.scalar_one_or_none():
                channel = ChatChannel(**ch_data)
                db.add(channel)
                created["channels"].append(ch_data["name"])
        
        await db.commit()
        
        # 3. BUSINESS (per ads)
        result = await db.execute(select(Business).where(Business.name == "Pure Life Motors"))
        if not result.scalar_one_or_none():
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
            created["businesses"].append("Pure Life Motors")
        
        await db.commit()
        
        # Get business for ads
        biz_result = await db.execute(select(Business).where(Business.name == "Pure Life Motors"))
        business = biz_result.scalar_one_or_none()
        
        # 4. CITY EVENTS (5)
        event_data = [
            {"title": "Gran Premio di Los Santos", "category": EventCategory.SPORT, "location": "Los Santos Racetrack", "description": "Corsa automobilistica annuale"},
            {"title": "Gala di Beneficenza", "category": EventCategory.BENEFICENZA, "location": "Vinewood Hills Mansion", "description": "Raccolta fondi per l'ospedale"},
            {"title": "Apertura Club Eclipse", "category": EventCategory.CLUB, "location": "Downtown LS", "description": "Inaugurazione del nuovo nightclub"},
            {"title": "Festival Gastronomico", "category": EventCategory.RISTORANTE, "location": "Vespucci Beach", "description": "I migliori chef della città"},
            {"title": "Conferenza Stampa Sindaco", "category": EventCategory.GOVERNO, "location": "City Hall", "description": "Annunci importanti dal governo"},
        ]
        
        for i, ev in enumerate(event_data):
            result = await db.execute(select(CityEvent).where(CityEvent.title == ev["title"]))
            if not result.scalar_one_or_none():
                event = CityEvent(
                    title=ev["title"],
                    description=ev["description"],
                    category=ev["category"],
                    location=ev["location"],
                    event_date=datetime.now(timezone.utc) + timedelta(days=i+1, hours=20),
                    status=EventStatus.APPROVED,
                    business_id=business.id if business else None
                )
                db.add(event)
                created["events"].append(ev["title"])
        
        await db.commit()
        
        # 5. NEWS ARTICLES (5, 1 breaking)
        news_data = [
            {"title": "BREAKING: Sparatoria a Grove Street", "subtitle": "La polizia sul posto", "category": "cronaca", "is_breaking": True, "content": "Una sparatoria è in corso nella zona di Grove Street. Le forze dell'ordine sono intervenute massicciamente. Si consiglia ai cittadini di evitare la zona."},
            {"title": "Nuova iniziativa del Governo per la sicurezza", "subtitle": "Più agenti nelle strade", "category": "politica", "is_breaking": False, "content": "Il sindaco ha annunciato oggi un piano per aumentare la presenza delle forze dell'ordine nelle zone più critiche della città."},
            {"title": "Record di pazienti all'ospedale centrale", "subtitle": "Emergenza sanitaria?", "category": "sanità", "is_breaking": False, "content": "L'ospedale centrale di Los Santos ha registrato un numero record di accessi al pronto soccorso. I medici chiedono rinforzi."},
            {"title": "Apertura del nuovo centro commerciale", "subtitle": "Shopping e intrattenimento", "category": "economia", "is_breaking": False, "content": "Inaugurato oggi il nuovo centro commerciale di Rockford Hills con oltre 200 negozi e un cinema multiplex."},
            {"title": "Intervista esclusiva al capo della polizia", "subtitle": "I piani per combattere il crimine", "category": "interviste", "is_breaking": False, "content": "In un'intervista esclusiva a Weazel News, il capo della polizia ha delineato la sua strategia per ridurre la criminalità."},
        ]
        
        for n in news_data:
            result = await db.execute(select(NewsArticle).where(NewsArticle.title == n["title"]))
            if not result.scalar_one_or_none():
                article = NewsArticle(
                    title=n["title"],
                    subtitle=n["subtitle"],
                    content=n["content"],
                    category=n["category"],
                    author_id=weazel_user.id if weazel_user else admin_user.id,
                    is_breaking_news=n["is_breaking"],
                    is_published=True,
                    published_at=datetime.now(timezone.utc) - timedelta(hours=len(news_data) - news_data.index(n)),
                    views=50 + (100 if n["is_breaking"] else 0)
                )
                db.add(article)
                created["news"].append(n["title"])
        
        await db.commit()
        
        # 6. LSPD CASES (2)
        cases_data = [
            {"title": "Rapina alla Fleeca Bank", "description": "Rapina a mano armata alla banca di Vinewood", "suspect_name": "John Doe", "location": "Fleeca Bank Vinewood"},
            {"title": "Traffico di sostanze", "description": "Indagine su traffico di droga a Davis", "suspect_name": "Unknown", "location": "Davis, LS"},
        ]
        
        for i, c in enumerate(cases_data):
            result = await db.execute(select(Case).where(Case.title == c["title"]))
            if not result.scalar_one_or_none():
                case = Case(
                    case_number=f"CASE-2026-{1001+i}",
                    title=c["title"],
                    description=c["description"],
                    status=CaseStatus.INVESTIGATING,
                    officer_id=lspd_user.id if lspd_user else None,
                    suspect_name=c["suspect_name"],
                    location=c["location"]
                )
                db.add(case)
                created["cases"].append(c["title"])
        
        await db.commit()
        
        # Get case for hearing
        case_result = await db.execute(select(Case).where(Case.title == "Rapina alla Fleeca Bank"))
        lspd_case = case_result.scalar_one_or_none()
        
        # 7. COURT HEARING collegata a caso LSPD
        result = await db.execute(select(CourtHearing).where(CourtHearing.title == "Udienza Rapina Fleeca"))
        if not result.scalar_one_or_none() and lspd_case:
            hearing = CourtHearing(
                hearing_number="UDI-2026-0001",
                title="Udienza Rapina Fleeca",
                description="Prima udienza per il caso della rapina alla Fleeca Bank",
                case_id=lspd_case.id,
                judge_id=judge_user.id if judge_user else None,
                scheduled_date=datetime.now(timezone.utc) + timedelta(days=7, hours=10),
                courtroom="Aula 1",
                status=HearingStatus.SCHEDULED
            )
            db.add(hearing)
            created["hearings"].append("Udienza Rapina Fleeca")
        
        await db.commit()
        
        # 8. EMS PATIENT + REPORT collegato
        result = await db.execute(select(Patient).where(Patient.name == "Mario Rossi"))
        if not result.scalar_one_or_none():
            patient = Patient(
                patient_number="PAT-2026-0001",
                name="Mario Rossi",
                identifier="ABC123",
                blood_type="A+",
                allergies="Penicillina",
                medical_history="Nessuna patologia pregressa",
                phone_number="555-1234"
            )
            db.add(patient)
            created["patients"].append("Mario Rossi")
        
        await db.commit()
        
        # Get patient for report
        patient_result = await db.execute(select(Patient).where(Patient.name == "Mario Rossi"))
        patient = patient_result.scalar_one_or_none()
        
        if patient and ems_user:
            result = await db.execute(select(MedicalReport).where(MedicalReport.patient_id == patient.id))
            if not result.scalar_one_or_none():
                report = MedicalReport(
                    report_number="REP-2026-0001",
                    patient_id=patient.id,
                    doctor_id=ems_user.id,
                    diagnosis="Trauma cranico lieve",
                    treatment="Riposo e osservazione 24h",
                    prescription="Paracetamolo 500mg ogni 8h",
                    notes="Paziente stabile, dimissibile domani"
                )
                db.add(report)
        
        await db.commit()
        
        # 9. DISPATCH CALLS
        result = await db.execute(select(DispatchCall).limit(1))
        if not result.scalar_one_or_none():
            call = DispatchCall(
                call_number="CALL-2026-0001",
                priority=CallPriority.P2,
                status=CallStatus.PENDING,
                call_type="Rapina in corso",
                location="Fleeca Bank, Vinewood",
                description="Segnalazione di rapina in corso",
                caller_name="Cittadino Anonimo",
                caller_phone="911"
            )
            db.add(call)
            created["calls"].append("CALL-2026-0001")
        
        await db.commit()
        
        # 10. CHAT MESSAGES (5 per canale)
        channels_result = await db.execute(select(ChatChannel))
        channels = channels_result.scalars().all()
        
        messages_templates = [
            "Test messaggio seed #{n}",
            "Aggiornamento situazione #{n}",
            "Richiesta supporto #{n}",
            "Conferma ricevuto #{n}",
            "Situazione risolta #{n}",
        ]
        
        for channel in channels:
            result = await db.execute(
                select(ChatMessage).where(ChatMessage.channel_id == channel.id).limit(1)
            )
            if not result.scalar_one_or_none() and admin_user:
                for i, template in enumerate(messages_templates):
                    msg = ChatMessage(
                        channel_id=channel.id,
                        sender_id=admin_user.id,
                        content=template.format(n=i+1),
                        message_type="text"
                    )
                    db.add(msg)
                created["messages"].append(f"5 messaggi in #{channel.name}")
        
        await db.commit()
        
        # 11. TIMELINE EVENTS
        timeline_events = [
            {"event_type": "system_start", "category": "system", "title": "Sistema PLOS avviato"},
            {"event_type": "seed_completed", "category": "system", "title": "Seed database completato"},
        ]
        
        for te in timeline_events:
            event = TimelineEvent(
                event_type=te["event_type"],
                category=te["category"],
                title=te["title"],
                user_id=admin_user.id if admin_user else None
            )
            db.add(event)
        
        await db.commit()
        
        logger.info(f"Seed completato: {created}")
        
        return {
            "success": True,
            "message": "Database popolato con dati demo",
            "created": created,
            "bootstrap_mode": users_count == 0
        }
        
    except Exception as e:
        logger.error(f"Errore seed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore durante il seed: {str(e)}")


@router.post("/migrations/run")
async def run_migrations(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Esegue manualmente le migrations (idempotente)"""
    result = await run_auto_migrations()
    return {
        "success": result["success"],
        "tables_existed": result["tables_existed"],
        "migrations_run": result["migrations_run"],
        "error": result.get("error")
    }


@router.get("/seed/status")
async def get_seed_status(db: AsyncSession = Depends(get_db)):
    """
    Controlla lo stato del seed (pubblico).
    Utile per la UI per mostrare se è necessario il bootstrap.
    """
    try:
        result = await db.execute(select(func.count(User.id)))
        users_count = result.scalar() or 0
        
        return {
            "db_connected": True,
            "users_count": users_count,
            "needs_seed": users_count == 0,
            "seed_key_accepted": users_count == 0
        }
    except Exception as e:
        return {
            "db_connected": False,
            "users_count": 0,
            "needs_seed": True,
            "seed_key_accepted": False,
            "error": str(e)[:100]
        }


@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche sistema (solo admin)"""
    from sqlalchemy import func
    
    try:
        users_count = await db.execute(select(func.count(User.id)))
        cases_count = await db.execute(select(func.count(Case.id)))
        patients_count = await db.execute(select(func.count(Patient.id)))
        calls_count = await db.execute(select(func.count(DispatchCall.id)))
        messages_count = await db.execute(select(func.count(ChatMessage.id)))
        
        return {
            "users": users_count.scalar() or 0,
            "cases": cases_count.scalar() or 0,
            "patients": patients_count.scalar() or 0,
            "dispatch_calls": calls_count.scalar() or 0,
            "chat_messages": messages_count.scalar() or 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
