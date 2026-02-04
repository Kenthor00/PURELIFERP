"""
PURE LIFE OS - SQLAlchemy Models
Schema MySQL completo
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base


class UserRole(str, enum.Enum):
    POLICE = "police"
    EMS = "ems"
    DISPATCH = "dispatch"
    ADMIN = "admin"


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


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    badge_number = Column(String(50), unique=True, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.POLICE)
    department = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)
    fivem_identifier = Column(String(100), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    sound_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    cases = relationship("Case", back_populates="officer", foreign_keys="Case.officer_id")
    warrants = relationship("Warrant", back_populates="issued_by_user")
    fines = relationship("Fine", back_populates="issued_by_user")
    medical_reports = relationship("MedicalReport", back_populates="doctor")


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
