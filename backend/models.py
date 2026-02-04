"""
PURE LIFE OS - Extended Models
City Hub, Governo, Giustizia, Chat
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base


# ==========================================
# ENUMS ESTESI
# ==========================================

class UserRole(str, enum.Enum):
    POLICE = "police"
    EMS = "ems"
    DISPATCH = "dispatch"
    ADMIN = "admin"
    GOVERNMENT = "government"
    JUDGE = "judge"
    LAWYER = "lawyer"
    PROSECUTOR = "prosecutor"
    WEAZEL = "weazel"
    CITIZEN = "citizen"


class CallPriority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class CallStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CaseStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    CLOSED = "closed"
    ARCHIVED = "archived"


class OutboxStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class AdSlotType(str, enum.Enum):
    PREMIUM_BANNER = "premium_banner"
    STANDARD_CARD = "standard_card"
    SMALL_SLOT = "small_slot"


class AdStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"
    REJECTED = "rejected"


class EventStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCategory(str, enum.Enum):
    CLUB = "club"
    RISTORANTE = "ristorante"
    CONCESSIONARIO = "concessionario"
    GOVERNO = "governo"
    BENEFICENZA = "beneficenza"
    SPORT = "sport"
    ALTRO = "altro"


class LegalCaseStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEW = "review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class HearingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


class UserPresence(str, enum.Enum):
    ONLINE = "online"
    IN_SERVICE = "in_service"
    OFF_DUTY = "off_duty"
    OFFLINE = "offline"


# ==========================================
# USER MODEL ESTESO
# ==========================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    badge_number = Column(String(50), unique=True, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CITIZEN)
    department = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)
    fivem_identifier = Column(String(100), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    sound_enabled = Column(Boolean, default=True)
    presence = Column(Enum(UserPresence), default=UserPresence.OFFLINE)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    cases = relationship("Case", back_populates="officer", foreign_keys="Case.officer_id")
    warrants = relationship("Warrant", back_populates="issued_by_user")
    fines = relationship("Fine", back_populates="issued_by_user")
    medical_reports = relationship("MedicalReport", back_populates="doctor")
    news_articles = relationship("NewsArticle", back_populates="author")
    chat_messages = relationship("ChatMessage", back_populates="sender")


# ==========================================
# LSPD MODELS
# ==========================================

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN)
    priority = Column(String(10), default="normale")
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    suspect_name = Column(String(100), nullable=True)
    suspect_identifier = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    officer = relationship("User", back_populates="cases", foreign_keys=[officer_id])
    warrants = relationship("Warrant", back_populates="case")
    fines = relationship("Fine", back_populates="case")
    evidence = relationship("Evidence", back_populates="case")
    hearings = relationship("CourtHearing", back_populates="case")


class Warrant(Base):
    __tablename__ = "warrants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    warrant_number = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    subject_name = Column(String(100), nullable=False)
    subject_identifier = Column(String(100), nullable=True)
    warrant_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    case = relationship("Case", back_populates="warrants")
    issued_by_user = relationship("User", back_populates="warrants")


class Fine(Base):
    __tablename__ = "fines"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    fine_number = Column(String(50), unique=True, nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    subject_name = Column(String(100), nullable=False)
    subject_identifier = Column(String(100), nullable=True)
    amount = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    is_paid = Column(Boolean, default=False)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    case = relationship("Case", back_populates="fines")
    issued_by_user = relationship("User", back_populates="fines")


class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    case = relationship("Case", back_populates="evidence")


# ==========================================
# EMS MODELS
# ==========================================

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    identifier = Column(String(100), nullable=True, index=True)
    date_of_birth = Column(DateTime, nullable=True)
    blood_type = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    phone_number = Column(String(20), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    reports = relationship("MedicalReport", back_populates="patient")


class MedicalReport(Base):
    __tablename__ = "medical_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    report_number = Column(String(50), unique=True, nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diagnosis = Column(Text, nullable=False)
    treatment = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    template_used = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    patient = relationship("Patient", back_populates="reports")
    doctor = relationship("User", back_populates="medical_reports")


# ==========================================
# DISPATCH MODELS
# ==========================================

class DispatchCall(Base):
    __tablename__ = "dispatch_calls"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    call_number = Column(String(50), unique=True, nullable=False, index=True)
    priority = Column(Enum(CallPriority), nullable=False, default=CallPriority.P3)
    status = Column(Enum(CallStatus), nullable=False, default=CallStatus.PENDING)
    call_type = Column(String(50), nullable=False)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    caller_name = Column(String(100), nullable=True)
    caller_phone = Column(String(20), nullable=True)
    assigned_units = Column(JSON, nullable=True)
    dispatcher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ==========================================
# CITY HUB - PUBBLICITÀ
# ==========================================

class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    owner_identifier = Column(String(100), nullable=True, index=True)
    owner_name = Column(String(100), nullable=True)
    category = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    address = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    ads = relationship("Advertisement", back_populates="business")
    events = relationship("CityEvent", back_populates="business")


class Advertisement(Base):
    __tablename__ = "advertisements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    slot_type = Column(Enum(AdSlotType), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500), nullable=True)
    status = Column(Enum(AdStatus), default=AdStatus.PENDING)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    price_paid = Column(Integer, default=0)
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    business = relationship("Business", back_populates="ads")


# ==========================================
# CITY HUB - EVENTI
# ==========================================

class CityEvent(Base):
    __tablename__ = "city_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(EventCategory), default=EventCategory.ALTRO)
    event_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=False)
    coords_x = Column(Float, nullable=True)
    coords_y = Column(Float, nullable=True)
    coords_z = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.PENDING)
    max_participants = Column(Integer, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    business = relationship("Business", back_populates="events")


# ==========================================
# WEAZEL NEWS
# ==========================================

class NewsArticle(Base):
    __tablename__ = "news_articles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), default="generale")
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    is_breaking_news = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    author = relationship("User", back_populates="news_articles")


# ==========================================
# GOVERNO & GIUSTIZIA
# ==========================================

class LegalCase(Base):
    __tablename__ = "legal_cases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    police_case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    client_name = Column(String(100), nullable=False)
    client_identifier = Column(String(100), nullable=True)
    lawyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prosecutor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    case_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(LegalCaseStatus), default=LegalCaseStatus.DRAFT)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    hearings = relationship("CourtHearing", back_populates="legal_case")
    documents = relationship("LegalDocument", back_populates="legal_case")


class CourtHearing(Base):
    __tablename__ = "court_hearings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    hearing_number = Column(String(50), unique=True, nullable=False, index=True)
    legal_case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    judge_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=False)
    courtroom = Column(String(50), nullable=True)
    status = Column(Enum(HearingStatus), default=HearingStatus.SCHEDULED)
    verdict = Column(Text, nullable=True)
    verdict_date = Column(DateTime, nullable=True)
    minutes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    legal_case = relationship("LegalCase", back_populates="hearings")
    case = relationship("Case", back_populates="hearings")


class LegalDocument(Base):
    __tablename__ = "legal_documents"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    legal_case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    legal_case = relationship("LegalCase", back_populates="documents")


# ==========================================
# SERVICE CHAT
# ==========================================

class ChatChannel(Base):
    __tablename__ = "chat_channels"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    channel_type = Column(String(20), default="department")
    allowed_roles = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    messages = relationship("ChatMessage", back_populates="channel")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    channel_id = Column(Integer, ForeignKey("chat_channels.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")
    action_type = Column(String(50), nullable=True)
    action_data = Column(JSON, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    channel = relationship("ChatChannel", back_populates="messages")
    sender = relationship("User", back_populates="chat_messages")


# ==========================================
# TIMELINE & SYSTEM
# ==========================================

class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False, index=True)
    category = Column(String(20), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class Outbox(Base):
    __tablename__ = "outbox"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(Enum(OutboxStatus), default=OutboxStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
