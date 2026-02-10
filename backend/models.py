"""
PURE LIFE OS - Sistema Operativo Governativo RP
Modelli Database Completi con RBAC Avanzato
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum, ForeignKey, JSON, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base


# ==========================================
# ENUMS - SETTORI E STATI
# ==========================================

class Sector(str, enum.Enum):
    """Settori operativi del sistema"""
    LSPD = "LSPD"
    EMS = "EMS"
    GOV = "GOV"
    NEWS = "NEWS"
    DISPATCH = "DISPATCH"
    CIVIL = "CIVIL"
    ADMIN = "ADMIN"  # Staff amministrativo


class UserPresence(str, enum.Enum):
    """Stato presenza utente"""
    ONLINE = "online"
    IN_SERVICE = "in_service"
    OFF_DUTY = "off_duty"
    OFFLINE = "offline"


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


class WarrantStatus(str, enum.Enum):
    """Stati del mandato con ciclo di vita completo"""
    OPEN = "OPEN"           # Mandato attivo
    EXECUTED = "EXECUTED"   # Eseguito
    EXPIRED = "EXPIRED"     # Scaduto
    CANCELLED = "CANCELLED" # Revocato


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


class AuditAction(str, enum.Enum):
    """Azioni tracciabili nel sistema audit"""
    # Login
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    GAME_NAME_SET = "game_name_set"
    
    # Casi LSPD
    CASE_CREATE = "case_create"
    CASE_UPDATE = "case_update"
    CASE_CLOSE = "case_close"
    CASE_ARCHIVE = "case_archive"
    CASE_VIEW = "case_view"
    
    # Mandati e Multe
    WARRANT_CREATE = "warrant_create"
    WARRANT_EXECUTE = "warrant_execute"
    FINE_CREATE = "fine_create"
    FINE_PAY = "fine_pay"
    
    # EMS
    PATIENT_CREATE = "patient_create"
    PATIENT_UPDATE = "patient_update"
    REPORT_CREATE = "report_create"
    REPORT_UPDATE = "report_update"
    
    # Dispatch
    CALL_CREATE = "call_create"
    CALL_ASSIGN = "call_assign"
    CALL_COMPLETE = "call_complete"
    
    # News
    ARTICLE_CREATE = "article_create"
    ARTICLE_PUBLISH = "article_publish"
    ARTICLE_UPDATE = "article_update"
    ARTICLE_DELETE = "article_delete"
    ARTICLE_SUBMIT_REVIEW = "article_submit_review"
    ARTICLE_APPROVE = "article_approve"
    ARTICLE_REJECT = "article_reject"
    ARTICLE_ARCHIVE = "article_archive"
    ARTICLE_BREAKING = "article_breaking"
    
    # Service Chat
    CHAT_MESSAGE_SEND = "chat_message_send"
    CHAT_MESSAGE_DELETE = "chat_message_delete"
    CHAT_MESSAGE_PIN = "chat_message_pin"
    CHAT_MENTION = "chat_mention"
    PRESENCE_CHANGE = "presence_change"
    
    # Push Notifications
    PUSH_SUBSCRIBE = "push_subscribe"
    PUSH_UNSUBSCRIBE = "push_unsubscribe"
    
    # City Hub - Recruitment
    APPLICATION_CREATE = "application_create"
    APPLICATION_REVIEW = "application_review"
    APPLICATION_ACCEPT = "application_accept"
    APPLICATION_REJECT = "application_reject"
    
    # City Hub - Appointments
    APPOINTMENT_CREATE = "appointment_create"
    APPOINTMENT_ACCEPT = "appointment_accept"
    APPOINTMENT_REJECT = "appointment_reject"
    APPOINTMENT_COMPLETE = "appointment_complete"
    APPOINTMENT_CANCEL = "appointment_cancel"
    
    # City Hub - Announcements
    ANNOUNCEMENT_CREATE = "announcement_create"
    ANNOUNCEMENT_APPROVE = "announcement_approve"
    ANNOUNCEMENT_REJECT = "announcement_reject"
    ANNOUNCEMENT_DELETE = "announcement_delete"
    
    # Delete Universale
    RESOURCE_DELETE = "resource_delete"
    BULK_DELETE = "bulk_delete"
    
    # City Hub - Advertising
    AD_SLOT_REQUEST = "ad_slot_request"
    AD_SLOT_APPROVE = "ad_slot_approve"
    AD_SLOT_REJECT = "ad_slot_reject"
    AD_SLOT_CLICK = "ad_slot_click"
    
    # Legacy City Hub
    EVENT_CREATE = "event_create"
    EVENT_APPROVE = "event_approve"
    AD_CREATE = "ad_create"
    AD_APPROVE = "ad_approve"
    
    # Giustizia
    HEARING_CREATE = "hearing_create"
    HEARING_UPDATE = "hearing_update"
    LEGAL_CASE_CREATE = "legal_case_create"
    
    # Gestione Utenti
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DEACTIVATE = "user_deactivate"
    USER_REACTIVATE = "user_reactivate"
    USER_DELETE_HARD = "user_delete_hard"  # Eliminazione definitiva
    GRADE_CHANGE = "grade_change"
    
    # Chat
    MESSAGE_SEND = "message_send"
    CHANNEL_CREATE = "channel_create"
    
    # Sistema
    SYSTEM_BOOTSTRAP = "system_bootstrap"
    EXPORT_DATA = "export_data"


# ==========================================
# GRADI PREDEFINITI PER SETTORE
# ==========================================

SECTOR_GRADES = {
    Sector.LSPD: {
        10: "Capo della Polizia",
        9: "Vice Capo della Polizia",
        8: "Comandante",
        7: "Vice Comandante",
        6: "Capitano",
        5: "Tenente",
        4: "Sottotenente",
        3: "Sergente",
        2: "Agente Senior",
        1: "Agente",
    },
    Sector.EMS: {
        6: "Direttore Sanitario",
        5: "Dirigente Sanitario",
        4: "Primario",
        3: "Dottore",
        2: "Infermiere",
        1: "Soccorritore",
    },
    Sector.GOV: {
        5: "Governatore",
        4: "Procuratore Generale",
        3: "Procuratore Distrettuale",
        2: "Giudice",
        1: "Avvocato",
    },
    Sector.NEWS: {
        4: "Direttore del Giornale",
        3: "Caporedattore",
        2: "Redattore",
        1: "Giornalista",
    },
    Sector.DISPATCH: {
        3: "Capo Centrale Operativa",
        2: "Operatore Senior",
        1: "Operatore Centrale",
    },
    Sector.CIVIL: {
        2: "Imprenditore",
        1: "Cittadino",
    },
    Sector.ADMIN: {
        10: "Super Admin",
        9: "Admin Staff",
    },
}


# ==========================================
# MATRICE PERMESSI
# ==========================================

class Permission(str, enum.Enum):
    """Permessi del sistema"""
    # Lettura base
    VIEW_OWN_SECTOR = "view_own_sector"
    VIEW_PUBLIC = "view_public"
    
    # LSPD
    CREATE_NOTE = "create_note"
    CREATE_REPORT = "create_report"
    UPDATE_CASE = "update_case"
    CLOSE_CASE = "close_case"
    CREATE_WARRANT = "create_warrant"
    MANAGE_LSPD_USERS = "manage_lspd_users"
    VIEW_LSPD_AUDIT = "view_lspd_audit"
    
    # EMS
    CREATE_PATIENT = "create_patient"
    CREATE_MEDICAL_REPORT = "create_medical_report"
    UPDATE_MEDICAL_REPORT = "update_medical_report"
    MANAGE_EMS_USERS = "manage_ems_users"
    VIEW_EMS_AUDIT = "view_ems_audit"
    
    # Dispatch
    CREATE_CALL = "create_call"
    ASSIGN_CALL = "assign_call"
    MANAGE_DISPATCH_USERS = "manage_dispatch_users"
    VIEW_DISPATCH_AUDIT = "view_dispatch_audit"
    
    # News
    CREATE_ARTICLE = "create_article"
    PUBLISH_ARTICLE = "publish_article"
    MANAGE_NEWS_USERS = "manage_news_users"
    VIEW_NEWS_AUDIT = "view_news_audit"
    
    # Gov
    CREATE_HEARING = "create_hearing"
    UPDATE_HEARING = "update_hearing"
    CREATE_LEGAL_CASE = "create_legal_case"
    MANAGE_GOV_USERS = "manage_gov_users"
    VIEW_GOV_AUDIT = "view_gov_audit"
    
    # City Hub
    CREATE_EVENT = "create_event"
    APPROVE_EVENT = "approve_event"
    CREATE_AD = "create_ad"
    APPROVE_AD = "approve_ad"
    
    # Admin
    ADMIN_OVERRIDE = "admin_override"
    VIEW_ALL_AUDIT = "view_all_audit"
    MANAGE_ALL_USERS = "manage_all_users"
    SYSTEM_CONFIG = "system_config"


# Matrice permessi per livello gerarchico
PERMISSION_MATRIX = {
    Sector.LSPD: {
        1: [Permission.VIEW_OWN_SECTOR, Permission.VIEW_PUBLIC],
        2: [Permission.VIEW_OWN_SECTOR, Permission.VIEW_PUBLIC],
        3: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT],
        4: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT],
        5: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE],
        6: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE],
        7: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE, Permission.CLOSE_CASE],
        8: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE, Permission.CLOSE_CASE, Permission.CREATE_WARRANT],
        9: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE, Permission.CLOSE_CASE, Permission.CREATE_WARRANT, Permission.MANAGE_LSPD_USERS, Permission.VIEW_LSPD_AUDIT],
        10: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_NOTE, Permission.CREATE_REPORT, Permission.UPDATE_CASE, Permission.CLOSE_CASE, Permission.CREATE_WARRANT, Permission.MANAGE_LSPD_USERS, Permission.VIEW_LSPD_AUDIT],
    },
    Sector.EMS: {
        1: [Permission.VIEW_OWN_SECTOR, Permission.VIEW_PUBLIC],
        2: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_PATIENT, Permission.CREATE_MEDICAL_REPORT],
        3: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_PATIENT, Permission.CREATE_MEDICAL_REPORT, Permission.UPDATE_MEDICAL_REPORT],
        4: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_PATIENT, Permission.CREATE_MEDICAL_REPORT, Permission.UPDATE_MEDICAL_REPORT],
        5: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_PATIENT, Permission.CREATE_MEDICAL_REPORT, Permission.UPDATE_MEDICAL_REPORT, Permission.MANAGE_EMS_USERS, Permission.VIEW_EMS_AUDIT],
        6: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_PATIENT, Permission.CREATE_MEDICAL_REPORT, Permission.UPDATE_MEDICAL_REPORT, Permission.MANAGE_EMS_USERS, Permission.VIEW_EMS_AUDIT],
    },
    Sector.GOV: {
        1: [Permission.VIEW_OWN_SECTOR, Permission.VIEW_PUBLIC, Permission.CREATE_LEGAL_CASE],
        2: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_HEARING, Permission.UPDATE_HEARING, Permission.CREATE_LEGAL_CASE],
        3: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_HEARING, Permission.UPDATE_HEARING, Permission.CREATE_LEGAL_CASE],
        4: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_HEARING, Permission.UPDATE_HEARING, Permission.CREATE_LEGAL_CASE, Permission.MANAGE_GOV_USERS, Permission.VIEW_GOV_AUDIT],
        5: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_HEARING, Permission.UPDATE_HEARING, Permission.CREATE_LEGAL_CASE, Permission.MANAGE_GOV_USERS, Permission.VIEW_GOV_AUDIT],
    },
    Sector.NEWS: {
        1: [Permission.VIEW_PUBLIC, Permission.CREATE_ARTICLE],
        2: [Permission.VIEW_PUBLIC, Permission.CREATE_ARTICLE],
        3: [Permission.VIEW_PUBLIC, Permission.CREATE_ARTICLE, Permission.PUBLISH_ARTICLE],
        4: [Permission.VIEW_PUBLIC, Permission.CREATE_ARTICLE, Permission.PUBLISH_ARTICLE, Permission.MANAGE_NEWS_USERS, Permission.VIEW_NEWS_AUDIT],
    },
    Sector.DISPATCH: {
        1: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_CALL],
        2: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_CALL, Permission.ASSIGN_CALL],
        3: [Permission.VIEW_OWN_SECTOR, Permission.CREATE_CALL, Permission.ASSIGN_CALL, Permission.MANAGE_DISPATCH_USERS, Permission.VIEW_DISPATCH_AUDIT],
    },
    Sector.CIVIL: {
        1: [Permission.VIEW_PUBLIC],
        2: [Permission.VIEW_PUBLIC, Permission.CREATE_AD, Permission.CREATE_EVENT],
    },
    Sector.ADMIN: {
        9: [Permission.ADMIN_OVERRIDE, Permission.VIEW_ALL_AUDIT, Permission.MANAGE_ALL_USERS, Permission.SYSTEM_CONFIG],
        10: [Permission.ADMIN_OVERRIDE, Permission.VIEW_ALL_AUDIT, Permission.MANAGE_ALL_USERS, Permission.SYSTEM_CONFIG],
    },
}


# ==========================================
# USER MODEL AVANZATO
# ==========================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Dati operativi OBBLIGATORI
    game_name = Column(String(100), nullable=True)  # OBBLIGATORIO al primo login
    sector = Column(Enum(Sector), nullable=False, default=Sector.CIVIL)
    grade = Column(String(100), nullable=False, default="Cittadino")
    hierarchy_level = Column(Integer, nullable=False, default=1)
    is_sector_chief = Column(Boolean, default=False)  # Capo settore
    
    # Dati opzionali
    badge_number = Column(String(50), unique=True, nullable=True)
    department = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)
    fivem_identifier = Column(String(100), unique=True, nullable=True, index=True)
    
    # Stato account
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    lock_until = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    last_failed_login = Column(DateTime, nullable=True)
    
    # Preferenze
    sound_enabled = Column(Boolean, default=True)
    presence = Column(Enum(UserPresence), default=UserPresence.OFFLINE)
    last_seen = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    
    # Soft Delete (eliminazione definitiva)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    cases = relationship("Case", back_populates="officer", foreign_keys="Case.officer_id")
    warrants = relationship("Warrant", back_populates="issued_by_user", foreign_keys="Warrant.issued_by")
    fines = relationship("Fine", back_populates="issued_by_user", foreign_keys="Fine.issued_by")
    medical_reports = relationship("MedicalReport", back_populates="doctor")
    news_articles = relationship("NewsArticle", back_populates="author")
    chat_messages = relationship("ChatMessage", back_populates="author", foreign_keys="ChatMessage.author_id")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def has_permission(self, permission: Permission) -> bool:
        """Verifica se l'utente ha un permesso specifico"""
        if self.sector == Sector.ADMIN:
            return True  # Admin ha tutti i permessi
        
        sector_perms = PERMISSION_MATRIX.get(self.sector, {})
        level_perms = sector_perms.get(self.hierarchy_level, [])
        return permission in level_perms
    
    def can_manage_user(self, target_user: 'User') -> bool:
        """Verifica se può gestire un altro utente"""
        # Admin può gestire tutti
        if self.sector == Sector.ADMIN:
            return True
        
        # Non può gestire admin
        if target_user.sector == Sector.ADMIN:
            return False
        
        # Può gestire solo stesso settore con livello inferiore
        if self.sector != target_user.sector:
            return False
        
        # Deve avere permesso di gestione del proprio settore
        manage_perm = f"manage_{self.sector.value.lower()}_users"
        if not self.has_permission(Permission(manage_perm)):
            return False
        
        return self.hierarchy_level > target_user.hierarchy_level
    
    @property
    def needs_game_name(self) -> bool:
        """Verifica se deve inserire il nome in game"""
        return not self.game_name or len(self.game_name.strip()) == 0
    
    @property
    def role(self):
        """Legacy property: mappa sector a UserRole per retrocompatibilità"""
        from auth import UserRole
        sector_to_role = {
            Sector.ADMIN: UserRole.ADMIN,
            Sector.LSPD: UserRole.POLICE,
            Sector.EMS: UserRole.EMS,
            Sector.DISPATCH: UserRole.DISPATCH,
            Sector.GOV: UserRole.GOVERNMENT,
            Sector.NEWS: UserRole.WEAZEL,
            Sector.CIVIL: UserRole.CIVILIAN,
        }
        return sector_to_role.get(self.sector, UserRole.CIVILIAN)


