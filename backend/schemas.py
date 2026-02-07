"""
PURE LIFE OS - Extended Pydantic Schemas
City Hub, Governo, Giustizia, Chat
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ==========================================
# ENUMS
# ==========================================

class UserRole(str, Enum):
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


class CallPriority(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class CallStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CaseStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    CLOSED = "closed"
    ARCHIVED = "archived"


class AdSlotType(str, Enum):
    PREMIUM_BANNER = "premium_banner"
    STANDARD_CARD = "standard_card"
    SMALL_SLOT = "small_slot"


class AdStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"
    REJECTED = "rejected"


class EventStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventCategory(str, Enum):
    CLUB = "club"
    RISTORANTE = "ristorante"
    CONCESSIONARIO = "concessionario"
    GOVERNO = "governo"
    BENEFICENZA = "beneficenza"
    SPORT = "sport"
    ALTRO = "altro"


class LegalCaseStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEW = "review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class HearingStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"


class UserPresence(str, Enum):
    ONLINE = "online"
    IN_SERVICE = "in_service"
    OFF_DUTY = "off_duty"
    OFFLINE = "offline"


# ==========================================
# AUTH SCHEMAS
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class FiveMExchangeRequest(BaseModel):
    identifier: str
    job: str
    grade: int
    name: str
    phone_number: Optional[str] = None


class FiveMTokenResponse(BaseModel):
    access_token: str
    role: UserRole
    redirect_path: str


# ==========================================
# USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    email: EmailStr
    name: str
    badge_number: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    department: Optional[str] = None
    phone_number: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    badge_number: Optional[str] = None
    department: Optional[str] = None
    phone_number: Optional[str] = None
    sound_enabled: Optional[bool] = None
    presence: Optional[UserPresence] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    sound_enabled: bool
    presence: Optional[UserPresence] = None
    created_at: datetime


class UserPresenceUpdate(BaseModel):
    presence: UserPresence


# ==========================================
# CASE SCHEMAS
# ==========================================

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "normale"
    suspect_name: Optional[str] = None
    suspect_identifier: Optional[str] = None
    location: Optional[str] = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[str] = None
    suspect_name: Optional[str] = None
    suspect_identifier: Optional[str] = None
    location: Optional[str] = None


class CaseResponse(CaseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    case_number: str
    status: CaseStatus
    officer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class CaseDetailResponse(CaseResponse):
    warrants: List["WarrantResponse"] = []
    fines: List["FineResponse"] = []
    evidence: List["EvidenceResponse"] = []
    timeline: List["TimelineEventResponse"] = []


# ==========================================
# WARRANT SCHEMAS
# ==========================================

class WarrantBase(BaseModel):
    subject_name: str
    subject_identifier: Optional[str] = None
    warrant_type: str
    description: Optional[str] = None
    case_id: Optional[int] = None


class WarrantCreate(WarrantBase):
    expires_at: Optional[datetime] = None


class WarrantResponse(WarrantBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    warrant_number: str
    is_active: bool
    issued_by: int
    expires_at: Optional[datetime] = None
    created_at: datetime


# ==========================================
# FINE SCHEMAS
# ==========================================

class FineBase(BaseModel):
    subject_name: str
    subject_identifier: Optional[str] = None
    amount: int
    reason: str
    case_id: Optional[int] = None


class FineCreate(FineBase):
    pass


class FineResponse(FineBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    fine_number: str
    is_paid: bool
    issued_by: int
    created_at: datetime


# ==========================================
# EVIDENCE SCHEMAS
# ==========================================

class EvidenceBase(BaseModel):
    case_id: int
    evidence_type: str
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    metadata_json: Optional[dict] = None


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


# ==========================================
# PATIENT SCHEMAS
# ==========================================

class PatientBase(BaseModel):
    name: str
    identifier: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    phone_number: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientResponse(PatientBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    patient_number: str
    created_at: datetime
    updated_at: datetime


class PatientDetailResponse(PatientResponse):
    reports: List["MedicalReportResponse"] = []
    timeline: List["TimelineEventResponse"] = []


# ==========================================
# MEDICAL REPORT SCHEMAS
# ==========================================

class MedicalReportBase(BaseModel):
    patient_id: int
    diagnosis: str
    treatment: Optional[str] = None
    prescription: Optional[str] = None
    notes: Optional[str] = None
    template_used: Optional[str] = None


class MedicalReportCreate(MedicalReportBase):
    pass


class MedicalReportResponse(MedicalReportBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    report_number: str
    doctor_id: int
    created_at: datetime


# ==========================================
# DISPATCH SCHEMAS
# ==========================================

class DispatchCallBase(BaseModel):
    priority: CallPriority = CallPriority.P3
    call_type: str
    location: str
    description: Optional[str] = None
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None


class DispatchCallCreate(DispatchCallBase):
    pass


class DispatchCallUpdate(BaseModel):
    priority: Optional[CallPriority] = None
    status: Optional[CallStatus] = None
    call_type: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    assigned_units: Optional[List[str]] = None


class DispatchCallResponse(DispatchCallBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    call_number: str
    status: CallStatus
    assigned_units: Optional[List[str]] = None
    created_by: Optional[int] = None
    assigned_by: Optional[int] = None
    created_at: datetime
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ==========================================
# BUSINESS SCHEMAS
# ==========================================

class BusinessBase(BaseModel):
    name: str
    owner_identifier: Optional[str] = None
    owner_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class BusinessCreate(BusinessBase):
    pass


class BusinessResponse(BusinessBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_verified: bool
    created_at: datetime


# ==========================================
# ADVERTISEMENT SCHEMAS
# ==========================================

class AdvertisementBase(BaseModel):
    business_id: int
    slot_type: AdSlotType
    title: str
    description: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AdvertisementCreate(AdvertisementBase):
    pass


class AdvertisementUpdate(BaseModel):
    status: Optional[AdStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AdvertisementResponse(AdvertisementBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: AdStatus
    price_paid: int
    views: int
    clicks: int
    created_at: datetime


# ==========================================
# CITY EVENT SCHEMAS
# ==========================================

class CityEventBase(BaseModel):
    business_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category: EventCategory = EventCategory.ALTRO
    event_date: datetime
    end_date: Optional[datetime] = None
    location: str
    coords_x: Optional[float] = None
    coords_y: Optional[float] = None
    coords_z: Optional[float] = None
    image_url: Optional[str] = None
    max_participants: Optional[int] = None


class CityEventCreate(CityEventBase):
    pass


class CityEventUpdate(BaseModel):
    status: Optional[EventStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None


class CityEventResponse(CityEventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    status: EventStatus
    created_at: datetime


# ==========================================
# NEWS ARTICLE SCHEMAS
# ==========================================

class NewsArticleBase(BaseModel):
    title: str
    subtitle: Optional[str] = None
    content: str
    category: str = "generale"
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    is_breaking_news: bool = False


class NewsArticleCreate(NewsArticleBase):
    pass


class NewsArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_breaking_news: Optional[bool] = None
    is_published: Optional[bool] = None


class NewsArticleResponse(NewsArticleBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    author_id: int
    is_published: bool
    views: int
    published_at: Optional[datetime] = None
    created_at: datetime


# ==========================================
# LEGAL CASE SCHEMAS
# ==========================================

class LegalCaseBase(BaseModel):
    police_case_id: Optional[int] = None
    client_name: str
    client_identifier: Optional[str] = None
    case_type: str
    description: Optional[str] = None


class LegalCaseCreate(LegalCaseBase):
    pass


class LegalCaseUpdate(BaseModel):
    status: Optional[LegalCaseStatus] = None
    description: Optional[str] = None
    lawyer_id: Optional[int] = None
    prosecutor_id: Optional[int] = None


class LegalCaseResponse(LegalCaseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    case_number: str
    lawyer_id: Optional[int] = None
    prosecutor_id: Optional[int] = None
    status: LegalCaseStatus
    created_at: datetime
    updated_at: datetime


# ==========================================
# COURT HEARING SCHEMAS
# ==========================================

class CourtHearingBase(BaseModel):
    legal_case_id: Optional[int] = None
    case_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    courtroom: Optional[str] = None


class CourtHearingCreate(CourtHearingBase):
    pass


class CourtHearingUpdate(BaseModel):
    status: Optional[HearingStatus] = None
    verdict: Optional[str] = None
    minutes: Optional[str] = None
    scheduled_date: Optional[datetime] = None


class CourtHearingResponse(CourtHearingBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    hearing_number: str
    judge_id: Optional[int] = None
    status: HearingStatus
    verdict: Optional[str] = None
    verdict_date: Optional[datetime] = None
    created_at: datetime


# ==========================================
# LEGAL DOCUMENT SCHEMAS
# ==========================================

class LegalDocumentBase(BaseModel):
    legal_case_id: int
    document_type: str
    title: str
    content: Optional[str] = None
    file_url: Optional[str] = None


class LegalDocumentCreate(LegalDocumentBase):
    pass


class LegalDocumentResponse(LegalDocumentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    submitted_by: int
    created_at: datetime


# ==========================================
# CHAT SCHEMAS
# ==========================================

class ChatChannelBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    channel_type: str = "department"
    allowed_roles: Optional[List[str]] = None


class ChatChannelCreate(ChatChannelBase):
    pass


class ChatChannelResponse(ChatChannelBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    created_at: datetime


class ChatMessageBase(BaseModel):
    channel_id: int
    content: str
    message_type: str = "text"
    action_type: Optional[str] = None
    action_data: Optional[dict] = None


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    sender_id: int
    is_pinned: bool
    created_at: datetime
    sender_name: Optional[str] = None


# ==========================================
# TIMELINE SCHEMAS
# ==========================================

class TimelineEventBase(BaseModel):
    event_type: str
    category: str
    title: str
    description: Optional[str] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    metadata_json: Optional[dict] = None


class TimelineEventCreate(TimelineEventBase):
    pass


class TimelineEventResponse(TimelineEventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: Optional[int] = None
    created_at: datetime


# ==========================================
# GENERIC SCHEMAS
# ==========================================

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class HealthResponse(BaseModel):
    status: str
    database: str
    sse_clients: int
    db_connected: bool


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


# Rebuild models
CaseDetailResponse.model_rebuild()
PatientDetailResponse.model_rebuild()
