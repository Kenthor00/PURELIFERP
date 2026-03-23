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
  Filter,
  ArrowUpDown,
  Briefcase,
  MessageSquare,
  Calendar,
  User,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RecruitmentPage = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('apply');
  const [sectors, setSectors] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [sectorApplications, setSectorApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filtri
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  
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
  const [interviewDate, setInterviewDate] = useState('');
  
  // Profile view modal
  const [profileModal, setProfileModal] = useState(null);

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
      const sector = isAdmin ? 'LSPD' : user?.sector;
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
      const payload = {
        status,
        notes: reviewNotes
      };
      
      // Se è colloquio, aggiungi data
      if (status === 'interview' && interviewDate) {
        payload.interview_scheduled_at = interviewDate;
        payload.interview_assigned_to = user.id;
      }
      
      await axios.put(`${API_URL}/api/recruitment/${applicationId}/review`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const statusLabels = {
        reviewing: 'in revisione',
        interview: 'convocata a colloquio',
        accepted: 'accettata',
        rejected: 'rifiutata'
      };
      
      toast.success(`Candidatura ${statusLabels[status]}`);
      setReviewModal(null);
      setReviewNotes('');
      setInterviewDate('');
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
      interview: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: MessageSquare, label: 'Colloquio' },
      accepted: { color: 'bg-lime-500/20 text-lime-400 border-lime-500/50', icon: CheckCircle, label: 'Accettata' },
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

  // Filtra e ordina candidature
  const filteredApplications = sectorApplications
    .filter(app => !statusFilter || app.status === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center">
        <div className="text-plos-primary animate-pulse font-heading">CARICAMENTO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tactical-bg p-6 pt-16" data-testid="recruitment-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
            <UserPlus className="text-plos-primary" size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">RECLUTAMENTO</h1>
            <p className="text-plos-text-secondary text-sm">Sistema di candidature per i settori governativi</p>
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
                  Motivazione * <span className="text-plos-text-muted">(min. 100 caratteri)</span>
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  rows={5}
                  placeholder="Spiega perché vuoi entrare in questo settore. Cosa ti spinge? Quali sono i tuoi obiettivi?"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-motivation"
                />
                <div className="text-xs text-plos-text-muted mt-1">
                  {formData.motivation.length} caratteri
                </div>
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Esperienza RP *
                </label>
                <textarea
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  rows={4}
                  placeholder="Hai esperienza di roleplay? Su quali server? Quali ruoli hai interpretato? Quanto tempo giochi?"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-experience"
                />
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Disponibilità oraria *
                </label>
                <input
                  type="text"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  placeholder="Es: Sera e weekend, 15-20 ore settimanali, disponibile dalle 18 alle 23"
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
                  rows={3}
                  placeholder="Altre informazioni che ritieni utili per la tua candidatura..."
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-additional"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || formData.motivation.length < 50}
                className="btn-tactical w-full flex items-center justify-center gap-2 disabled:opacity-50"
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
                      <p className="text-sm text-plos-text-secondary mb-2 line-clamp-2">{app.motivation}</p>
                      <p className="text-xs text-plos-text-muted">
                        Inviata: {new Date(app.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Info colloquio */}
                  {app.status === 'interview' && app.interview_scheduled_at && (
                    <div className="mt-3 p-3 bg-purple-500/10 border-l-2 border-purple-500">
                      <p className="text-sm text-purple-400 flex items-center gap-2">
                        <Calendar size={14} />
                        Colloquio: {new Date(app.interview_scheduled_at).toLocaleString('it-IT')}
                      </p>
                      {app.interview_assigned_name && (
                        <p className="text-xs text-plos-text-muted mt-1">
                          Con: {app.interview_assigned_name}
                        </p>
                      )}
                    </div>
                  )}
                  
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
              <div className="grid grid-cols-5 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{stats.pending}</div>
                  <div className="text-xs text-plos-text-muted">In Attesa</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-blue-400">{stats.reviewing}</div>
                  <div className="text-xs text-plos-text-muted">In Revisione</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-purple-400">{stats.interview || 0}</div>
                  <div className="text-xs text-plos-text-muted">Colloquio</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-lime-400">{stats.accepted}</div>
                  <div className="text-xs text-plos-text-muted">Accettate</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-red-400">{stats.rejected}</div>
                  <div className="text-xs text-plos-text-muted">Rifiutate</div>
                </div>
              </div>
            )}

            {/* Filtri */}
            <div className="flex items-center gap-4 p-3 bg-plos-surface/50 border border-plos-border">
              <Filter size={16} className="text-plos-text-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-plos-surface border border-plos-border p-2 text-sm focus:border-plos-primary outline-none"
              >
                <option value="">Tutti gli stati</option>
                <option value="pending">In Attesa</option>
                <option value="reviewing">In Revisione</option>
                <option value="interview">Colloquio</option>
                <option value="accepted">Accettate</option>
                <option value="rejected">Rifiutate</option>
              </select>
              
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-plos-border hover:border-plos-primary"
              >
                <ArrowUpDown size={14} />
                {sortOrder === 'desc' ? 'Più recenti' : 'Meno recenti'}
              </button>
              
              <span className="text-xs text-plos-text-muted ml-auto">
                {filteredApplications.length} candidature
              </span>
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <CheckCircle className="mx-auto text-lime-500 mb-4" size={48} />
                  <p className="text-plos-text-muted">Nessuna candidatura trovata</p>
                </div>
              ) : (
                filteredApplications.map((app) => (
                  <div key={app.id} className="card-tactical p-4" data-testid={`manage-application-${app.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => setProfileModal(app)}
                            className="font-heading text-plos-primary hover:underline flex items-center gap-1"
                          >
                            <User size={14} />
                            {app.game_name}
                          </button>
                          <span className="text-xs text-plos-text-muted">da {app.user_sector}</span>
                          {getStatusBadge(app.status)}
                        </div>
                        <p className="text-sm text-plos-text-secondary mb-2 line-clamp-2">
                          <strong>Motivazione:</strong> {app.motivation}
                        </p>
                        {app.experience && (
                          <p className="text-sm text-plos-text-secondary mb-2 line-clamp-1">
                            <strong>Esperienza:</strong> {app.experience}
                          </p>
                        )}
                        {app.availability && (
                          <p className="text-xs text-plos-text-muted">
                            <strong>Disponibilità:</strong> {app.availability}
                          </p>
                        )}
                        <p className="text-xs text-plos-text-muted mt-2">
                          Inviata: {new Date(app.created_at).toLocaleString('it-IT')}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      {['pending', 'reviewing', 'interview'].includes(app.status) && (
                        <div className="flex gap-2 ml-4 flex-shrink-0">
                          {app.status === 'pending' && (
                            <button
                              onClick={() => setReviewModal({ app, action: 'reviewing' })}
                              className="p-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30"
                              title="Prendi in carico"
                            >
                              <Eye size={16} className="text-blue-400" />
                            </button>
                          )}
                          {['pending', 'reviewing'].includes(app.status) && (
                            <button
                              onClick={() => setReviewModal({ app, action: 'interview' })}
                              className="p-2 bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30"
                              title="Convoca a colloquio"
                            >
                              <MessageSquare size={16} className="text-purple-400" />
                            </button>
                          )}
                          <button
                            onClick={() => setReviewModal({ app, action: 'accepted' })}
                            className="p-2 bg-lime-500/20 border border-lime-500/50 hover:bg-lime-500/30"
                            title="Accetta"
                          >
                            <CheckCircle size={16} className="text-lime-400" />
                          </button>
                          <button
                            onClick={() => setReviewModal({ app, action: 'rejected' })}
                            className="p-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30"
                            title="Rifiuta"
                          >
                            <XCircle size={16} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Info colloquio se presente */}
                    {app.status === 'interview' && app.interview_scheduled_at && (
                      <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 text-sm">
                        <Calendar size={14} className="inline mr-2 text-purple-400" />
                        Colloquio: {new Date(app.interview_scheduled_at).toLocaleString('it-IT')}
                        {app.interview_assigned_name && ` - ${app.interview_assigned_name}`}
                      </div>
                    )}
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
              {reviewModal.action === 'reviewing' && 'PRENDI IN CARICO'}
              {reviewModal.action === 'interview' && 'CONVOCA A COLLOQUIO'}
              {reviewModal.action === 'accepted' && 'ACCETTA CANDIDATURA'}
              {reviewModal.action === 'rejected' && 'RIFIUTA CANDIDATURA'}
            </h3>
            <p className="text-sm text-plos-text-secondary mb-4">
              Candidatura di <strong>{reviewModal.app.game_name}</strong> per <strong>{reviewModal.app.target_sector}</strong>
            </p>
            
            {/* Data colloquio per interview */}
            {reviewModal.action === 'interview' && (
              <div className="mb-4">
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Data e ora colloquio
                </label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none"
                />
              </div>
            )}
            
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              placeholder={reviewModal.action === 'rejected' ? 'Motivo del rifiuto...' : 'Note (opzionale)...'}
              className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setReviewNotes('');
                  setInterviewDate('');
                }}
                className="flex-1 px-4 py-2 border border-plos-border hover:border-plos-text-muted"
              >
                Annulla
              </button>
              <button
                onClick={() => handleReview(reviewModal.app.id, reviewModal.action)}
                className={`flex-1 px-4 py-2 ${
                  reviewModal.action === 'accepted' ? 'bg-lime-600' :
                  reviewModal.action === 'rejected' ? 'bg-red-600' :
                  reviewModal.action === 'interview' ? 'bg-purple-600' :
                  'bg-blue-600'
                }`}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg">PROFILO CANDIDATO</h3>
              <button
                onClick={() => setProfileModal(null)}
                className="text-plos-text-muted hover:text-plos-text"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
                  <User className="text-plos-primary" size={24} />
                </div>
                <div>
                  <p className="font-heading text-plos-primary">{profileModal.game_name}</p>
                  <p className="text-sm text-plos-text-muted">{profileModal.user_sector}</p>
                </div>
              </div>
              
              <div className="border-t border-plos-border pt-4">
                <h4 className="font-heading text-sm mb-2">MOTIVAZIONE</h4>
                <p className="text-sm text-plos-text-secondary whitespace-pre-wrap">{profileModal.motivation}</p>
              </div>
              
              {profileModal.experience && (
                <div className="border-t border-plos-border pt-4">
                  <h4 className="font-heading text-sm mb-2">ESPERIENZA RP</h4>
                  <p className="text-sm text-plos-text-secondary whitespace-pre-wrap">{profileModal.experience}</p>
                </div>
              )}
              
              {profileModal.availability && (
                <div className="border-t border-plos-border pt-4">
                  <h4 className="font-heading text-sm mb-2">DISPONIBILITÀ</h4>
                  <p className="text-sm text-plos-text-secondary">{profileModal.availability}</p>
                </div>
              )}
              
              {profileModal.additional_info && (
                <div className="border-t border-plos-border pt-4">
                  <h4 className="font-heading text-sm mb-2">INFO AGGIUNTIVE</h4>
                  <p className="text-sm text-plos-text-secondary whitespace-pre-wrap">{profileModal.additional_info}</p>
                </div>
              )}
              
              <div className="border-t border-plos-border pt-4 text-xs text-plos-text-muted">
                Candidatura inviata: {new Date(profileModal.created_at).toLocaleString('it-IT')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentPage;