# ==========================================
# AUDIT LOG MODEL
# ==========================================

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Utente che ha eseguito l'azione
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    game_name = Column(String(100), nullable=True)
    sector = Column(Enum(Sector), nullable=True, index=True)
    grade = Column(String(100), nullable=True)
    hierarchy_level = Column(Integer, nullable=True)
    
    # Azione
    action = Column(Enum(AuditAction), nullable=False, index=True)
    
    # Entità coinvolta
    entity_type = Column(String(50), nullable=True)  # es. "case", "user", "article"
    entity_id = Column(Integer, nullable=True)
    
    # Dettagli
    description = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Dati aggiuntivi, diff, ecc.
    
    # Info connessione
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index('ix_audit_sector_timestamp', 'sector', 'timestamp'),
        Index('ix_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('ix_audit_action_timestamp', 'action', 'timestamp'),
    )


# ==========================================
# LOGIN ATTEMPTS (Rate Limiting)
# ==========================================

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    success = Column(Boolean, default=False)
    user_agent = Column(String(500), nullable=True)
    
    __table_args__ = (
        Index('ix_login_email_timestamp', 'email', 'timestamp'),
        Index('ix_login_ip_timestamp', 'ip_address', 'timestamp'),
    )


# ==========================================
# SYSTEM CONFIG (Bootstrap tracking)
# ==========================================

