"""
PURE LIFE OS - Router Documenti Verificabili con QR
Sistema completo di gestione documenti (ID, patenti, licenze)
con verifica pubblica tramite QR code
"""

import os
import uuid
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from database import get_db
from models import (
    User, Document, DocumentType, DocumentEvent,
    DocumentStatus, DocumentEventType, AuditLog, AuditAction
)
from auth import get_current_user
from rbac import require_permission, has_permission
from services.audit_service import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

# HMAC Secret per firma QR
HMAC_SECRET = os.environ.get('DOCUMENT_HMAC_SECRET', 'default-hmac-secret-change-me')

# Rate limiting cache (semplice in-memory)
verify_rate_limit = {}
RATE_LIMIT_WINDOW = 60  # secondi
RATE_LIMIT_MAX = 30  # richieste per IP


# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class DocumentTypeResponse(BaseModel):
    id: int
    code: str
    name: str
    name_short: str
    description: Optional[str]
    category: str
    issuing_authority: str
    has_expiry: bool
    default_validity_days: Optional[int]
    icon: str
    color: str

    class Config:
        from_attributes = True


class DocumentCreateRequest(BaseModel):
    type_code: str = Field(..., description="Codice tipo documento (es. CARTA_IDENTITA)")
    citizen_id: int = Field(..., description="ID utente cittadino")
    citizen_name: str = Field(..., min_length=1)
    citizen_surname: str = Field(..., min_length=1)
    citizen_dob: Optional[datetime] = None
    citizen_photo_url: Optional[str] = None
    citizen_identifier: Optional[str] = None
    issuing_office: Optional[str] = None
    expires_at: Optional[datetime] = None
    extra_data: Optional[dict] = None
    notes: Optional[str] = None


class DocumentUpdateRequest(BaseModel):
    citizen_photo_url: Optional[str] = None
    issuing_office: Optional[str] = None
    expires_at: Optional[datetime] = None
    extra_data: Optional[dict] = None
    notes: Optional[str] = None
    modification_reason: str = Field(..., min_length=5, description="Motivo modifica obbligatorio")


class DocumentStatusChangeRequest(BaseModel):
    new_status: DocumentStatus
    reason: str = Field(..., min_length=5, description="Motivo cambio stato obbligatorio")


class DocumentEventResponse(BaseModel):
    id: int
    event_type: str
    event_data: Optional[dict]
    old_status: Optional[str]
    new_status: Optional[str]
    reason: Optional[str]
    performed_by_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    document_number: str
    type_code: str
    type_name: str
    type_name_short: str
    type_icon: str
    type_color: str
    issuing_authority: str
    citizen_id: int
    citizen_name: str
    citizen_surname: str
    citizen_full_name: str
    citizen_dob: Optional[datetime]
    citizen_photo_url: Optional[str]
    citizen_identifier: Optional[str]
    issued_by: int
    issued_by_name: str
    issued_at: datetime
    issuing_office: Optional[str]
    expires_at: Optional[datetime]
    is_expired: bool
    status: str
    status_reason: Optional[str]
    status_changed_at: Optional[datetime]
    extra_data: Optional[dict]
    notes: Optional[str]
    qr_url: str
    verify_url: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentVerifyResponse(BaseModel):
    """Risposta pubblica verifica documento (dati limitati per privacy)"""
    valid: bool
    document_type: str
    document_number_masked: str
    holder_name: str
    holder_initials: str
    photo_url: Optional[str]
    status: str
    status_label: str
    issued_at: datetime
    expires_at: Optional[datetime]
    is_expired: bool
    issuing_authority: str
    verified_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


# ==========================================
# FUNZIONI HELPER
# ==========================================

def generate_document_number(type_code: str) -> str:
    """Genera numero documento univoco"""
    prefix = type_code[:3].upper()
    timestamp = datetime.now().strftime("%Y%m%d")
    random_part = secrets.token_hex(4).upper()
    return f"{prefix}-{timestamp}-{random_part}"


