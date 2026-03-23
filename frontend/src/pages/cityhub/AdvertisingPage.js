import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Megaphone,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointer,
  BarChart3,
  Image,
  Link,
  Building2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdvertisingPage = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'my-slots' | 'manage'
  const [positions, setPositions] = useState([]);
  const [mySlots, setMySlots] = useState([]);
  const [pendingSlots, setPendingSlots] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [allStats, setAllStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    position: '',
    duration_days: 7,
  });

  // Approve/Reject modal
  const [actionModal, setActionModal] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [startDate, setStartDate] = useState('');

  const userSector = user?.sector?.toUpperCase();
  const isAdmin = userSector === 'ADMIN';
  const isGov = userSector === 'GOV';
  const canManage = isAdmin || (isGov && (user?.hierarchy_level || 0) >= 4);

  useEffect(() => {
    fetchPositions();
    if (isAuthenticated) {
      fetchMySlots();
      fetchMyStats();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my-slots' && isAuthenticated) {
      fetchMySlots();
      fetchMyStats();
    } else if (activeTab === 'manage' && canManage) {
      fetchPendingSlots();
      fetchAllStats();
    }
  }, [activeTab]);

  const fetchPositions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/advertising/positions`);
      setPositions(res.data.positions || []);
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  };

  const fetchMySlots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/advertising/my-slots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMySlots(res.data || []);
    } catch (err) {
      console.error('Error fetching my slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/advertising/my-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyStats(res.data);
    } catch (err) {
      console.error('Error fetching my stats:', err);
    }
  };

  const fetchPendingSlots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/advertising/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSlots(res.data || []);
    } catch (err) {
      console.error('Error fetching pending:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/advertising/all-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllStats(res.data);
    } catch (err) {
      console.error('Error fetching all stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.business_name || !formData.title || !formData.image_url || !formData.position) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/advertising/request`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Richiesta slot inviata! In attesa di approvazione.');
      setFormData({
        business_name: '',
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        position: '',
        duration_days: 7,
      });
      setActiveTab('my-slots');
      fetchMySlots();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella richiesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (slotId) => {
    try {
      await axios.put(`${API_URL}/api/advertising/${slotId}/approve`, {
        notes: actionNotes,
        starts_at: startDate || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Slot pubblicitario approvato e attivato!');
      setActionModal(null);
      setActionNotes('');
      setStartDate('');
      fetchPendingSlots();
      fetchAllStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'approvazione');
    }
  };

  const handleReject = async (slotId) => {
    try {
      await axios.put(`${API_URL}/api/advertising/${slotId}/reject`, {
        notes: actionNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Slot pubblicitario rifiutato');
      setActionModal(null);
      setActionNotes('');
      fetchPendingSlots();
      fetchAllStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel rifiuto');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'In Attesa' },
      approved: { color: 'bg-lime-500/20 text-lime-400 border-lime-500/50', icon: CheckCircle, label: 'Approvato' },
      active: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye, label: 'Attivo' },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle, label: 'Rifiutato' },
      expired: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: Clock, label: 'Scaduto' },
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

  const getPositionLabel = (posValue) => {
    const pos = positions.find(p => p.value === posValue);
    return pos ? pos.label : posValue;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="min-h-screen tactical-bg p-6" data-testid="advertising-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
            <Megaphone className="text-plos-primary" size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">SLOT PUBBLICITARI</h1>
            <p className="text-plos-text-secondary text-sm">Promuovi la tua attività nel City Hub</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-plos-border pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'request'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-request"
          >
            <Plus size={14} className="inline mr-2" />
            RICHIEDI SLOT
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setActiveTab('my-slots')}
              className={`px-4 py-2 font-heading text-sm transition-colors ${
                activeTab === 'my-slots'
                  ? 'bg-plos-primary text-black'
                  : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
              }`}
              data-testid="tab-my-slots"
            >
              <FileText size={14} className="inline mr-2" />
              I MIEI SLOT
            </button>
          )}
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
              <Building2 size={14} className="inline mr-2" />
              GESTIONE
            </button>
          )}
        </div>

        {/* Request Tab */}
        {activeTab === 'request' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="card-tactical p-6">
                <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
                  <Plus className="text-plos-primary" size={18} />
                  RICHIEDI SLOT PUBBLICITARIO
                </h2>

                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-plos-text-muted mb-4">Devi effettuare il login per richiedere uno slot pubblicitario</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm text-plos-text-secondary mb-2">
                        Nome Azienda/Attività *
                      </label>
                      <input
                        type="text"
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="Es: Los Santos Customs"
                        className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                        data-testid="input-business"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-plos-text-secondary mb-2">
                        Titolo Pubblicità *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Es: Sconto 20% su tutte le modifiche!"
                        className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                        data-testid="input-title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-plos-text-secondary mb-2">
                        Descrizione (opzionale)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="Descrizione breve della promozione..."
                        className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                        data-testid="input-description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-plos-text-secondary mb-2">
                        URL Immagine *
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Image size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" />
                          <input
                            type="url"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            placeholder="https://esempio.com/banner.jpg"
                            className="w-full bg-plos-surface border border-plos-border p-3 pl-10 focus:border-plos-primary outline-none"
                            data-testid="input-image"
                          />
                        </div>
                      </div>
                      {formData.image_url && (
                        <div className="mt-2">
                          <img 
                            src={formData.image_url} 
                            alt="preview" 
                            className="h-24 object-cover border border-plos-border"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-plos-text-secondary mb-2">
                        Link destinazione (opzionale)
                      </label>
                      <div className="relative">
                        <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" />
                        <input
                          type="url"
                          value={formData.link_url}
                          onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-plos-surface border border-plos-border p-3 pl-10 focus:border-plos-primary outline-none"
                          data-testid="input-link"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-plos-text-secondary mb-2">
                          Posizione *
                        </label>
                        <select
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                          data-testid="select-position"
                        >
                          <option value="">Seleziona...</option>
                          {positions.map((pos) => (
                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-plos-text-secondary mb-2">
                          Durata
                        </label>
                        <select
                          value={formData.duration_days}
                          onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) })}
                          className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                          data-testid="select-duration"
                        >
                          <option value={7}>7 giorni</option>
                          <option value={14}>14 giorni</option>
                          <option value={30}>30 giorni</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-tactical w-full flex items-center justify-center gap-2"
                      data-testid="btn-submit-slot"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                          INVIO IN CORSO...
                        </>
                      ) : (
                        <>
                          <Megaphone size={16} />
                          INVIA RICHIESTA
                        </>
                      )}
                    </button>

                    <p className="text-xs text-plos-text-muted text-center">
                      La richiesta sarà valutata dal team GOV/Admin
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Positions Info */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg">POSIZIONI DISPONIBILI</h3>
              {positions.map((pos) => (
                <div key={pos.value} className="card-tactical p-4">
                  <h4 className="font-medium mb-1">{pos.label}</h4>
                  <p className="text-sm text-plos-text-secondary">{pos.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Slots Tab */}
        {activeTab === 'my-slots' && isAuthenticated && (
          <div className="space-y-6">
            {/* My Stats */}
            {myStats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-blue-400">{myStats.active_slots}</div>
                  <div className="text-xs text-plos-text-muted">Slot Attivi</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-plos-primary">{myStats.total_views}</div>
                  <div className="text-xs text-plos-text-muted">Visualizzazioni</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-lime-400">{myStats.total_clicks}</div>
                  <div className="text-xs text-plos-text-muted">Click</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{myStats.ctr}%</div>
                  <div className="text-xs text-plos-text-muted">CTR</div>
                </div>
              </div>
            )}

            {/* Slots List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
              ) : mySlots.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <Megaphone className="mx-auto text-plos-text-muted mb-4" size={48} />
                  <p className="text-plos-text-muted">Non hai ancora richiesto slot pubblicitari</p>
                  <button onClick={() => setActiveTab('request')} className="btn-tactical mt-4">
                    Richiedi il tuo primo slot
                  </button>
                </div>
              ) : (
                mySlots.map((slot) => (
                  <div key={slot.id} className="card-tactical p-4" data-testid={`my-slot-${slot.id}`}>
                    <div className="flex items-start gap-4">
                      {slot.image_url && (
                        <div
                          className="w-24 h-16 bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${slot.image_url})` }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading">{slot.business_name}</span>
                          {getStatusBadge(slot.status)}
                        </div>
                        <h3 className="font-medium mb-1">{slot.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-plos-text-muted">
                          <span>{getPositionLabel(slot.position)}</span>
                          <span>{slot.duration_days} giorni</span>
                          {slot.status === 'active' && (
                            <>
                              <span className="flex items-center gap-1">
                                <Eye size={12} />
                                {slot.views}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointer size={12} />
                                {slot.clicks}
                              </span>
                            </>
                          )}
                        </div>
                        {slot.starts_at && (
                          <p className="text-xs text-plos-text-muted mt-1">
                            Attivo: {formatDate(slot.starts_at)} - {formatDate(slot.expires_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    {slot.approver_notes && (
                      <div className="mt-3 p-3 bg-plos-surface/50 border-l-2 border-plos-primary">
                        <p className="text-xs text-plos-text-secondary">Note:</p>
                        <p className="text-sm">{slot.approver_notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && canManage && (
          <div className="space-y-6">
            {/* All Stats */}
            {allStats && (
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{allStats.pending}</div>
                  <div className="text-xs text-plos-text-muted">In Attesa</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-blue-400">{allStats.active}</div>
                  <div className="text-xs text-plos-text-muted">Attivi</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-gray-400">{allStats.expired}</div>
                  <div className="text-xs text-plos-text-muted">Scaduti</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-plos-primary">{allStats.total_views}</div>
                  <div className="text-xs text-plos-text-muted">Views Totali</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-lime-400">{allStats.total_clicks}</div>
                  <div className="text-xs text-plos-text-muted">Click Totali</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-purple-400">{allStats.ctr}%</div>
                  <div className="text-xs text-plos-text-muted">CTR Globale</div>
                </div>
              </div>
            )}

            {/* Pending Slots */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg">RICHIESTE IN ATTESA</h3>
              {loading ? (
                <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
              ) : pendingSlots.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <CheckCircle className="mx-auto text-lime-500 mb-4" size={48} />
                  <p className="text-plos-text-muted">Nessuna richiesta da approvare</p>
                </div>
              ) : (
                pendingSlots.map((slot) => (
                  <div key={slot.id} className="card-tactical p-4" data-testid={`pending-slot-${slot.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {slot.image_url && (
                          <div
                            className="w-32 h-20 bg-cover bg-center flex-shrink-0 border border-plos-border"
                            style={{ backgroundImage: `url(${slot.image_url})` }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-heading">{slot.business_name}</span>
                            <span className="text-xs text-plos-text-muted">
                              di {slot.owner_game_name} ({slot.owner_sector})
                            </span>
                          </div>
                          <h3 className="font-medium mb-1">{slot.title}</h3>
                          {slot.description && (
                            <p className="text-sm text-plos-text-secondary mb-2">{slot.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-plos-text-muted">
                            <span>Posizione: {getPositionLabel(slot.position)}</span>
                            <span>Durata: {slot.duration_days} giorni</span>
                            {slot.link_url && (
                              <a href={slot.link_url} target="_blank" rel="noopener noreferrer" className="text-plos-primary hover:underline flex items-center gap-1">
                                <Link size={12} />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setActionModal({ slot, action: 'approve' })}
                          className="p-2 bg-lime-500/20 border border-lime-500/50 hover:bg-lime-500/30"
                          title="Approva"
                        >
                          <CheckCircle size={16} className="text-lime-400" />
                        </button>
                        <button
                          onClick={() => setActionModal({ slot, action: 'reject' })}
                          className="p-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30"
                          title="Rifiuta"
                        >
                          <XCircle size={16} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border p-6 max-w-md w-full">
            <h3 className="font-heading text-lg mb-4">
              {actionModal.action === 'approve' ? 'APPROVA SLOT' : 'RIFIUTA SLOT'}
            </h3>
            <p className="text-sm text-plos-text-secondary mb-4">
              Slot di <strong>{actionModal.slot.business_name}</strong> richiesto da {actionModal.slot.owner_game_name}
            </p>

            {actionModal.action === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Data inizio (lascia vuoto per immediato)
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none"
                />
              </div>
            )}

            <textarea
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
              placeholder={actionModal.action === 'reject' ? 'Motivo del rifiuto...' : 'Note (opzionale)...'}
              className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionNotes('');
                  setStartDate('');
                }}
                className="flex-1 px-4 py-2 border border-plos-border hover:border-plos-text-muted"
              >
                Annulla
              </button>
              <button
                onClick={() => actionModal.action === 'approve' 
                  ? handleApprove(actionModal.slot.id) 
                  : handleReject(actionModal.slot.id)
                }
                className={`flex-1 px-4 py-2 ${
                  actionModal.action === 'approve' ? 'bg-lime-600' : 'bg-red-600'
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

export default AdvertisingPage;
