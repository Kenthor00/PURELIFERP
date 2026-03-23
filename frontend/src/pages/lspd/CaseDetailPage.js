import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { toast } from 'sonner';
import {
  FileText, ArrowLeft, Clock, MapPin, User, AlertTriangle,
  DollarSign, Image, Plus, Edit, Save, X, Trash2, Upload,
  Camera, FileVideo, File, CheckCircle
} from 'lucide-react';

const EVIDENCE_TYPES = [
  { value: 'photo', label: 'Fotografia', icon: Camera },
  { value: 'video', label: 'Video', icon: FileVideo },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'other', label: 'Altro', icon: File },
];

export const CaseDetailPage = () => {
  const { id } = useParams();
  const { api, user } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  // Evidence state
  const [evidence, setEvidence] = useState([]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    evidence_type: 'photo',
    description: '',
    file_url: ''
  });
  const [savingEvidence, setSavingEvidence] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    try {
      const [caseRes, evidenceRes] = await Promise.all([
        api.get(`/lspd/cases/${id}`),
        api.get(`/lspd/evidence/${id}`).catch(() => ({ data: [] }))
      ]);
      setCaseData(caseRes.data);
      setEvidence(evidenceRes.data || []);
      setEditForm({
        title: caseRes.data.title,
        description: caseRes.data.description || '',
        status: caseRes.data.status,
        priority: caseRes.data.priority,
        suspect_name: caseRes.data.suspect_name || '',
        suspect_identifier: caseRes.data.suspect_identifier || '',
        location: caseRes.data.location || '',
      });
    } catch (error) {
      console.error('Errore fetch caso:', error);
      toast.error('Errore nel caricamento del caso');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      play('click');
      await api.put(`/lspd/cases/${id}`, editForm);
      play('success');
      toast.success('Caso aggiornato');
      setEditing(false);
      fetchCase();
    } catch (error) {
      play('error');
      toast.error('Errore nel salvataggio');
    }
  };

  const handleAddEvidence = async () => {
    if (!evidenceForm.title) {
      toast.error('Inserisci un titolo per la prova');
      return;
    }

    setSavingEvidence(true);
    try {
      await api.post('/lspd/evidence', {
        case_id: parseInt(id),
        ...evidenceForm
      });
      toast.success('Prova aggiunta con successo');
      setShowEvidenceModal(false);
      setEvidenceForm({ title: '', evidence_type: 'photo', description: '', file_url: '' });
      fetchCase();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'aggiunta della prova');
    } finally {
      setSavingEvidence(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa prova?')) return;
    
    try {
      await api.delete(`/lspd/evidence/${evidenceId}`);
      toast.success('Prova eliminata');
      setEvidence(prev => prev.filter(e => e.id !== evidenceId));
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'open': 'text-orange-500 border-orange-500 bg-orange-500/10',
      'investigating': 'text-blue-500 border-blue-500 bg-blue-500/10',
      'closed': 'text-lime-500 border-lime-500 bg-lime-500/10',
      'archived': 'text-gray-500 border-gray-500 bg-gray-500/10',
    };
    return colors[status] || 'text-plos-text-muted border-plos-border';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'APERTO',
      'investigating': 'IN CORSO',
      'closed': 'CHIUSO',
      'archived': 'ARCHIVIATO',
    };
    return labels[status] || status?.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-plos-primary animate-pulse">Caricamento caso...</div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-8">
        <p className="text-plos-text-secondary">Caso non trovato</p>
        <button onClick={() => navigate('/lspd/cases')} className="btn-tactical mt-4">
          Torna ai casi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="case-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => { play('click'); navigate('/lspd/cases'); }}
            className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-2 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Torna ai casi</span>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm text-plos-primary">{caseData.case_number}</span>
            <span className={`px-3 py-1 text-xs font-heading rounded border ${getStatusColor(caseData.status)}`}>
              {getStatusLabel(caseData.status)}
            </span>
            {caseData.priority === 'urgente' && (
              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                URGENTE
              </span>
            )}
          </div>
          
          {editing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded text-xl font-heading focus:border-plos-primary focus:outline-none"
            />
          ) : (
            <h1 className="font-heading text-2xl tracking-wider">{caseData.title}</h1>
          )}
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2 border border-plos-border hover:border-red-500/50 rounded"
              >
                <X size={20} className="text-red-400" />
              </button>
              <button
                onClick={handleSave}
                className="btn-tactical flex items-center gap-2"
                data-testid="save-case-btn"
              >
                <Save size={18} />
                SALVA
              </button>
            </>
          ) : (
            <button
              onClick={() => { play('click'); setEditing(true); }}
              className="btn-tactical flex items-center gap-2"
              data-testid="edit-case-btn"
            >
              <Edit size={18} />
              MODIFICA
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-plos-border">
        {[
          { id: 'details', label: 'Dettagli', icon: FileText },
          { id: 'evidence', label: `Prove (${evidence.length})`, icon: Image },
          { id: 'related', label: 'Collegati', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-heading border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-plos-primary text-plos-primary' 
                : 'border-transparent text-plos-text-secondary hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-tactical p-4">
              <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                DETTAGLI CASO
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-plos-text-secondary text-xs tracking-wider font-heading">DESCRIZIONE</label>
                  {editing ? (
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-plos-surface border border-plos-border rounded min-h-[100px] focus:border-plos-primary focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm mt-1">{caseData.description || 'Nessuna descrizione'}</p>
                  )}
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-plos-text-secondary text-xs tracking-wider font-heading flex items-center gap-1">
                      <User size={12} /> SOSPETTO
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.suspect_name}
                        onChange={(e) => setEditForm({ ...editForm, suspect_name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-plos-surface border border-plos-border rounded focus:border-plos-primary focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm mt-1">{caseData.suspect_name || '-'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-plos-text-secondary text-xs tracking-wider font-heading flex items-center gap-1">
                      <MapPin size={12} /> LUOGO
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-plos-surface border border-plos-border rounded focus:border-plos-primary focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm mt-1">{caseData.location || '-'}</p>
                    )}
                  </div>
                </div>
                
                {editing && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-plos-text-secondary text-xs tracking-wider font-heading">STATO</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-plos-surface border border-plos-border rounded focus:border-plos-primary focus:outline-none"
                      >
                        <option value="open">Aperto</option>
                        <option value="investigating">In Corso</option>
                        <option value="closed">Chiuso</option>
                        <option value="archived">Archiviato</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-plos-text-secondary text-xs tracking-wider font-heading">PRIORITÀ</label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-plos-surface border border-plos-border rounded focus:border-plos-primary focus:outline-none"
                      >
                        <option value="normale">Normale</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Timeline */}
          <div className="space-y-6">
            <div className="card-tactical p-4">
              <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
                <Clock size={18} className="text-plos-primary" />
                TIMELINE
              </h2>
              
              {caseData.timeline?.length === 0 ? (
                <p className="text-plos-text-muted text-sm">Nessun evento</p>
              ) : (
                <div className="space-y-3">
                  {caseData.timeline?.slice(0, 8).map((event) => (
                    <div key={event.id} className="border-l-2 border-plos-border pl-3 py-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-plos-text-muted mt-1">
                        {new Date(event.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {/* Evidence Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <Image size={18} className="text-purple-500" />
              PROVE RACCOLTE ({evidence.length})
            </h2>
            <button
              onClick={() => setShowEvidenceModal(true)}
              className="btn-tactical flex items-center gap-2"
              data-testid="add-evidence-btn"
            >
              <Plus size={16} />
              AGGIUNGI PROVA
            </button>
          </div>

          {/* Evidence Grid */}
          {evidence.length === 0 ? (
            <div className="card-tactical p-8 text-center">
              <Image className="mx-auto mb-4 text-plos-text-muted" size={48} />
              <p className="text-plos-text-secondary mb-4">Nessuna prova allegata a questo caso</p>
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="btn-tactical"
              >
                <Plus size={16} className="inline mr-2" />
                Aggiungi la prima prova
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {evidence.map((e) => {
                const TypeIcon = EVIDENCE_TYPES.find(t => t.value === e.evidence_type)?.icon || File;
                return (
                  <div key={e.id} className="card-tactical p-4 group" data-testid={`evidence-${e.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded">
                          <TypeIcon size={20} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{e.title}</p>
                          <p className="text-xs text-plos-text-muted capitalize">{e.evidence_type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvidence(e.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                        title="Elimina prova"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                    {e.description && (
                      <p className="text-xs text-plos-text-secondary mt-3 line-clamp-2">{e.description}</p>
                    )}
                    {e.file_url && (
                      <a
                        href={e.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-plos-primary hover:underline mt-2 block truncate"
                      >
                        Visualizza file →
                      </a>
                    )}
                    <p className="text-[10px] text-plos-text-muted mt-3">
                      {new Date(e.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'related' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Warrants */}
          <div className="card-tactical p-4">
            <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              MANDATI ({caseData.warrants?.length || 0})
            </h2>
            
            {caseData.warrants?.length === 0 ? (
              <p className="text-plos-text-muted text-sm">Nessun mandato collegato</p>
            ) : (
              <div className="space-y-2">
                {caseData.warrants?.map((w) => (
                  <div key={w.id} className="p-3 bg-black/30 border border-plos-border rounded">
                    <p className="font-mono text-xs text-orange-500">{w.warrant_number}</p>
                    <p className="text-sm mt-1">{w.subject_name || w.suspect_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fines */}
          <div className="card-tactical p-4">
            <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-red-500" />
              MULTE ({caseData.fines?.length || 0})
            </h2>
            
            {caseData.fines?.length === 0 ? (
              <p className="text-plos-text-muted text-sm">Nessuna multa collegata</p>
            ) : (
              <div className="space-y-2">
                {caseData.fines?.map((f) => (
                  <div key={f.id} className="p-3 bg-black/30 border border-plos-border rounded">
                    <p className="font-mono text-xs text-red-500">{f.fine_number}</p>
                    <p className="text-sm mt-1">{f.citizen_name} - €{f.amount}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">AGGIUNGI PROVA</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="p-1">
                <X size={20} className="text-plos-text-muted" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">TITOLO *</label>
                <input
                  type="text"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  placeholder="Es: Screenshot Discord"
                />
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">TIPO</label>
                <select
                  value={evidenceForm.evidence_type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                >
                  {EVIDENCE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">DESCRIZIONE</label>
                <textarea
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  rows={3}
                  placeholder="Descrizione della prova..."
                />
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">URL FILE (opzionale)</label>
                <input
                  type="url"
                  value={evidenceForm.file_url}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, file_url: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEvidenceModal(false)}
                  className="flex-1 px-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-white"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddEvidence}
                  disabled={savingEvidence}
                  className="flex-1 px-4 py-2 bg-plos-primary/20 border border-plos-primary/50 hover:bg-plos-primary/30 rounded-lg text-plos-primary font-heading flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  {savingEvidence ? 'SALVATAGGIO...' : 'AGGIUNGI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetailPage;