def generate_qr_signature(doc_id: str, verify_token: str) -> str:
    """Genera firma HMAC per QR"""
    message = f"{doc_id}:{verify_token}"
    signature = hmac.new(
        HMAC_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature


def verify_qr_signature(doc_id: str, verify_token: str, signature: str) -> bool:
    """Verifica firma HMAC del QR"""
    expected = generate_qr_signature(doc_id, verify_token)
    return hmac.compare_digest(expected, signature)


def check_rate_limit(ip: str) -> bool:
    """Controlla rate limit per IP"""
    now = datetime.now().timestamp()
    
    # Pulisci vecchie entries
    for key in list(verify_rate_limit.keys()):
        if verify_rate_limit[key]['expires'] < now:
            del verify_rate_limit[key]
    
    if ip in verify_rate_limit:
        if verify_rate_limit[ip]['count'] >= RATE_LIMIT_MAX:
            return False
        verify_rate_limit[ip]['count'] += 1
    else:
        verify_rate_limit[ip] = {
            'count': 1,
            'expires': now + RATE_LIMIT_WINDOW
        }
    
    return True


def get_status_label(status: DocumentStatus) -> str:
    """Label italiano per lo stato"""
    labels = {
        DocumentStatus.VALID: "✅ VALIDO",
        DocumentStatus.SUSPENDED: "⚠️ SOSPESO",
        DocumentStatus.REVOKED: "❌ REVOCATO",
        DocumentStatus.EXPIRED: "⏰ SCADUTO"
    }
    return labels.get(status, status.value)


def document_to_response(doc: Document, base_url: str = "") -> DocumentResponse:
    """Converte Document model in response"""
    is_expired = doc.expires_at and doc.expires_at < datetime.now(timezone.utc) if doc.expires_at else False
    
    return DocumentResponse(
        id=doc.id,
        document_number=doc.document_number,
        type_code=doc.document_type.code,
        type_name=doc.document_type.name,
        type_name_short=doc.document_type.name_short,
        type_icon=doc.document_type.icon,
        type_color=doc.document_type.color,
        issuing_authority=doc.document_type.issuing_authority,
        citizen_id=doc.citizen_id,
        citizen_name=doc.citizen_name,
        citizen_surname=doc.citizen_surname,
        citizen_full_name=f"{doc.citizen_name} {doc.citizen_surname}",
        citizen_dob=doc.citizen_dob,
        citizen_photo_url=doc.citizen_photo_url,
        citizen_identifier=doc.citizen_identifier,
        issued_by=doc.issued_by,
        issued_by_name=doc.issued_by_name,
        issued_at=doc.issued_at,
        issuing_office=doc.issuing_office,
        expires_at=doc.expires_at,
        is_expired=is_expired,
        status=doc.status.value,
        status_reason=doc.status_reason,
        status_changed_at=doc.status_changed_at,
        extra_data=doc.extra_data,
        notes=doc.notes,
        qr_url=f"{base_url}/api/documents/qr/{doc.verify_token}",
        verify_url=f"{base_url}/verify/{doc.verify_token}",
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )


# ==========================================
# ENDPOINTS TIPI DOCUMENTO
# ==========================================

@router.get("/types", response_model=List[DocumentTypeResponse])
async def get_document_types(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista tipi documento disponibili"""
    query = select(DocumentType).where(DocumentType.is_active == True)
    
    if category:
        query = query.where(DocumentType.category == category)
    
    result = await db.execute(query.order_by(DocumentType.category, DocumentType.name))
    types = result.scalars().all()
    
    return [DocumentTypeResponse.model_validate(t) for t in types]


# ==========================================
# ENDPOINTS CRUD DOCUMENTI
# ==========================================

@router.post("", response_model=DocumentResponse)
async def create_document(
    request: Request,
    data: DocumentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuovo documento.
    Richiede permesso specifico in base al tipo documento.
    """
    # Trova tipo documento
    result = await db.execute(
        select(DocumentType).where(DocumentType.code == data.type_code)
    )
    doc_type = result.scalar_one_or_none()
    
    if not doc_type:
        raise HTTPException(status_code=404, detail=f"Tipo documento non trovato: {data.type_code}")
    
    # Verifica permessi in base alla categoria
    permission_map = {
        'identity': 'DOC_CREATE_ID',
        'driving': 'DOC_CREATE_LICENSE',
        'permit': 'DOC_CREATE_PERMIT',
        'professional': 'DOC_CREATE_PERMIT'
    }
    required_perm = permission_map.get(doc_type.category, 'DOC_ADMIN')
    
    if not await has_permission(db, current_user, required_perm):
        raise HTTPException(
            status_code=403, 
            detail=f"Permesso richiesto: {required_perm} per emettere {doc_type.name}"
        )
    
    # Verifica cittadino esiste
    result = await db.execute(select(User).where(User.id == data.citizen_id))
    citizen = result.scalar_one_or_none()
    if not citizen:
        raise HTTPException(status_code=404, detail="Cittadino non trovato")
    
    # Genera dati documento
    doc_id = str(uuid.uuid4())
    verify_token = secrets.token_urlsafe(24)[:32]
    qr_signature = generate_qr_signature(doc_id, verify_token)
    document_number = generate_document_number(doc_type.code)
    
    # Calcola scadenza se non fornita
    expires_at = data.expires_at
    if not expires_at and doc_type.has_expiry and doc_type.default_validity_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=doc_type.default_validity_days)
    
    # Crea documento
    document = Document(
        id=doc_id,
        document_number=document_number,
        type_id=doc_type.id,
        citizen_id=data.citizen_id,
        citizen_name=data.citizen_name,
        citizen_surname=data.citizen_surname,
        citizen_dob=data.citizen_dob,
        citizen_photo_url=data.citizen_photo_url,
        citizen_identifier=data.citizen_identifier,
        issued_by=current_user.id,
        issued_by_name=current_user.name or current_user.email,
        issuing_office=data.issuing_office or doc_type.issuing_authority,
        expires_at=expires_at,
        extra_data=data.extra_data,
        notes=data.notes,
        qr_signature=qr_signature,
        verify_token=verify_token,
        status=DocumentStatus.VALID
    )
    
    db.add(document)
    
    # Crea evento creazione
    event = DocumentEvent(
        document_id=doc_id,
        event_type=DocumentEventType.CREATED,
        event_data={"type": doc_type.code, "number": document_number},
        new_status=DocumentStatus.VALID.value,
        performed_by=current_user.id,
        performed_by_name=current_user.name or current_user.email,
        ip_address=request.client.host if request.client else None
    )
    db.add(event)
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db=db,
        user=current_user,
        action=AuditAction.DOC_CREATE,
        entity_type="document",
        entity_id=None,
        description=f"Emesso {doc_type.name_short} n.{document_number} a {data.citizen_name} {data.citizen_surname}",
        extra_data={"doc_id": doc_id, "type": doc_type.code},
        request=request
    )
    
    # Reload con relationships
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc_id)
    )
    document = result.scalar_one()
    
    base_url = str(request.base_url).rstrip('/')
    return document_to_response(document, base_url)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    request: Request,
    citizen_id: Optional[int] = None,
    type_code: Optional[str] = None,
    status: Optional[DocumentStatus] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista documenti con filtri"""
    # Verifica permesso visualizzazione
    can_view_all = await has_permission(db, current_user, 'DOC_VIEW') or await has_permission(db, current_user, 'DOC_ADMIN')
    
    query = select(Document).options(selectinload(Document.document_type))
    
    # Se non ha permesso view, può vedere solo i propri
    if not can_view_all:
        query = query.where(Document.citizen_id == current_user.id)
    elif citizen_id:
        query = query.where(Document.citizen_id == citizen_id)
    
    if type_code:
        query = query.join(DocumentType).where(DocumentType.code == type_code)
    
    if status:
        query = query.where(Document.status == status)
    
    if category:
        query = query.join(DocumentType).where(DocumentType.category == category)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Document.document_number.ilike(search_term),
                Document.citizen_name.ilike(search_term),
                Document.citizen_surname.ilike(search_term)
            )
        )
    
    # Count totale
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Paginazione
    offset = (page - 1) * page_size
    query = query.order_by(Document.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    base_url = str(request.base_url).rstrip('/')
    
    return DocumentListResponse(
        documents=[document_to_response(d, base_url) for d in documents],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    request: Request,
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dettaglio documento"""
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Verifica permesso
    can_view = (
        document.citizen_id == current_user.id or
        await has_permission(db, current_user, 'DOC_VIEW') or
        await has_permission(db, current_user, 'DOC_ADMIN')
    )
    
    if not can_view:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    base_url = str(request.base_url).rstrip('/')
    return document_to_response(document, base_url)


