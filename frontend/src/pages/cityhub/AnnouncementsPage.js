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
  Trash2,
  Tag,
  Briefcase,
  Home,
  Wrench,
  Calendar,
  MapPin,
  Phone,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AnnouncementsPage = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'create' | 'my-announcements' | 'moderate'
  const [publicAnnouncements, setPublicAnnouncements] = useState([]);
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    image_url: '',
    contact_info: '',
    price: '',
    location: '',
    duration_days: 30,
  });

  // Moderate modal
  const [moderateModal, setModerateModal] = useState(null);
  const [moderateNotes, setModerateNotes] = useState('');

  const userSector = user?.sector?.toUpperCase();
  const isAdmin = userSector === 'ADMIN';
  const isGov = userSector === 'GOV';
  const canModerate = isAdmin || (isGov && (user?.hierarchy_level || 0) >= 3);

  const categoryIcons = {
    lavoro: Briefcase,
    vendita: Tag,
    affitti: Home,
    servizi: Wrench,
    eventi: Calendar,
  };

  useEffect(() => {
    fetchCategories();
    fetchPublicAnnouncements();
  }, []);

  useEffect(() => {
    fetchPublicAnnouncements();
  }, [selectedCategory]);

  useEffect(() => {
    if (activeTab === 'my-announcements' && isAuthenticated) {
      fetchMyAnnouncements();
    } else if (activeTab === 'moderate' && canModerate) {
      fetchPendingAnnouncements();
      fetchStats();
    }
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/announcements/categories`);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchPublicAnnouncements = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/announcements/public`;
      if (selectedCategory) {
        url += `?category=${selectedCategory}`;
      }
      const res = await axios.get(url);
      setPublicAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/announcements/my-announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching my announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/announcements/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAnnouncements(res.data || []);
    } catch (err) {
      console.error('Error fetching pending:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/announcements/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/announcements/create`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Annuncio creato! In attesa di approvazione.');
      setFormData({
        title: '',
        description: '',
        category: '',
        image_url: '',
        contact_info: '',
        price: '',
        location: '',
        duration_days: 30,
      });
      setActiveTab('my-announcements');
      fetchMyAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (announcementId, status) => {
    try {
      await axios.put(`${API_URL}/api/announcements/${announcementId}/moderate`, {
        status,
        notes: moderateNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Annuncio ${status === 'approved' ? 'approvato' : 'rifiutato'}`);
      setModerateModal(null);
      setModerateNotes('');
      fetchPendingAnnouncements();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella moderazione');
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return;
    try {
      await axios.delete(`${API_URL}/api/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Annuncio eliminato');
      fetchMyAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'eliminazione');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'In Attesa' },
      approved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Approvato' },
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

  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || Tag;
    return <Icon size={16} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  return (
    <div className="min-h-screen tactical-bg p-6" data-testid="announcements-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
            <Megaphone className="text-plos-primary" size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">BACHECA ANNUNCI</h1>
            <p className="text-plos-text-secondary text-sm">Pubblica e trova annunci della community</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-plos-border pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'browse'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-browse"
          >
            <Eye size={14} className="inline mr-2" />
            SFOGLIA
          </button>
          {isAuthenticated && (
            <>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 font-heading text-sm transition-colors ${
                  activeTab === 'create'
                    ? 'bg-plos-primary text-black'
                    : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
                }`}
                data-testid="tab-create"
              >
                <Plus size={14} className="inline mr-2" />
                PUBBLICA
              </button>
              <button
                onClick={() => setActiveTab('my-announcements')}
                className={`px-4 py-2 font-heading text-sm transition-colors ${
                  activeTab === 'my-announcements'
                    ? 'bg-plos-primary text-black'
                    : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
                }`}
                data-testid="tab-my-announcements"
              >
                <FileText size={14} className="inline mr-2" />
                I MIEI ANNUNCI
              </button>
            </>
          )}
          {canModerate && (
            <button
              onClick={() => setActiveTab('moderate')}
              className={`px-4 py-2 font-heading text-sm transition-colors ${
                activeTab === 'moderate'
                  ? 'bg-plos-primary text-black'
                  : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
              }`}
              data-testid="tab-moderate"
            >
              <CheckCircle size={14} className="inline mr-2" />
              MODERAZIONE
            </button>
          )}
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 text-sm border ${
                  selectedCategory === ''
                    ? 'bg-plos-primary text-black border-plos-primary'
                    : 'border-plos-border hover:border-plos-primary'
                }`}
              >
                Tutti
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1 text-sm border flex items-center gap-1 ${
                    selectedCategory === cat.value
                      ? 'bg-plos-primary text-black border-plos-primary'
                      : 'border-plos-border hover:border-plos-primary'
                  }`}
                >
                  {getCategoryIcon(cat.value)}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Announcements Grid */}
            {loading ? (
              <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
            ) : publicAnnouncements.length === 0 ? (
              <div className="card-tactical p-8 text-center">
                <Megaphone className="mx-auto text-plos-text-muted mb-4" size={48} />
                <p className="text-plos-text-muted">Nessun annuncio in questa categoria</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicAnnouncements.map((ann) => (
                  <div key={ann.id} className="card-tactical p-4" data-testid={`announcement-${ann.id}`}>
                    {ann.image_url && (
                      <div
                        className="h-32 mb-3 bg-cover bg-center"
                        style={{ backgroundImage: `url(${ann.image_url})` }}
                      />
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs bg-plos-primary/20 text-plos-primary border border-plos-primary/50`}>
                        {getCategoryIcon(ann.category)}
                        {ann.category}
                      </span>
                      <span className="text-xs text-plos-text-muted flex items-center gap-1">
                        <Eye size={12} />
                        {ann.views}
                      </span>
                    </div>
                    <h3 className="font-medium mb-2">{ann.title}</h3>
                    <p className="text-sm text-plos-text-secondary line-clamp-3 mb-3">
                      {ann.description}
                    </p>
                    <div className="space-y-1 text-xs text-plos-text-muted">
                      {ann.price && (
                        <p className="flex items-center gap-1">
                          <Tag size={12} />
                          {ann.price}
                        </p>
                      )}
                      {ann.location && (
                        <p className="flex items-center gap-1">
                          <MapPin size={12} />
                          {ann.location}
                        </p>
                      )}
                      {ann.contact_info && (
                        <p className="flex items-center gap-1">
                          <Phone size={12} />
                          {ann.contact_info}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-plos-border flex items-center justify-between text-xs text-plos-text-muted">
                      <span>di {ann.author_game_name}</span>
                      <span>{formatDate(ann.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && isAuthenticated && (
          <div className="card-tactical p-6">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <Plus className="text-plos-primary" size={18} />
              NUOVO ANNUNCIO
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titolo dell'annuncio"
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="select-category"
                  >
                    <option value="">Seleziona...</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Descrizione *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descrizione dettagliata..."
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-description"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Prezzo (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Es: $50.000 o Trattabile"
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-price"
                  />
                </div>

                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Località (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Es: Vinewood, Downtown"
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-location"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Contatto
                  </label>
                  <input
                    type="text"
                    value={formData.contact_info}
                    onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                    placeholder="Telefono, email o altro"
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-contact"
                  />
                </div>

                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    URL Immagine (opzionale)
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-image"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Durata annuncio
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
                  <option value={60}>60 giorni</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-tactical w-full flex items-center justify-center gap-2"
                data-testid="btn-submit-announcement"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    PUBBLICAZIONE...
                  </>
                ) : (
                  <>
                    <Megaphone size={16} />
                    PUBBLICA ANNUNCIO
                  </>
                )}
              </button>

              <p className="text-xs text-plos-text-muted text-center">
                L'annuncio sarà visibile dopo l'approvazione da parte dei moderatori
              </p>
            </form>
          </div>
        )}

        {/* My Announcements Tab */}
        {activeTab === 'my-announcements' && isAuthenticated && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
            ) : myAnnouncements.length === 0 ? (
              <div className="card-tactical p-8 text-center">
                <Megaphone className="mx-auto text-plos-text-muted mb-4" size={48} />
                <p className="text-plos-text-muted">Non hai ancora pubblicato annunci</p>
                <button onClick={() => setActiveTab('create')} className="btn-tactical mt-4">
                  Pubblica il primo annuncio
                </button>
              </div>
            ) : (
              myAnnouncements.map((ann) => (
                <div key={ann.id} className="card-tactical p-4" data-testid={`my-announcement-${ann.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-heading">{ann.title}</span>
                        {getStatusBadge(ann.status)}
                        <span className="text-xs text-plos-text-muted flex items-center gap-1">
                          <Eye size={12} />
                          {ann.views}
                        </span>
                      </div>
                      <p className="text-sm text-plos-text-secondary mb-2">{ann.description}</p>
                      <div className="flex items-center gap-4 text-xs text-plos-text-muted">
                        <span>{ann.category}</span>
                        {ann.price && <span>{ann.price}</span>}
                        <span>Creato: {formatDate(ann.created_at)}</span>
                        {ann.expires_at && <span>Scade: {formatDate(ann.expires_at)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-2 text-red-400 hover:text-red-300"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {ann.moderator_notes && (
                    <div className="mt-3 p-3 bg-plos-surface/50 border-l-2 border-plos-primary">
                      <p className="text-xs text-plos-text-secondary">Note del moderatore:</p>
                      <p className="text-sm">{ann.moderator_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Moderate Tab */}
        {activeTab === 'moderate' && canModerate && (
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{stats.pending}</div>
                  <div className="text-xs text-plos-text-muted">In Attesa</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-green-400">{stats.approved}</div>
                  <div className="text-xs text-plos-text-muted">Approvati</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-red-400">{stats.rejected}</div>
                  <div className="text-xs text-plos-text-muted">Rifiutati</div>
                </div>
              </div>
            )}

            {/* Pending List */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg">ANNUNCI DA MODERARE</h3>
              {loading ? (
                <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
              ) : pendingAnnouncements.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                  <p className="text-plos-text-muted">Nessun annuncio da moderare</p>
                </div>
              ) : (
                pendingAnnouncements.map((ann) => (
                  <div key={ann.id} className="card-tactical p-4" data-testid={`pending-${ann.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-heading">{ann.title}</span>
                          <span className="text-xs bg-plos-primary/20 text-plos-primary px-2 py-1">
                            {ann.category}
                          </span>
                        </div>
                        <p className="text-sm text-plos-text-secondary mb-2">{ann.description}</p>
                        <div className="flex items-center gap-4 text-xs text-plos-text-muted">
                          <span>di {ann.author_game_name} ({ann.author_sector})</span>
                          {ann.price && <span>Prezzo: {ann.price}</span>}
                          {ann.location && <span>Luogo: {ann.location}</span>}
                          {ann.contact_info && <span>Contatto: {ann.contact_info}</span>}
                        </div>
                        {ann.image_url && (
                          <div className="mt-2">
                            <img src={ann.image_url} alt="preview" className="h-20 object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setModerateModal({ ann, action: 'approved' })}
                          className="p-2 bg-green-500/20 border border-green-500/50 hover:bg-green-500/30"
                          title="Approva"
                        >
                          <CheckCircle size={16} className="text-green-400" />
                        </button>
                        <button
                          onClick={() => setModerateModal({ ann, action: 'rejected' })}
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

      {/* Moderate Modal */}
      {moderateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border p-6 max-w-md w-full">
            <h3 className="font-heading text-lg mb-4">
              {moderateModal.action === 'approved' ? 'APPROVA ANNUNCIO' : 'RIFIUTA ANNUNCIO'}
            </h3>
            <p className="text-sm text-plos-text-secondary mb-4">
              Annuncio: <strong>{moderateModal.ann.title}</strong> di {moderateModal.ann.author_game_name}
            </p>
            <textarea
              value={moderateNotes}
              onChange={(e) => setModerateNotes(e.target.value)}
              rows={3}
              placeholder="Note (opzionale)..."
              className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModerateModal(null);
                  setModerateNotes('');
                }}
                className="flex-1 px-4 py-2 border border-plos-border hover:border-plos-text-muted"
              >
                Annulla
              </button>
              <button
                onClick={() => handleModerate(moderateModal.ann.id, moderateModal.action)}
                className={`flex-1 px-4 py-2 ${
                  moderateModal.action === 'approved' ? 'bg-green-600' : 'bg-red-600'
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

export default AnnouncementsPage;