class SystemConfig(Base):
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# ==========================================
# LSPD MODELS
# ==========================================

class Case(Base):
    __tablename__ = "cases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN, index=True)
    priority = Column(String(20), default="MEDIUM")
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    suspect_name = Column(String(100), nullable=True)
    suspect_identifier = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)
    
    officer = relationship("User", back_populates="cases", foreign_keys=[officer_id])
    warrants = relationship("Warrant", back_populates="case")
    fines = relationship("Fine", back_populates="case")
    evidence = relationship("Evidence", back_populates="case")
    hearings = relationship("CourtHearing", back_populates="case")


class Warrant(Base):
    __tablename__ = "warrants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    warrant_number = Column(String(50), unique=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    suspect_name = Column(String(100), nullable=False)
    suspect_identifier = Column(String(100), nullable=True)
    reason = Column(Text, nullable=False)
    # Ciclo di vita mandato
    status = Column(Enum(WarrantStatus), default=WarrantStatus.OPEN, index=True)
    is_active = Column(Boolean, default=True)  # Legacy, derivato da status
    executed = Column(Boolean, default=False)  # Legacy, derivato da status
    executed_at = Column(DateTime, nullable=True)
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    
    case = relationship("Case", back_populates="warrants")
    issued_by_user = relationship("User", back_populates="warrants", foreign_keys=[issued_by])