@router.get("/{doc_id}/events", response_model=List[DocumentEventResponse])
async def get_document_events(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Timeline eventi documento"""
    # Verifica documento esiste e permesso
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    can_view = (
        document.citizen_id == current_user.id or
        await has_permission(db, current_user, 'DOC_VIEW') or
        await has_permission(db, current_user, 'DOC_ADMIN')
    )
    
    if not can_view:
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    result = await db.execute(
        select(DocumentEvent)
        .where(DocumentEvent.document_id == doc_id)
        .order_by(DocumentEvent.created_at.desc())
    )
    events = result.scalars().all()
    
    return [DocumentEventResponse(
        id=e.id,
        event_type=e.event_type.value,
        event_data=e.event_data,
        old_status=e.old_status,
        new_status=e.new_status,
        reason=e.reason,
        performed_by_name=e.performed_by_name,
        created_at=e.created_at
    ) for e in events]


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(
    request: Request,
    doc_id: str,
    data: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifica documento (richiede motivo)"""
    # Verifica permesso
    if not await has_permission(db, current_user, 'DOC_UPDATE') and not await has_permission(db, current_user, 'DOC_ADMIN'):
        raise HTTPException(status_code=403, detail="Permesso DOC_UPDATE richiesto")
    
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # Salva vecchi valori per audit
    old_values = {
        "photo_url": document.citizen_photo_url,
        "expires_at": str(document.expires_at) if document.expires_at else None,
        "notes": document.notes
    }
    
    # Aggiorna campi
    if data.citizen_photo_url is not None:
        document.citizen_photo_url = data.citizen_photo_url
    if data.issuing_office is not None:
        document.issuing_office = data.issuing_office
    if data.expires_at is not None:
        document.expires_at = data.expires_at
    if data.extra_data is not None:
        document.extra_data = data.extra_data
    if data.notes is not None:
        document.notes = data.notes
    
    # Crea evento modifica
    event = DocumentEvent(
        document_id=doc_id,
        event_type=DocumentEventType.UPDATED,
        event_data={"old": old_values, "reason": data.modification_reason},
        reason=data.modification_reason,
        performed_by=current_user.id,
        performed_by_name=current_user.name or current_user.email,
        ip_address=request.client.host if request.client else None
    )
    db.add(event)
    
    await db.commit()
    
    # Audit log
    await log_audit(
        db=db,
        user=current_user,
        action=AuditAction.DOC_UPDATE,
        entity_type="document",
        entity_id=None,
        description=f"Modificato documento {document.document_number}: {data.modification_reason}",
        extra_data={"doc_id": doc_id},
        request=request
    )
    
    await db.refresh(document)
    
    base_url = str(request.base_url).rstrip('/')
    return document_to_response(document, base_url)


@router.post("/{doc_id}/status", response_model=DocumentResponse)
async def change_document_status(
    request: Request,
    doc_id: str,
    data: DocumentStatusChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cambia stato documento (sospendi, revoca, riattiva)"""
    # Verifica permesso in base all'azione
    permission_map = {
        DocumentStatus.SUSPENDED: 'DOC_SUSPEND',
        DocumentStatus.REVOKED: 'DOC_REVOKE',
        DocumentStatus.VALID: 'DOC_SUSPEND'  # Riattivazione richiede stesso permesso
    }
    required_perm = permission_map.get(data.new_status, 'DOC_ADMIN')
    
    if not await has_permission(db, current_user, required_perm) and not await has_permission(db, current_user, 'DOC_ADMIN'):
        raise HTTPException(status_code=403, detail=f"Permesso {required_perm} richiesto")
    
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    old_status = document.status
    
    # Aggiorna stato
    document.status = data.new_status
    document.status_reason = data.reason
    document.status_changed_at = datetime.now(timezone.utc)
    document.status_changed_by = current_user.id
    
    # Crea evento
    event = DocumentEvent(
        document_id=doc_id,
        event_type=DocumentEventType.STATUS_CHANGE,
        old_status=old_status.value,
        new_status=data.new_status.value,
        reason=data.reason,
        performed_by=current_user.id,
        performed_by_name=current_user.name or current_user.email,
        ip_address=request.client.host if request.client else None
    )
    db.add(event)
    
    await db.commit()
    
    # Audit log
    action_map = {
        DocumentStatus.SUSPENDED: AuditAction.DOC_SUSPEND,
        DocumentStatus.REVOKED: AuditAction.DOC_REVOKE,
        DocumentStatus.VALID: AuditAction.DOC_REACTIVATE
    }
    
    await log_audit(
        db=db,
        user=current_user,
        action=action_map.get(data.new_status, AuditAction.DOC_UPDATE),
        entity_type="document",
        entity_id=None,
        description=f"Documento {document.document_number} {old_status.value} → {data.new_status.value}: {data.reason}",
        extra_data={"doc_id": doc_id, "old_status": old_status.value, "new_status": data.new_status.value},
        request=request
    )
    
    await db.refresh(document)
    
    base_url = str(request.base_url).rstrip('/')
    return document_to_response(document, base_url)


# ==========================================
# ENDPOINT VERIFICA PUBBLICA (QR)
# ==========================================

@router.get("/verify/{verify_token}", response_model=DocumentVerifyResponse)
async def verify_document_api(
    request: Request,
    verify_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica pubblica documento via token QR.
    Rate limited per prevenire scraping.
    """
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Troppe richieste. Riprova tra un minuto.")
    
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.document_type))
        .where(Document.verify_token == verify_token)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato o link non valido")
    
    # Verifica firma
    if not verify_qr_signature(document.id, verify_token, document.qr_signature):
        logger.warning(f"QR signature mismatch for document {document.id}")
        raise HTTPException(status_code=400, detail="Firma documento non valida")
    
    # Aggiorna stato se scaduto
    is_expired = False
    current_status = document.status
    
    if document.expires_at and document.expires_at < datetime.now(timezone.utc):
        is_expired = True
        if document.status == DocumentStatus.VALID:
            current_status = DocumentStatus.EXPIRED
    
    # Log verifica (senza autenticazione)
    event = DocumentEvent(
        document_id=document.id,
        event_type=DocumentEventType.VERIFIED,
        event_data={"ip": client_ip, "user_agent": request.headers.get("user-agent", "")[:200]},
        performed_by=document.issued_by,  # Usa issuer come fallback
        performed_by_name="Verifica Pubblica",
        ip_address=client_ip
    )
    db.add(event)
    await db.commit()
    
    # Maschera numero documento (mostra solo ultimi 4)
    masked_number = f"***-****-{document.document_number[-4:]}"
    
    # Iniziali nome
    initials = f"{document.citizen_name[0]}.{document.citizen_surname[0]}."
    
    return DocumentVerifyResponse(
        valid=current_status == DocumentStatus.VALID,
        document_type=document.document_type.name,
        document_number_masked=masked_number,
        holder_name=f"{document.citizen_name} {document.citizen_surname}",
        holder_initials=initials,
        photo_url=document.citizen_photo_url,
        status=current_status.value,
        status_label=get_status_label(current_status),
        issued_at=document.issued_at,
        expires_at=document.expires_at,
        is_expired=is_expired,
        issuing_authority=document.document_type.issuing_authority,
        verified_at=datetime.now(timezone.utc)
    )


