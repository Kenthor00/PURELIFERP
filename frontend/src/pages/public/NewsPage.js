import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Newspaper,
  ArrowLeft,
  Calendar,
  User,
  Eye,
  AlertCircle,
  Play,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const NewsPage = () => {
  const navigate = useNavigate();
  const { articleId } = useParams();
  
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (articleId) {
      fetchArticle(articleId);
    } else {
      fetchArticles();
    }
    fetchCategories();
  }, [articleId, filterCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      params.append('limit', '20');
      
      const res = await axios.get(`${API_URL}/api/v2/news/published?${params.toString()}`);
      setArticles(res.data);
    } catch (error) {
      console.error('Errore fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticle = async (id) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/v2/news/article/${id}`);
      setSelectedArticle(res.data);
    } catch (error) {
      console.error('Errore fetch article:', error);
      navigate('/city/news');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v2/news/categories`);
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Single Article View
  if (selectedArticle) {
    return (
      <div className="min-h-screen tactical-bg" data-testid="news-article-page">
        <header className="bg-plos-surface border-b border-plos-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => {
                setSelectedArticle(null);
                navigate('/city/news');
              }}
              className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary"
            >
              <ArrowLeft size={16} />
              <span>Torna alle news</span>
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          {selectedArticle.is_breaking && (
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle size={18} className="animate-pulse" />
              <span className="font-heading text-sm">BREAKING NEWS</span>
            </div>
          )}

          <span className="text-plos-primary text-sm uppercase font-heading">
            {selectedArticle.category}
          </span>
          
          <h1 className="font-heading text-3xl sm:text-4xl tracking-wider mt-2">
            {selectedArticle.title}
          </h1>
          
          {selectedArticle.subtitle && (
            <p className="text-xl text-plos-text-secondary mt-2">
              {selectedArticle.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-plos-text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(selectedArticle.published_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {selectedArticle.views} visualizzazioni
            </span>
          </div>

          {selectedArticle.cover_image_url && (
            <div
              className="w-full h-64 sm:h-96 mt-6 bg-cover bg-center border border-plos-border"
              style={{ backgroundImage: `url(${selectedArticle.cover_image_url})` }}
            />
          )}

          {selectedArticle.video_url && (
            <div className="mt-6 aspect-video bg-black border border-plos-border">
              <iframe
                src={selectedArticle.video_url}
                className="w-full h-full"
                allowFullScreen
                title={selectedArticle.title}
              />
            </div>
          )}

          <article className="mt-8 prose prose-invert max-w-none">
            <div
              className="text-plos-text-secondary leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />
          </article>

          <div className="mt-12 pt-6 border-t border-plos-border">
            <button
              onClick={() => navigate('/city/news')}
              className="btn-tactical"
            >
              ← ALTRE NEWS
            </button>
          </div>
        </main>
      </div>
    );
  }

  // News List View
  return (
    <div className="min-h-screen tactical-bg" data-testid="news-list-page">
      <header className="bg-plos-surface border-b border-plos-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/city')}
                className="text-plos-text-secondary hover:text-plos-primary"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-heading text-xl tracking-wider flex items-center gap-2">
                  <Newspaper className="text-plos-primary" />
                  WEAZEL NEWS
                </h1>
              </div>
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-tactical text-sm"
            >
              <option value="">Tutte le categorie</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-plos-text-muted">
            Caricamento...
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper className="mx-auto mb-4 text-plos-text-muted" size={48} />
            <p className="text-plos-text-secondary">Nessuna news disponibile</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => navigate(`/city/news/${article.id}`)}
                className="card-tactical overflow-hidden cursor-pointer group"
                data-testid={`news-${article.id}`}
              >
                {article.cover_image_url && (
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${article.cover_image_url})` }}
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {article.is_breaking && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs font-heading">
                        BREAKING
                      </span>
                    )}
                    <span className="text-xs text-plos-primary uppercase">
                      {article.category}
                    </span>
                  </div>
                  
                  <h3 className="font-medium group-hover:text-plos-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  
                  {article.subtitle && (
                    <p className="text-sm text-plos-text-secondary mt-1 line-clamp-2">
                      {article.subtitle}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-3 text-xs text-plos-text-muted">
                    <span>{formatDate(article.published_at)}</span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {article.views}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsPage;