class Fine(Base):
    __tablename__ = "fines"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    fine_number = Column(String(50), unique=True, nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    issued_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    citizen_name = Column(String(100), nullable=False)
    citizen_identifier = Column(String(100), nullable=True)
    reason = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    # Rimosso stato pagata - ora è solo per tracciamento
    is_paid = Column(Boolean, default=False)  # Legacy, non usato più nella UI
    paid_at = Column(DateTime, nullable=True)  # Legacy
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    due_date = Column(DateTime, nullable=True)
    # Per modifica - tracking
    last_modified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    modification_reason = Column(Text, nullable=True)
    
    case = relationship("Case", back_populates="fines")
    issued_by_user = relationship("User", back_populates="fines", foreign_keys=[issued_by])


class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    evidence_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    collected_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    collected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    case = relationship("Case", back_populates="evidence")


# ==========================================
# EMS MODELS
# ==========================================

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    identifier = Column(String(100), nullable=True, index=True)
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
    report_number = Column(String(50), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    diagnosis = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_confidential = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    patient = relationship("Patient", back_populates="reports")
    doctor = relationship("User", back_populates="medical_reports")


# ==========================================
# DISPATCH MODELS
# ==========================================

class DispatchCall(Base):
    __tablename__ = "dispatch_calls"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    call_number = Column(String(50), unique=True, nullable=False)
    priority = Column(Enum(CallPriority), default=CallPriority.P2)
    status = Column(Enum(CallStatus), default=CallStatus.PENDING, index=True)
    call_type = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    caller_name = Column(String(100), nullable=True)
    caller_phone = Column(String(20), nullable=True)
    assigned_units = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


# ==========================================
# CITY HUB MODELS
# ==========================================

class Business(Base):
    __tablename__ = "businesses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_name = Column(String(100), nullable=True)
    category = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    address = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    advertisements = relationship("Advertisement", back_populates="business")
    events = relationship("CityEvent", back_populates="business")


class Advertisement(Base):
    __tablename__ = "advertisements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    link_url = Column(String(500), nullable=True)
    slot_type = Column(Enum(AdSlotType), default=AdSlotType.STANDARD_CARD)
    status = Column(Enum(AdStatus), default=AdStatus.PENDING, index=True)
    price_ingame = Column(Float, nullable=True)
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    business = relationship("Business", back_populates="advertisements")


class CityEvent(Base):
    __tablename__ = "city_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(EventCategory), default=EventCategory.ALTRO)
    location = Column(String(200), nullable=True)
    image_url = Column(String(500), nullable=True)
    event_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(Enum(EventStatus), default=EventStatus.PENDING, index=True)
    max_participants = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    business = relationship("Business", back_populates="events")


# ==========================================
# NEWS MODELS
# ==========================================

class NewsArticle(Base):
    __tablename__ = "news_articles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    subtitle = Column(String(300), nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    video_embed_type = Column(String(20), nullable=True)  # youtube, twitch, direct
    is_breaking_news = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False, index=True)
    published_at = Column(DateTime, nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    author = relationship("User", back_populates="news_articles")


# ==========================================
# JUSTICE MODELS
# ==========================================

class LegalCase(Base):
    __tablename__ = "legal_cases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    case_type = Column(String(50), default="CIVIL")
    status = Column(Enum(LegalCaseStatus), default=LegalCaseStatus.DRAFT, index=True)
    plaintiff_name = Column(String(100), nullable=True)
    defendant_name = Column(String(100), nullable=True)
    # Campo avvocato (sostituisce "attore" nella UI)
    lawyer_name = Column(String(100), nullable=True)  # Nome avvocato assegnato
    lawyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prosecutor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    related_case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CourtHearing(Base):
    __tablename__ = "court_hearings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    hearing_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    legal_case_id = Column(Integer, ForeignKey("legal_cases.id"), nullable=True)
    judge_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_date = Column(DateTime, nullable=False)
    courtroom = Column(String(50), nullable=True)
    status = Column(Enum(HearingStatus), default=HearingStatus.SCHEDULED, index=True)
    verdict = Column(Text, nullable=True)
    verdict_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    case = relationship("Case", back_populates="hearings")


# ==========================================
# CHAT MODELS (Legacy - vedi SERVICE CHAT 2.0)
# ==========================================
# ChatChannel e ChatMessage sono definiti nella sezione SERVICE CHAT 2.0


# ==========================================
# TIMELINE / EVENTS
# ==========================================

class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False, index=True)
    category = Column(String(50), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


# ==========================================
# OUTBOX (Prism Billing Integration)
# ==========================================

class Outbox(Base):
    __tablename__ = "outbox"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(Enum(OutboxStatus), default=OutboxStatus.PENDING, index=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=5)
    last_error = Column(Text, nullable=True)
    next_retry_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime, nullable=True)


# ==========================================
# RECRUITMENT (Candidature)
# ==========================================

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    INTERVIEW = "interview"  # Colloquio
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class RecruitmentApplication(Base):
    __tablename__ = "recruitment_applications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Settore target
    target_sector = Column(String(50), nullable=False)
    
    # Dati candidato (utente loggato)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_name = Column(String(100), nullable=False)
    user_sector = Column(String(50), nullable=False)  # Settore attuale del candidato
    
    # Info candidatura
    motivation = Column(Text, nullable=False)
    experience = Column(Text, nullable=True)
    availability = Column(String(200), nullable=True)  # Disponibilità oraria
    additional_info = Column(Text, nullable=True)
    
    # Stato e revisione
    status = Column(String(20), default="pending", index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_game_name = Column(String(100), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    
    # Colloquio
    interview_assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    interview_assigned_name = Column(String(100), nullable=True)
    interview_notes = Column(Text, nullable=True)
    interview_scheduled_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    applicant = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


# ==========================================
# APPOINTMENTS (Appuntamenti)
# ==========================================

class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Settore destinatario
    target_sector = Column(String(50), nullable=False, index=True)
    
    # Richiedente (utente loggato)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requester_game_name = Column(String(100), nullable=False)
    requester_sector = Column(String(50), nullable=False)
    
    # Dettagli appuntamento
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    preferred_date = Column(DateTime, nullable=True)  # Data preferita
    preferred_time = Column(String(50), nullable=True)  # Es: "pomeriggio", "sera"
    urgency = Column(String(20), default="normal")  # low, normal, high
    
    # Stato e gestione
    status = Column(String(20), default="pending", index=True)
    handler_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    handler_game_name = Column(String(100), nullable=True)
    handler_notes = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)  # Data confermata
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    requester = relationship("User", foreign_keys=[requester_id])
    handler = relationship("User", foreign_keys=[handler_id])


# ==========================================
# ANNOUNCEMENTS (Annunci Bacheca)
# ==========================================

class AnnouncementCategory(str, enum.Enum):
    LAVORO = "lavoro"
    VENDITA = "vendita"
    AFFITTI = "affitti"
    SERVIZI = "servizi"
    EVENTI = "eventi"


class AnnouncementStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Autore (utente loggato)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_game_name = Column(String(100), nullable=False)
    author_sector = Column(String(50), nullable=False)
    
    # Contenuto
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(20), nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    contact_info = Column(String(200), nullable=True)  # Telefono, email, etc.
    price = Column(String(50), nullable=True)  # Per vendita/affitti
    location = Column(String(200), nullable=True)
    
    # Stato e moderazione
    status = Column(String(20), default="pending", index=True)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    moderator_game_name = Column(String(100), nullable=True)
    moderator_notes = Column(Text, nullable=True)
    
    # Durata
    expires_at = Column(DateTime, nullable=True)  # Scadenza annuncio
    
    # Stats
    views = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    moderator = relationship("User", foreign_keys=[moderator_id])


# ==========================================
# ADVERTISING SLOTS (Slot Pubblicitari)
# ==========================================

class AdSlotStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    EXPIRED = "expired"


class AdSlotPosition(str, enum.Enum):
    HOMEPAGE_BANNER = "homepage_banner"
    SIDEBAR = "sidebar"
    FOOTER = "footer"
    POPUP = "popup"


class AdvertisingSlot(Base):
    __tablename__ = "advertising_slots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Richiedente/Acquirente
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner_game_name = Column(String(100), nullable=False)
    owner_sector = Column(String(50), nullable=False)
    business_name = Column(String(200), nullable=False)  # Nome azienda/attività
    
    # Contenuto pubblicitario
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500), nullable=True)
    position = Column(String(30), nullable=False)
    
    # Stato e approvazione
    status = Column(String(20), default="pending", index=True)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approver_game_name = Column(String(100), nullable=True)
    approver_notes = Column(Text, nullable=True)
    
    # Durata
    starts_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    duration_days = Column(Integer, default=7)
    
    # Stats e tracking
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships


