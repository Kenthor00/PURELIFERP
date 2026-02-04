"""
PURE LIFE OS - Pydantic Schemas
Validazione input/output API
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    POLICE = "police"
    EMS = "ems"
    DISPATCH = "dispatch"
    ADMIN = "admin"


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


# Auth Schemas
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


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    badge_number: Optional[str] = None
    role: UserRole = UserRole.POLICE
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


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    sound_enabled: bool
    created_at: datetime


# Case Schemas
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


# Warrant Schemas
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


# Fine Schemas
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


# Evidence Schemas
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


# Patient Schemas
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


# Medical Report Schemas
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


# Dispatch Schemas
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
    dispatcher_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


# Timeline Schemas
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


# Outbox Schemas
class OutboxResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    event_type: str
    payload: dict
    status: str
    retry_count: int
    last_error: Optional[str] = None
    created_at: datetime


# Generic Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


# Update forward references
CaseDetailResponse.model_rebuild()
PatientDetailResponse.model_rebuild()
