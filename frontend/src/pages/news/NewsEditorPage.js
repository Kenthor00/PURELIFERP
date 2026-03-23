import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  Newspaper, Plus, Send, Check, X, Archive,
  Edit2, Eye, Trash2, Zap, Clock, FileText,
  ChevronDown, Filter, AlertCircle, ArrowLeft,
  Save, Image, Video, Tag, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper per determinare ruolo NEWS
const getNewsRole = (user) => {
  if (user?.sector === 'ADMIN') return 5;
  if (user?.sector !== 'NEWS') return 0;
  return user?.hierarchy_level || 1;
};

export const NewsEditorPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  
  // Filtri e tab
  const [activeTab, setActiveTab] = useState('my'); // my, review, all
  const [filterStatus, setFilterStatus] = useState('');
  
  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
    excerpt: '',
    cover_image_url: '',
    video_url: '',
    category: 'cronaca',
    is_official: false
  });
  const [saving, setSaving] = useState(false);

  const newsRole = getNewsRole(user);
  const canEdit = newsRole >= 2;
  const canPublish = newsRole >= 3;
  const canArchive = newsRole >= 4;

  // Auth header
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const catRes = await axios.get(`${API_URL}/api/v2/news/categories`);
      setCategories(catRes.data.categories || []);
      
      // Fetch stats
      if (newsRole >= 2) {
        const statsRes = await axios.get(`${API_URL}/api/v2/news/newsroom/stats`, { headers: authHeaders });
        setStats(statsRes.data);
      }
      
      // Fetch based on tab
      if (activeTab === 'my') {
        const url = filterStatus 
          ? `${API_URL}/api/v2/news/newsroom/my-articles?status=${filterStatus}`
          : `${API_URL}/api/v2/news/newsroom/my-articles`;
        const res = await axios.get(url, { headers: authHeaders });
        setArticles(res.data);
      } else if (activeTab === 'review' && newsRole >= 2) {
        const res = await axios.get(`${API_URL}/api/v2/news/newsroom/review-queue`, { headers: authHeaders });
        setReviewQueue(res.data);
      } else if (activeTab === 'all' && newsRole >= 3) {
        const url = filterStatus
          ? `${API_URL}/api/v2/news/newsroom/all?status=${filterStatus}`
          : `${API_URL}/api/v2/news/newsroom/all`;
        const res = await axios.get(url, { headers: authHeaders });
        setArticles(res.data);
      }
    } catch (error) {
      console.error('Errore fetch newsroom:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus, newsRole, token]);

  useEffect(() => {
    if (newsRole < 1) {
      navigate('/');
      return;
    }
    fetchData();
  }, [fetchData, newsRole, navigate]);

  // Handlers
  const handleNewArticle = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      subtitle: '',
      content: '',
      excerpt: '',
      cover_image_url: '',
      video_url: '',
      category: 'cronaca',
      is_official: false
    });
    setShowEditor(true);
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      subtitle: article.subtitle || '',
      content: article.content,
      excerpt: article.excerpt || '',
      cover_image_url: article.cover_image_url || '',
      video_url: article.video_url || '',
      category: article.category || 'cronaca',
      is_official: article.is_official || false
    });
    setShowEditor(true);
  };

  const handleSaveArticle = async () => {
    if (!formData.title || !formData.content) {
      alert('Titolo e contenuto sono obbligatori');
      return;
    }

    try {
      setSaving(true);
      if (editingArticle) {
        await axios.put(
          `${API_URL}/api/v2/news/newsroom/${editingArticle.id}`,
          formData,
          { headers: authHeaders }
        );
      } else {
        await axios.post(
          `${API_URL}/api/v2/news/newsroom/create`,
          formData,
          { headers: authHeaders }
        );
      }
      setShowEditor(false);
      fetchData();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert(error.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (articleId, action, notes = '') => {
    try {
      await axios.post(
        `${API_URL}/api/v2/news/newsroom/${articleId}/${action}`,
        { notes },
        { headers: authHeaders }
      );
      fetchData();
    } catch (error) {
      console.error(`Errore ${action}:`, error);
      alert(error.response?.data?.detail || `Errore durante ${action}`);
    }
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) return;
    try {
      await axios.delete(`${API_URL}/api/v2/news/newsroom/${articleId}`, { headers: authHeaders });
      fetchData();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert(error.response?.data?.detail || 'Errore durante l\'eliminazione');
    }
  };

  // Status badge
  const StatusBadge = ({ status, isBreaking }) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      review: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-blue-500/20 text-blue-400',
      published: 'bg-lime-500/20 text-lime-400',
      archived: 'bg-purple-500/20 text-purple-400'
    };
    const labels = {
      draft: 'Bozza',
      review: 'In Revisione',
      approved: 'Approvato',
      published: 'Pubblicato',
      archived: 'Archiviato'
    };
    return (
      <div className="flex gap-2">
        <span className={`px-2 py-0.5 text-xs font-heading ${colors[status] || colors.draft}`}>
          {labels[status] || status}
        </span>
        {isBreaking && (
          <span className="px-2 py-0.5 text-xs font-heading bg-red-500/20 text-red-400 flex items-center gap-1">
            <Zap size={10} /> BREAKING
          </span>
        )}
      </div>
    );
  };

  // Article card
  const ArticleCard = ({ article }) => (
    <div className="card-tactical p-4" data-testid={`article-${article.id}`}>
      <div className="flex items-start justify-between mb-3">
        <StatusBadge status={article.status} isBreaking={article.is_breaking} />
        <span className="text-xs text-plos-text-muted">
          {new Date(article.created_at).toLocaleDateString('it-IT')}
        </span>
      </div>
      
      <h3 className="font-medium mb-1 line-clamp-2">{article.title}</h3>
      {article.subtitle && (
        <p className="text-sm text-plos-text-secondary line-clamp-1">{article.subtitle}</p>
      )}
      
      <div className="flex items-center gap-2 mt-3 text-xs text-plos-text-muted">
        <span className="text-plos-primary uppercase">{article.category}</span>
        <span>·</span>
        <span>{article.author_game_name}</span>
        {article.views > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1"><Eye size={10} />{article.views}</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-plos-border">
        {/* Azioni in base a stato e ruolo */}
        {article.status === 'draft' && (
          <>
            <button onClick={() => handleEditArticle(article)} className="btn-tactical-sm flex items-center gap-1">
              <Edit2 size={12} /> Modifica
            </button>
            <button onClick={() => handleAction(article.id, 'submit-review')} className="btn-tactical-sm flex items-center gap-1">
              <Send size={12} /> Invia Revisione
            </button>
            <button onClick={() => handleDelete(article.id)} className="text-red-400 hover:text-red-300 text-xs">
              <Trash2 size={14} />
            </button>
          </>
        )}
        
        {article.status === 'review' && canEdit && (
          <>
            <button onClick={() => handleAction(article.id, 'approve')} className="btn-tactical-sm text-lime-400 flex items-center gap-1">
              <Check size={12} /> Approva
            </button>
            <button onClick={() => {
              const notes = prompt('Motivo del rifiuto:');
              if (notes !== null) handleAction(article.id, 'reject', notes);
            }} className="btn-tactical-sm text-red-400 flex items-center gap-1">
              <X size={12} /> Rifiuta
            </button>
          </>
        )}
        
        {article.status === 'approved' && canPublish && (
          <button onClick={() => handleAction(article.id, 'publish')} className="btn-tactical-sm text-lime-400 flex items-center gap-1">
            <Check size={12} /> Pubblica
          </button>
        )}
        
        {article.status === 'published' && canPublish && (
          <button onClick={() => handleAction(article.id, 'toggle-breaking')} className="btn-tactical-sm flex items-center gap-1">
            <Zap size={12} className={article.is_breaking ? 'text-red-400' : ''} /> 
            {article.is_breaking ? 'Rimuovi Breaking' : 'Breaking'}
          </button>
        )}
        
        {(article.status === 'published' || article.status === 'approved') && canArchive && (
          <button onClick={() => handleAction(article.id, 'archive')} className="btn-tactical-sm text-purple-400 flex items-center gap-1">
            <Archive size={12} /> Archivia
          </button>
        )}
        
        {canArchive && (
          <button onClick={() => handleDelete(article.id)} className="text-red-400 hover:text-red-300 text-xs ml-auto">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );

  // Editor Modal
  const EditorModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-surface border border-plos-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-plos-surface border-b border-plos-border p-4 flex items-center justify-between">
          <h2 className="font-heading text-lg">
            {editingArticle ? 'Modifica Articolo' : 'Nuovo Articolo'}
          </h2>
          <button onClick={() => setShowEditor(false)} className="text-plos-text-secondary hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">Titolo *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 bg-black/50 border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:outline-none focus:border-plos-primary focus:ring-1 focus:ring-plos-primary"
              placeholder="Titolo dell'articolo"
              data-testid="article-title-input"
            />
          </div>
          
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">Sottotitolo</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
              className="w-full px-4 py-3 bg-black/50 border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:outline-none focus:border-plos-primary focus:ring-1 focus:ring-plos-primary"
              placeholder="Sottotitolo opzionale"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="input-tactical w-full"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            {(user?.sector === 'GOV' || user?.sector === 'ADMIN' || newsRole >= 3) && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_official"
                  checked={formData.is_official}
                  onChange={(e) => setFormData({...formData, is_official: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="is_official" className="text-sm">Comunicato Ufficiale</label>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">Contenuto *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full h-64 px-4 py-3 bg-black/50 border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:outline-none focus:border-plos-primary focus:ring-1 focus:ring-plos-primary resize-y"
              placeholder="Scrivi il contenuto dell'articolo..."
              data-testid="article-content-input"
              style={{ minHeight: '200px' }}
            />
          </div>
          
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">Anteprima</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
              className="input-tactical w-full h-20"
              placeholder="Breve anteprima (generata automaticamente se vuota)"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">
                <Image size={14} className="inline mr-1" /> URL Immagine Cover
              </label>
              <input
                type="url"
                value={formData.cover_image_url}
                onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})}
                className="input-tactical w-full"
                placeholder="https://..."
              />
            </div>
            
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">
                <Video size={14} className="inline mr-1" /> URL Video (YouTube/Twitch)
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                className="input-tactical w-full"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-plos-surface border-t border-plos-border p-4 flex justify-end gap-3">
          <button onClick={() => setShowEditor(false)} className="btn-tactical-secondary">
            Annulla
          </button>
          <button onClick={handleSaveArticle} disabled={saving} className="btn-tactical flex items-center gap-2">
            <Save size={16} />
            {saving ? 'Salvataggio...' : 'Salva Bozza'}
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen tactical-bg" data-testid="news-editor-page">
      {/* Header */}
      <header className="bg-plos-surface border-b border-plos-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-plos-text-secondary hover:text-white">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-heading text-xl tracking-wider flex items-center gap-2">
                  <Newspaper className="text-plos-primary" />
                  REDAZIONE WEAZEL NEWS
                </h1>
                <p className="text-xs text-plos-text-secondary">
                  {user?.game_name} · {user?.grade}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={fetchData} className="btn-tactical-secondary p-2">
                <RefreshCw size={16} />
              </button>
              <button onClick={handleNewArticle} className="btn-tactical flex items-center gap-2" data-testid="new-article-btn">
                <Plus size={16} /> Nuovo Articolo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="border-b border-plos-border bg-plos-surface/50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                Bozze: {stats.draft}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                In Revisione: {stats.review}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Approvati: {stats.approved}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                Pubblicati: {stats.published}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Breaking: {stats.breaking}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-plos-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => { setActiveTab('my'); setFilterStatus(''); }}
              className={`py-3 px-4 text-sm font-heading border-b-2 ${activeTab === 'my' ? 'border-plos-primary text-white' : 'border-transparent text-plos-text-secondary'}`}
            >
              <FileText size={16} className="inline mr-2" />
              I MIEI ARTICOLI
            </button>
            
            {newsRole >= 2 && (
              <button
                onClick={() => { setActiveTab('review'); setFilterStatus(''); }}
                className={`py-3 px-4 text-sm font-heading border-b-2 relative ${activeTab === 'review' ? 'border-plos-primary text-white' : 'border-transparent text-plos-text-secondary'}`}
              >
                <Clock size={16} className="inline mr-2" />
                DA REVISIONARE
                {stats?.review > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    {stats.review}
                  </span>
                )}
              </button>
            )}
            
            {newsRole >= 3 && (
              <button
                onClick={() => { setActiveTab('all'); setFilterStatus(''); }}
                className={`py-3 px-4 text-sm font-heading border-b-2 ${activeTab === 'all' ? 'border-plos-primary text-white' : 'border-transparent text-plos-text-secondary'}`}
              >
                <Newspaper size={16} className="inline mr-2" />
                TUTTI GLI ARTICOLI
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter */}
      {(activeTab === 'my' || activeTab === 'all') && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-plos-text-secondary" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-tactical text-sm"
            >
              <option value="">Tutti gli stati</option>
              <option value="draft">Bozze</option>
              <option value="review">In Revisione</option>
              <option value="approved">Approvati</option>
              <option value="published">Pubblicati</option>
              <option value="archived">Archiviati</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-plos-text-muted">Caricamento...</div>
        ) : activeTab === 'review' ? (
          reviewQueue.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto mb-4 text-plos-text-muted" size={48} />
              <p className="text-plos-text-secondary">Nessun articolo da revisionare</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewQueue.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper className="mx-auto mb-4 text-plos-text-muted" size={48} />
            <p className="text-plos-text-secondary">Nessun articolo trovato</p>
            <button onClick={handleNewArticle} className="btn-tactical mt-4">
              <Plus size={16} className="inline mr-2" /> Crea il primo articolo
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* Editor Modal */}
      {showEditor && <EditorModal />}
    </div>
  );
};

export default NewsEditorPage;