# ==========================================
# ENDPOINT QR CODE IMAGE
# ==========================================

@router.get("/qr/{verify_token}")
async def get_qr_code(
    request: Request,
    verify_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Genera QR code per documento"""
    result = await db.execute(
        select(Document).where(Document.verify_token == verify_token)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    # URL di verifica
    base_url = str(request.base_url).rstrip('/')
    verify_url = f"{base_url}/verify/{verify_token}"
    
    # Genera QR usando libreria esterna o redirect a servizio
    # Per semplicità, restituiamo l'URL che può essere usato con un generatore QR
    return {
        "verify_url": verify_url,
        "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={verify_url}",
        "document_number": document.document_number
    }


# ==========================================
# STATISTICHE DOCUMENTI
# ==========================================

@router.get("/stats/summary")
async def get_documents_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Statistiche documenti (solo admin/staff)"""
    if not await has_permission(db, current_user, 'DOC_ADMIN') and not await has_permission(db, current_user, 'DOC_VIEW'):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Totale per stato
    status_counts = await db.execute(
        select(Document.status, func.count(Document.id))
        .group_by(Document.status)
    )
    by_status = {row[0].value: row[1] for row in status_counts}
    
    # Totale per tipo
    type_counts = await db.execute(
        select(DocumentType.name_short, func.count(Document.id))
        .join(Document, Document.type_id == DocumentType.id)
        .group_by(DocumentType.id)
    )
    by_type = {row[0]: row[1] for row in type_counts}
    
    # Documenti in scadenza (prossimi 30 giorni)
    expiring_soon = await db.execute(
        select(func.count(Document.id))
        .where(
            and_(
                Document.status == DocumentStatus.VALID,
                Document.expires_at != None,
                Document.expires_at <= datetime.now(timezone.utc) + timedelta(days=30),
                Document.expires_at > datetime.now(timezone.utc)
            )
        )
    )
    
    # Emessi oggi
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    issued_today = await db.execute(
        select(func.count(Document.id))
        .where(Document.created_at >= today_start)
    )
    
    return {
        "by_status": by_status,
        "by_type": by_type,
        "expiring_soon": expiring_soon.scalar() or 0,
        "issued_today": issued_today.scalar() or 0,
        "total": sum(by_status.values())
    }