# ==========================================
# NOTIFICATIONS (Sistema Notifiche Real-Time)
# ==========================================

class NotificationType(str, enum.Enum):
    """Tipi di notifica"""
    # Recruitment
    RECRUITMENT_NEW = "recruitment_new"
    RECRUITMENT_STATUS_CHANGE = "recruitment_status_change"
    RECRUITMENT_INTERVIEW = "recruitment_interview"
    
    # Appointments
    APPOINTMENT_NEW = "appointment_new"
    APPOINTMENT_ACCEPTED = "appointment_accepted"
    APPOINTMENT_REJECTED = "appointment_rejected"
    APPOINTMENT_COMPLETED = "appointment_completed"
    
    # News
    ARTICLE_PUBLISHED = "article_published"
    ARTICLE_BREAKING = "article_breaking"
    ARTICLE_REVIEW_NEEDED = "article_review_needed"
    ARTICLE_APPROVED = "article_approved"
    ARTICLE_REJECTED = "article_rejected"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    CHAT_MENTION = "chat_mention"
    
    # Announcements
    ANNOUNCEMENT_PENDING = "announcement_pending"
    ANNOUNCEMENT_APPROVED = "announcement_approved"
    ANNOUNCEMENT_REJECTED = "announcement_rejected"
    
    # Advertising
    AD_SLOT_REQUESTED = "ad_slot_requested"
    AD_SLOT_ACTIVATED = "ad_slot_activated"
    AD_SLOT_EXPIRED = "ad_slot_expired"
    AD_SLOT_REJECTED = "ad_slot_rejected"
    
    # System
    SYSTEM_ALERT = "system_alert"


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Destinatario
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = globale per settore
    target_sector = Column(String(50), nullable=True)  # Settore destinatario (se user_id è NULL)
    is_global = Column(Boolean, default=False)  # Per Admin/GOV
    
    # Contenuto
    notification_type = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Riferimento entità
    entity_type = Column(String(50), nullable=True)  # recruitment, appointment, announcement, ad_slot
    entity_id = Column(Integer, nullable=True)
    
    # Mittente (chi ha generato la notifica)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_game_name = Column(String(100), nullable=True)
    sender_sector = Column(String(50), nullable=True)
    
    # Stato
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])



