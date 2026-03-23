import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Newspaper, Eye, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CitizenNewsPage = () => {
  const { token } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/api/news/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setArticles(Array.isArray(res.data) ? res.data : res.data?.articles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  if (selected) {
    return (
      <div className="max-w-3xl" data-testid="news-detail">
        <button onClick={() => setSelected(null)} className="text-xs text-plos-text-secondary hover:text-white mb-4 flex items-center gap-1">
          ← Torna alle news
        </button>
        <article>
          {selected.image_url && <img src={selected.image_url} alt="" className="w-full h-48 object-cover rounded-lg mb-4" />}
          {selected.is_breaking_news && <span className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded-full font-bold uppercase">Breaking News</span>}
          <h1 className="text-2xl font-bold text-white mt-2">{selected.title}</h1>
          {selected.subtitle && <p className="text-sm text-plos-text-secondary mt-1">{selected.subtitle}</p>}
          <div className="flex items-center gap-3 mt-3 text-[10px] text-plos-text-muted">
            <span>{selected.category}</span>
            <span>{selected.published_at?.split('T')[0] || selected.created_at?.split('T')[0]}</span>
            {selected.views > 0 && <span className="flex items-center gap-1"><Eye size={10} /> {selected.views}</span>}
          </div>
          <div className="mt-6 text-sm text-plos-text-secondary leading-relaxed whitespace-pre-wrap">
            {selected.content}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl" data-testid="citizen-news-page">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Newspaper size={22} className="text-yellow-400" /> Weazel News</h1>
        <p className="text-xs text-plos-text-secondary mt-1">Ultime notizie da Los Santos</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-plos-text-secondary">Caricamento...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-plos-text-muted">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nessuna notizia disponibile</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {articles.map(a => (
            <button key={a.id} onClick={() => setSelected(a)} className="text-left bg-plos-bg-secondary border border-plos-border rounded-lg overflow-hidden hover:border-plos-primary/50 transition-all" data-testid={`news-${a.id}`}>
              {a.image_url && <img src={a.image_url} alt="" className="w-full h-32 object-cover" />}
              <div className="p-3">
                {a.is_breaking_news && <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-bold">BREAKING</span>}
                <h3 className="text-sm font-bold text-white mt-1 line-clamp-2">{a.title}</h3>
                {a.subtitle && <p className="text-xs text-plos-text-secondary mt-1 line-clamp-2">{a.subtitle}</p>}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-plos-text-muted">
                  <Clock size={10} />
                  <span>{a.published_at?.split('T')[0] || a.created_at?.split('T')[0]}</span>
                  <span className="px-1.5 py-0.5 bg-plos-bg-primary rounded">{a.category}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitizenNewsPage;
