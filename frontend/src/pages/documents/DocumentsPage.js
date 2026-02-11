/**
 * PURE LIFE OS - Documents Page
 * Gestione documenti con QR verificabile
 * UI 100% in Italiano
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { OsPanel, OsPageHeader, OsSectionHeader, OsStatCard } from '../../components/os/OsComponents';
import {
  FileText, Plus, Search, Filter, Eye, QrCode, Shield,
  CreditCard, Car, AlertTriangle, CheckCircle2, XCircle,
  Clock, Calendar, User, Building2, RefreshCw, ChevronRight, X
} from 'lucide-react';

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    VALID: 'bg-green-500/20 text-green-400 border-green-500/30',
    SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    REVOKED: 'bg-red-500/20 text-red-400 border-red-500/30',
    EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  const labels = {
    VALID: '✅ Valido',
    SUSPENDED: '⚠️ Sospeso',
    REVOKED: '❌ Revocato',
    EXPIRED: '⏰ Scaduto'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || styles.VALID}`}>
      {labels[status] || status}
    </span>
  );
}

// Document card component
function DocumentCard({ doc, onClick }) {
  const iconMap = {
    CreditCard: CreditCard,
    Car: Car,
    Shield: Shield
  };
  const Icon = iconMap[doc.type_icon] || FileText;
  
  return (
    <div 
      onClick={onClick}
      className="bg-plos-surface p-4 rounded-lg border border-plos-border hover:border-plos-primary/50 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${doc.type_color}20` }}
          >
            <Icon size={20} style={{ color: doc.type_color }} />
          </div>
          <div>
            <h3 className="font-heading font-bold">{doc.type_name_short}</h3>
            <p className="text-xs text-plos-text-muted font-mono">{doc.document_number}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>
      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2">
          <User size={14} className="text-plos-text-muted" />
          <span>{doc.citizen_full_name}</span>
        </p>
        <p className="flex items-center gap-2">
          <Building2 size={14} className="text-plos-text-muted" />
          <span className="text-plos-text-muted">{doc.issuing_authority}</span>
        </p>
        {doc.expires_at && (
          <p className="flex items-center gap-2">
            <Calendar size={14} className="text-plos-text-muted" />
            <span className={doc.is_expired ? 'text-red-400' : 'text-plos-text-muted'}>
              Scade: {new Date(doc.expires_at).toLocaleDateString('it-IT')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// Create document modal
function CreateDocumentModal({ isOpen, onClose, api, documentTypes, onCreated }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    citizen_id: '',
    citizen_name: '',
    citizen_surname: '',
    citizen_identifier: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!selectedType) return;
    setLoading(true);
    try {
      const res = await api.post('/documents', {
        type_code: selectedType.code,
        citizen_id: parseInt(formData.citizen_id),
        citizen_name: formData.citizen_name,
        citizen_surname: formData.citizen_surname,
        citizen_identifier: formData.citizen_identifier || null
      });
      toast.success(`Documento ${res.data.document_number} emesso con successo!`);
      onCreated(res.data);
      onClose();
      setStep(1);
      setSelectedType(null);
      setFormData({ citizen_id: '', citizen_name: '', citizen_surname: '', citizen_identifier: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-background border border-plos-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-plos-border">
          <h2 className="font-heading text-xl font-bold">Emetti Nuovo Documento</h2>
          <button onClick={onClose} className="p-2 hover:bg-plos-surface rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {step === 1 && (
            <div>
              <p className="text-sm text-plos-text-muted mb-4">Seleziona il tipo di documento da emettere:</p>
              <div className="grid grid-cols-2 gap-3">
                {documentTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type); setStep(2); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:border-plos-primary/50 ${
                      selectedType?.id === type.id ? 'border-plos-primary bg-plos-primary/10' : 'border-plos-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${type.color}20` }}
                      >
                        <FileText size={16} style={{ color: type.color }} />
                      </div>
                      <span className="font-medium">{type.name_short}</span>
                    </div>
                    <p className="text-xs text-plos-text-muted">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 2 && selectedType && (
            <div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-plos-surface rounded-lg">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedType.color}20` }}
                >
                  <FileText size={20} style={{ color: selectedType.color }} />
                </div>
                <div>
                  <h3 className="font-bold">{selectedType.name}</h3>
                  <p className="text-xs text-plos-text-muted">{selectedType.issuing_authority}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-plos-text-muted mb-1">ID Cittadino *</label>
                  <input
                    type="number"
                    value={formData.citizen_id}
                    onChange={e => setFormData({...formData, citizen_id: e.target.value})}
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    placeholder="ID utente nel sistema"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-plos-text-muted mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.citizen_name}
                      onChange={e => setFormData({...formData, citizen_name: e.target.value})}
                      className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-plos-text-muted mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={formData.citizen_surname}
                      onChange={e => setFormData({...formData, citizen_surname: e.target.value})}
                      className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-plos-text-muted mb-1">Codice Fiscale / Identificativo</label>
                  <input
                    type="text"
                    value={formData.citizen_identifier}
                    onChange={e => setFormData({...formData, citizen_identifier: e.target.value})}
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    placeholder="Opzionale"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
                >
                  Indietro
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !formData.citizen_id || !formData.citizen_name || !formData.citizen_surname}
                  className="flex-1 px-4 py-3 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80 disabled:opacity-50"
                >
                  {loading ? 'Creazione...' : 'Emetti Documento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Document detail modal
function DocumentDetailModal({ doc, isOpen, onClose, api, onUpdated, permissions }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, type: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    if (isOpen && doc) {
      fetchEvents();
      setActionReason('');
    }
  }, [isOpen, doc]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await api.get(`/documents/${doc.id}/events`);
      setEvents(res.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!actionReason.trim() || actionReason.length < 5) {
      toast.error('La motivazione deve essere di almeno 5 caratteri');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await api.post(`/documents/${doc.id}/status`, {
        new_status: newStatus,
        reason: actionReason
      });
      
      const statusLabels = {
        SUSPENDED: 'sospeso',
        REVOKED: 'revocato',
        VALID: 'riattivato'
      };
      toast.success(`Documento ${statusLabels[newStatus] || 'aggiornato'} con successo!`);
      setActionModal({ open: false, type: null });
      setActionReason('');
      onUpdated(res.data);
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel cambio stato');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !doc) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(doc.verify_url.replace('http://', 'https://'))}`;
  
  // Determina quali azioni sono disponibili
  const canSuspend = doc.status === 'VALID' && (permissions?.DOC_SUSPEND || permissions?.DOC_ADMIN);
  const canRevoke = (doc.status === 'VALID' || doc.status === 'SUSPENDED') && (permissions?.DOC_REVOKE || permissions?.DOC_ADMIN);
  const canReactivate = doc.status === 'SUSPENDED' && (permissions?.DOC_REACTIVATE || permissions?.DOC_ADMIN);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-background border border-plos-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-plos-border">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${doc.type_color}20` }}
            >
              <FileText size={20} style={{ color: doc.type_color }} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">{doc.type_name}</h2>
              <p className="text-sm text-plos-text-muted font-mono">{doc.document_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-plos-surface rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 grid md:grid-cols-2 gap-6">
          {/* Info documento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold">Stato Documento</h3>
              <StatusBadge status={doc.status} />
            </div>
            
            <div className="space-y-3 bg-plos-surface p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-plos-text-muted">Titolare</span>
                <span className="font-medium">{doc.citizen_full_name}</span>
              </div>
              {doc.citizen_identifier && (
                <div className="flex justify-between">
                  <span className="text-plos-text-muted">Codice Fiscale</span>
                  <span className="font-mono text-sm">{doc.citizen_identifier}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-plos-text-muted">Emesso il</span>
                <span>{new Date(doc.issued_at).toLocaleDateString('it-IT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-plos-text-muted">Emesso da</span>
                <span>{doc.issued_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-plos-text-muted">Ente</span>
                <span>{doc.issuing_authority}</span>
              </div>
              {doc.expires_at && (
                <div className="flex justify-between">
                  <span className="text-plos-text-muted">Scadenza</span>
                  <span className={doc.is_expired ? 'text-red-400 font-medium' : ''}>
                    {new Date(doc.expires_at).toLocaleDateString('it-IT')}
                    {doc.is_expired && ' (SCADUTO)'}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="text-center">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
              >
                <QrCode size={18} />
                {showQR ? 'Nascondi QR' : 'Mostra QR Code'}
              </button>
              {showQR && (
                <div className="mt-4 p-4 bg-white rounded-lg inline-block">
                  <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
                  <p className="text-black text-xs mt-2 font-mono">{doc.document_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline eventi */}
          <div>
            <h3 className="font-heading font-bold mb-3">Storico Documento</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingEvents ? (
                <p className="text-center text-plos-text-muted py-4">Caricamento...</p>
              ) : events.length === 0 ? (
                <p className="text-center text-plos-text-muted py-4">Nessun evento</p>
              ) : (
                events.map(event => (
                  <div key={event.id} className="p-3 bg-plos-surface rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{event.event_type}</span>
                      <span className="text-xs text-plos-text-muted">
                        {new Date(event.created_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-xs text-plos-text-muted">
                      {event.performed_by_name}
                      {event.reason && ` - ${event.reason}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function DocumentsPage() {
  const { api } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, typesRes, statsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/documents/types'),
        api.get('/documents/stats/summary').catch(() => ({ data: null }))
      ]);
      setDocuments(docsRes.data.documents || []);
      setDocumentTypes(typesRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento documenti');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (search && !doc.document_number.toLowerCase().includes(search.toLowerCase()) &&
        !doc.citizen_full_name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterStatus && doc.status !== filterStatus) return false;
    if (filterType && doc.type_code !== filterType) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-plos-background text-plos-text p-6">
      <OsPageHeader
        title="Gestione Documenti"
        subtitle="Emissione e verifica documenti con QR code"
        icon={FileText}
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Documenti' }
        ]}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <OsStatCard
            title="Documenti Totali"
            value={stats.total || 0}
            icon={FileText}
            color="blue"
          />
          <OsStatCard
            title="Validi"
            value={stats.by_status?.VALID || 0}
            icon={CheckCircle2}
            color="green"
          />
          <OsStatCard
            title="In Scadenza (30gg)"
            value={stats.expiring_soon || 0}
            icon={Clock}
            color="yellow"
          />
          <OsStatCard
            title="Emessi Oggi"
            value={stats.issued_today || 0}
            icon={Plus}
            color="purple"
          />
        </div>
      )}

      {/* Toolbar */}
      <OsPanel className="mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" />
              <input
                type="text"
                placeholder="Cerca documento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
            >
              <option value="">Tutti gli stati</option>
              <option value="VALID">Validi</option>
              <option value="SUSPENDED">Sospesi</option>
              <option value="REVOKED">Revocati</option>
              <option value="EXPIRED">Scaduti</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
            >
              <option value="">Tutti i tipi</option>
              {documentTypes.map(t => (
                <option key={t.code} value={t.code}>{t.name_short}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80"
            >
              <Plus size={18} />
              Emetti Documento
            </button>
          </div>
        </div>
      </OsPanel>

      {/* Document grid */}
      {loading ? (
        <div className="text-center py-12 text-plos-text-muted">Caricamento...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto mb-4 text-plos-text-muted opacity-30" />
          <p className="text-plos-text-muted">Nessun documento trovato</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => setSelectedDoc(doc)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateDocumentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        api={api}
        documentTypes={documentTypes}
        onCreated={(newDoc) => setDocuments([newDoc, ...documents])}
      />
      
      <DocumentDetailModal
        doc={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        api={api}
        onUpdated={fetchData}
      />
    </div>
  );
}