# ==========================================
# WEAZEL NEWS 2.0 (Sistema Editoriale)
# ==========================================

class ArticleStatus(str, enum.Enum):
    """Stati workflow articolo"""
    DRAFT = "draft"           # Bozza
    REVIEW = "review"         # In revisione
    APPROVED = "approved"     # Approvato
    PUBLISHED = "published"   # Pubblicato
    ARCHIVED = "archived"     # Archiviato


class ArticleCategory(str, enum.Enum):
    """Categorie articoli"""
    CRONACA = "cronaca"
    POLITICA = "politica"
    EVENTI = "eventi"
    SPORT = "sport"
    COMUNICATI = "comunicati"
    ECONOMIA = "economia"
    INTRATTENIMENTO = "intrattenimento"


class Article(Base):
    """Articolo Weazel News"""
    __tablename__ = "articles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Contenuto
    title = Column(String(200), nullable=False)
    subtitle = Column(String(300), nullable=True)
    content = Column(Text, nullable=False)  # HTML/rich text
    excerpt = Column(Text, nullable=True)   # Anteprima
    
    # Media (solo URL)
    cover_image_url = Column(String(500), nullable=True)
    gallery_urls = Column(JSON, nullable=True)  # Lista URL immagini
    video_url = Column(String(500), nullable=True)  # YouTube/Twitch embed
    
    # Categorizzazione
    category = Column(String(50), default="cronaca", index=True)
    tags = Column(JSON, nullable=True)  # Lista tag
    
    # Autore
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_game_name = Column(String(100), nullable=False)
    author_sector = Column(String(50), nullable=False)
    
    # Workflow
    status = Column(String(20), default="draft", index=True)
    is_breaking = Column(Boolean, default=False, index=True)
    is_official = Column(Boolean, default=False)  # Comunicato ufficiale
    
    # Revisione
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_game_name = Column(String(100), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Pubblicazione
    published_at = Column(DateTime, nullable=True)
    published_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    published_by_name = Column(String(100), nullable=True)
    
    # Archiviazione
    archived_at = Column(DateTime, nullable=True)
    archived_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Stats
    views = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    published_by = relationship("User", foreign_keys=[published_by_id])


# ==========================================
# SERVICE CHAT 2.0 (Chat Interna)
# ==========================================

class ChatChannelType(str, enum.Enum):
    """Tipi di canale chat"""
    SECTOR = "sector"      # Canale di settore
    STAFF = "staff"        # Staff/Admin
    GENERAL = "general"    # Generale


class ChatChannel(Base):
    """Canale chat"""
    __tablename__ = "chat_channels"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    channel_type = Column(String(20), default="sector")
    
    # Accesso
    sector = Column(String(50), nullable=True)  # Settore associato (NULL = tutti)
    min_level = Column(Integer, default=1)      # Livello minimo per accesso
    
    # Stato
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Messages relationship
    messages = relationship("ChatMessage", back_populates="channel", lazy="dynamic")


class ChatMessage(Base):
    """Messaggio chat"""
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Canale
    channel_id = Column(Integer, ForeignKey("chat_channels.id"), nullable=False, index=True)
    
    # Autore
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_game_name = Column(String(100), nullable=False)
    author_sector = Column(String(50), nullable=False)
    author_grade = Column(String(50), nullable=True)
    
    # Contenuto
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, link, announcement
    
    # Menzioni - lista di user_id menzionati come JSON array
    mentions = Column(JSON, nullable=True, default=list)  # [1, 2, 3] = user_ids
    
    # Stato
    is_pinned = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships
    channel = relationship("ChatChannel", back_populates="messages")
    author = relationship("User", foreign_keys=[author_id])
    deleted_by = relationship("User", foreign_keys=[deleted_by_id])


class UserPresenceRecord(Base):
    """Record presenza utente per chat"""
    __tablename__ = "user_presence"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Stato
    status = Column(String(20), default="offline", index=True)  # online, in_service, off_duty, offline
    status_message = Column(String(100), nullable=True)
    
    # Ultima attività
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_channel_id = Column(Integer, ForeignKey("chat_channels.id"), nullable=True)
    
    # Timestamps
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ==========================================
# WEB PUSH NOTIFICATIONS
# ==========================================

class PushSubscription(Base):
    """Subscription Web Push per utente"""
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Subscription data (from browser)
    # Endpoint URL può essere lungo, usiamo 500 chars per MySQL compatibility
    endpoint = Column(String(500), nullable=False, unique=True)
    p256dh_key = Column(String(255), nullable=False)  # Public key
    auth_key = Column(String(255), nullable=False)    # Auth secret
    
    # Device info
    user_agent = Column(String(500), nullable=True)
    device_name = Column(String(100), nullable=True)
    
    # Preferenze
    is_active = Column(Boolean, default=True)
    notify_recruitment = Column(Boolean, default=True)
    notify_appointments = Column(Boolean, default=True)
    notify_breaking_news = Column(Boolean, default=True)
    notify_chat = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])



# ==========================================
# MAP POI (Punti di Interesse Custom)
# ==========================================

class POICategory(str, enum.Enum):
    """Categorie POI per mappa custom"""
    GOVERNO = "governo"
    POLIZIA = "polizia"
    OSPEDALE = "ospedale"
    COMMERCIALE = "commerciale"
    RESIDENZIALE = "residenziale"
    INDUSTRIALE = "industriale"
    INTRATTENIMENTO = "intrattenimento"
    SERVIZI = "servizi"
    ALTRO = "altro"


class MapPOI(Base):
    """Punto di interesse sulla mappa custom"""
    __tablename__ = "map_pois"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Posizione sulla mappa (percentuali relative all'immagine)
    x_percent = Column(Float, nullable=False)  # 0-100
    y_percent = Column(Float, nullable=False)  # 0-100
    
    # Informazioni POI
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(POICategory), default=POICategory.ALTRO)
    icon = Column(String(50), nullable=True)  # Nome icona lucide
    color = Column(String(20), nullable=True)  # Colore hex o nome
    
    # Metadata
    address = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(200), nullable=True)
    
    # Stato
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)  # Visibile a tutti o solo staff
    
    # Tracciamento
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
