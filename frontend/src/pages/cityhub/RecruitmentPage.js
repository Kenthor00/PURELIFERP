import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  ChevronDown,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RecruitmentPage = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'my-applications' | 'manage'
  const [sectors, setSectors] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [sectorApplications, setSectorApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    target_sector: '',
    motivation: '',
    experience: '',
    availability: '',
    additional_info: '',
  });

  // Review modal
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const isAdmin = user?.sector?.toUpperCase() === 'ADMIN';
  const isSectorChief = user?.is_sector_chief;
  const canManage = isAdmin || isSectorChief;

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'my-applications') {
      fetchMyApplications();
    } else if (activeTab === 'manage' && canManage) {
      fetchSectorApplications();
      fetchStats();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/recruitment/available-sectors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSectors(res.data.sectors || []);
    } catch (err) {
      console.error('Error fetching sectors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/recruitment/my-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyApplications(res.data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const fetchSectorApplications = async () => {
    try {
      const sector = isAdmin ? 'LSPD' : user?.sector; // Admin può vedere tutti, mostra LSPD di default
      const res = await axios.get(`${API_URL}/api/recruitment/sector/${sector}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSectorApplications(res.data || []);
    } catch (err) {
      console.error('Error fetching sector applications:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/recruitment/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.target_sector || !formData.motivation) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/recruitment/apply`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Candidatura inviata con successo!');
      setFormData({
        target_sector: '',
        motivation: '',
        experience: '',
        availability: '',
        additional_info: '',
      });
      setActiveTab('my-applications');
      fetchMyApplications();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'invio della candidatura');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (applicationId, status) => {
    try {
      await axios.put(`${API_URL}/api/recruitment/${applicationId}/review`, {
        status,
        notes: reviewNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Candidatura ${status === 'accepted' ? 'accettata' : status === 'rejected' ? 'rifiutata' : 'in revisione'}`);
      setReviewModal(null);
      setReviewNotes('');
      fetchSectorApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella revisione');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'In Attesa' },
      reviewing: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye, label: 'In Revisione' },
      accepted: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Accettata' },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle, label: 'Rifiutata' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center">
        <div className="text-plos-primary animate-pulse font-heading">CARICAMENTO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tactical-bg p-6" data-testid="recruitment-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
            <UserPlus className="text-plos-primary" size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">RECLUTAMENTO</h1>
            <p className="text-plos-text-secondary text-sm">Candidati per un lavoro nei settori governativi</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-plos-border pb-4">
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'apply'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-apply"
          >
            <Send size={14} className="inline mr-2" />
            CANDIDATI
          </button>
          <button
            onClick={() => setActiveTab('my-applications')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'my-applications'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-my-applications"
          >
            <FileText size={14} className="inline mr-2" />
            LE MIE CANDIDATURE
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 font-heading text-sm transition-colors ${
                activeTab === 'manage'
                  ? 'bg-plos-primary text-black'
                  : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
              }`}
              data-testid="tab-manage"
            >
              <Briefcase size={14} className="inline mr-2" />
              GESTISCI
            </button>
          )}
        </div>

        {/* Apply Tab */}
        {activeTab === 'apply' && (
          <div className="card-tactical p-6">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <Send className="text-plos-primary" size={18} />
              NUOVA CANDIDATURA
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Settore di interesse *
                </label>
                <select
                  value={formData.target_sector}
                  onChange={(e) => setFormData({ ...formData, target_sector: e.target.value })}
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                  data-testid="select-sector"
                >
                  <option value="">Seleziona un settore...</option>
                  {sectors.map((sector) => (
                    <option key={sector.value} value={sector.value}>
                      {sector.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Motivazione *
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  rows={4}
                  placeholder="Perché vuoi entrare in questo settore?"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-motivation"
                />
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Esperienza precedente
                </label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={3}
                  placeholder="Hai esperienza simile su altri server o nella vita reale?"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-experience"
                />
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Disponibilità oraria
                </label>
                <input
                  type="text"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="Es: Sera/weekend, 10-20 ore settimanali"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                  data-testid="input-availability"
                />
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Informazioni aggiuntive
                </label>
                <textarea
                  value={formData.additional_info}
                  onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                  rows={2}
                  placeholder="Altre info che ritieni utili..."
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-additional"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-tactical w-full flex items-center justify-center gap-2"
                data-testid="btn-submit-application"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    INVIO IN CORSO...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    INVIA CANDIDATURA
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === 'my-applications' && (
          <div className="space-y-4">
            {myApplications.length === 0 ? (
              <div className="card-tactical p-8 text-center">
                <FileText className="mx-auto text-plos-text-muted mb-4" size={48} />
                <p className="text-plos-text-muted">Non hai ancora inviato candidature</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="btn-tactical mt-4"
                >
                  Candidati ora
                </button>
              </div>
            ) : (
              myApplications.map((app) => (
                <div key={app.id} className="card-tactical p-4" data-testid={`application-${app.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-heading text-plos-primary">{app.target_sector}</span>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-sm text-plos-text-secondary mb-2">{app.motivation}</p>
                      <p className="text-xs text-plos-text-muted">
                        Inviata: {new Date(app.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  {app.reviewer_notes && (
                    <div className="mt-3 p-3 bg-plos-surface/50 border-l-2 border-plos-primary">
                      <p className="text-xs text-plos-text-secondary">Note del revisore:</p>
                      <p className="text-sm">{app.reviewer_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && canManage && (
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{stats.pending}</div>
                  <div className="text-xs text-plos-text-muted">In Attesa</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-blue-400">{stats.reviewing}</div>
                  <div className="text-xs text-plos-text-muted">In Revisione</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-green-400">{stats.accepted}</div>
                  <div className="text-xs text-plos-text-muted">Accettate</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-red-400">{stats.rejected}</div>
                  <div className="text-xs text-plos-text-muted">Rifiutate</div>
                </div>
              </div>
            )}

            {/* Applications List */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg">CANDIDATURE DA REVISIONARE</h3>
              {sectorApplications.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                  <p className="text-plos-text-muted">Nessuna candidatura da revisionare</p>
                </div>
              ) : (
                sectorApplications.map((app) => (
                  <div key={app.id} className="card-tactical p-4" data-testid={`manage-application-${app.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-heading">{app.game_name}</span>
                          <span className="text-xs text-plos-text-muted">da {app.user_sector}</span>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-plos-text-secondary mb-2">
                          <strong>Motivazione:</strong> {app.motivation}
                        </p>
                        {app.experience && (
                          <p className="text-sm text-plos-text-secondary mb-2">
                            <strong>Esperienza:</strong> {app.experience}
                          </p>
                        )}
                        {app.availability && (
                          <p className="text-xs text-plos-text-muted">
                            <strong>Disponibilità:</strong> {app.availability}
                          </p>
                        )}
                        <p className="text-xs text-plos-text-muted mt-2">
                          Inviata: {new Date(app.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      {app.status === 'pending' || app.status === 'reviewing' ? (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setReviewModal({ app, action: 'reviewing' })}
                            className="p-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30"
                            title="In Revisione"
                          >
                            <Eye size={16} className="text-blue-400" />
                          </button>
                          <button
                            onClick={() => setReviewModal({ app, action: 'accepted' })}
                            className="p-2 bg-green-500/20 border border-green-500/50 hover:bg-green-500/30"
                            title="Accetta"
                          >
                            <CheckCircle size={16} className="text-green-400" />
                          </button>
                          <button
                            onClick={() => setReviewModal({ app, action: 'rejected' })}
                            className="p-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30"
                            title="Rifiuta"
                          >
                            <XCircle size={16} className="text-red-400" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border p-6 max-w-md w-full">
            <h3 className="font-heading text-lg mb-4">
              {reviewModal.action === 'reviewing' && 'METTI IN REVISIONE'}
              {reviewModal.action === 'accepted' && 'ACCETTA CANDIDATURA'}
              {reviewModal.action === 'rejected' && 'RIFIUTA CANDIDATURA'}
            </h3>
            <p className="text-sm text-plos-text-secondary mb-4">
              Candidatura di <strong>{reviewModal.app.game_name}</strong> per <strong>{reviewModal.app.target_sector}</strong>
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder="Note (opzionale)..."
              className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setReviewNotes('');
                }}
                className="flex-1 px-4 py-2 border border-plos-border hover:border-plos-text-muted"
              >
                Annulla
              </button>
              <button
                onClick={() => handleReview(reviewModal.app.id, reviewModal.action)}
                className={`flex-1 px-4 py-2 ${
                  reviewModal.action === 'accepted' ? 'bg-green-600' :
                  reviewModal.action === 'rejected' ? 'bg-red-600' :
                  'bg-blue-600'
                }`}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
