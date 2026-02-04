import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import {
  FileText,
  ArrowLeft,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  DollarSign,
  Image,
  Plus,
  Edit,
  Save,
  X,
} from 'lucide-react';

export const CaseDetailPage = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/lspd/cases/${id}`);
      setCaseData(res.data);
      setEditForm({
        title: res.data.title,
        description: res.data.description || '',
        status: res.data.status,
        priority: res.data.priority,
        suspect_name: res.data.suspect_name || '',
        suspect_identifier: res.data.suspect_identifier || '',
        location: res.data.location || '',
      });
    } catch (error) {
      console.error('Errore fetch caso:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      play('click');
      await api.put(`/lspd/cases/${id}`, editForm);
      play('success');
      setEditing(false);
      fetchCase();
    } catch (error) {
      play('error');
      console.error('Errore salvataggio:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-orange-500 border-orange-500';
      case 'investigating': return 'text-blue-500 border-blue-500';
      case 'closed': return 'text-green-500 border-green-500';
      default: return 'text-plos-text-muted border-plos-border';
    }
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
            onClick={() => {
              play('click');
              navigate('/lspd/cases');
            }}
            className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-2"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Torna ai casi</span>
          </button>
          
          <div className="flex items-center gap-3">
            <span className="mono text-sm text-plos-primary">{caseData.case_number}</span>
            <span className={`status-badge ${getStatusColor(caseData.status)}`}>
              {caseData.status}
            </span>
          </div>
          
          {editing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="input-tactical text-2xl font-heading mt-2 w-full"
            />
          ) : (
            <h1 className="font-heading text-2xl tracking-wider mt-2">{caseData.title}</h1>
          )}
        </div>
        
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2 border border-plos-border hover:border-plos-alert"
              >
                <X size={20} className="text-plos-alert" />
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
              onClick={() => {
                play('click');
                setEditing(true);
              }}
              className="btn-tactical flex items-center gap-2"
              data-testid="edit-case-btn"
            >
              <Edit size={18} />
              MODIFICA
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <div className="card-tactical p-4">
            <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              DETTAGLI CASO
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-plos-text-secondary text-xs tracking-wider font-heading">
                  DESCRIZIONE
                </label>
                {editing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input-tactical w-full mt-1 min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm mt-1">{caseData.description || 'Nessuna descrizione'}</p>
                )}
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-plos-text-secondary text-xs tracking-wider font-heading flex items-center gap-1">
                    <User size={12} />
                    SOSPETTO
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.suspect_name}
                      onChange={(e) => setEditForm({ ...editForm, suspect_name: e.target.value })}
                      className="input-tactical w-full mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{caseData.suspect_name || '-'}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-plos-text-secondary text-xs tracking-wider font-heading flex items-center gap-1">
                    <MapPin size={12} />
                    LUOGO
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="input-tactical w-full mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{caseData.location || '-'}</p>
                  )}
                </div>
              </div>
              
              {editing && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-plos-text-secondary text-xs tracking-wider font-heading">
                      STATO
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="input-tactical w-full mt-1"
                    >
                      <option value="open">Aperto</option>
                      <option value="investigating">In Corso</option>
                      <option value="closed">Chiuso</option>
                      <option value="archived">Archiviato</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-plos-text-secondary text-xs tracking-wider font-heading">
                      PRIORITÀ
                    </label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="input-tactical w-full mt-1"
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

          {/* Evidence */}
          <div className="card-tactical p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
                <Image size={18} className="text-purple-500" />
                PROVE ({caseData.evidence?.length || 0})
              </h2>
              <button className="btn-tactical text-xs flex items-center gap-1">
                <Plus size={14} />
                AGGIUNGI
              </button>
            </div>
            
            {caseData.evidence?.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessuna prova allegata
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {caseData.evidence?.map((e) => (
                  <div key={e.id} className="p-3 bg-black/30 border border-plos-border">
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-plos-text-secondary mt-1">{e.evidence_type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Items */}
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
                  <div key={w.id} className="p-2 bg-black/30 border border-plos-border text-sm">
                    <p className="mono text-xs text-orange-500">{w.warrant_number}</p>
                    <p>{w.subject_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                  <div key={f.id} className="p-2 bg-black/30 border border-plos-border text-sm">
                    <p className="mono text-xs text-red-500">{f.fine_number}</p>
                    <p>{f.subject_name} - €{f.amount}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card-tactical p-4">
            <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
              <Clock size={18} className="text-plos-primary" />
              TIMELINE
            </h2>
            
            {caseData.timeline?.length === 0 ? (
              <p className="text-plos-text-muted text-sm">Nessun evento</p>
            ) : (
              <div className="space-y-0">
                {caseData.timeline?.slice(0, 8).map((event) => (
                  <div key={event.id} className="timeline-item text-sm">
                    <p className="font-medium">{event.title}</p>
                    <p className="mono text-xs text-plos-text-muted mt-1">
                      {new Date(event.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
