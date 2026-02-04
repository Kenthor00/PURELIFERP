import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Calendar,
  Newspaper,
  ChevronRight,
  MapPin,
  Clock,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CityHubPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [activeAds, setActiveAds] = useState([]);
  const [events, setEvents] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    fetchData();
    
    // Rotate banner ads every 5 seconds
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % Math.max(activeAds.length, 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeAds.length]);

  const fetchData = async () => {
    try {
      const [adsRes, eventsRes, newsRes] = await Promise.all([
        axios.get(`${API_URL}/api/city/ads/active?slot_type=premium_banner&limit=5`),
        axios.get(`${API_URL}/api/city/events?limit=6`),
        axios.get(`${API_URL}/api/news/breaking?limit=3`),
      ]);
      
      setActiveAds(adsRes.data);
      setEvents(eventsRes.data);
      setBreakingNews(newsRes.data);
    } catch (error) {
      console.error('Errore fetch city hub:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackAdClick = async (adId, linkUrl) => {
    try {
      await axios.post(`${API_URL}/api/city/ads/${adId}/click`);
      if (linkUrl) {
        window.open(linkUrl, '_blank');
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center">
        <div className="text-plos-primary animate-pulse font-heading text-xl">
          CARICAMENTO CITY HUB...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tactical-bg" data-testid="city-hub-page">
      {/* Header */}
      <header className="bg-plos-surface border-b border-plos-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
                <span className="text-plos-primary font-heading font-bold">PL</span>
              </div>
              <div>
                <h1 className="font-heading text-xl tracking-wider">
                  PURE LIFE <span className="text-plos-primary">CITY</span>
                </h1>
                <p className="text-xs text-plos-text-secondary">Portale Città</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-4">
              <button
                onClick={() => navigate('/city/news')}
                className="text-sm text-plos-text-secondary hover:text-plos-primary flex items-center gap-1"
              >
                <Newspaper size={16} />
                <span className="hidden sm:inline">News</span>
              </button>
              <button
                onClick={() => navigate('/city/events')}
                className="text-sm text-plos-text-secondary hover:text-plos-primary flex items-center gap-1"
              >
                <Calendar size={16} />
                <span className="hidden sm:inline">Eventi</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-tactical text-sm"
              >
                ACCEDI
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Breaking News Banner */}
        {breakingNews.length > 0 && (
          <div className="bg-red-500/10 border border-red-500 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-500 animate-pulse" size={24} />
              <div className="flex-1">
                <span className="font-heading text-red-500 text-sm">BREAKING NEWS</span>
                <h3 className="font-medium">{breakingNews[0].title}</h3>
              </div>
              <button
                onClick={() => navigate(`/city/news/${breakingNews[0].id}`)}
                className="text-red-500 hover:underline text-sm"
              >
                Leggi
              </button>
            </div>
          </div>
        )}

        {/* Premium Banner Ads */}
        {activeAds.length > 0 && (
          <div className="relative h-48 sm:h-64 overflow-hidden border border-plos-border">
            {activeAds.map((ad, index) => (
              <div
                key={ad.id}
                onClick={() => trackAdClick(ad.id, ad.link_url)}
                className={`absolute inset-0 transition-opacity duration-500 cursor-pointer ${
                  index === currentAdIndex ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  backgroundImage: `url(${ad.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-xs text-plos-primary font-heading">SPONSOR</span>
                  <h3 className="font-heading text-xl">{ad.title}</h3>
                  {ad.description && (
                    <p className="text-sm text-plos-text-secondary mt-1">{ad.description}</p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Dots indicator */}
            <div className="absolute bottom-2 right-4 flex gap-1">
              {activeAds.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentAdIndex ? 'bg-plos-primary' : 'bg-plos-text-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Events */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl tracking-wider flex items-center gap-2">
                <Calendar className="text-plos-primary" />
                EVENTI IN CITTÀ
              </h2>
              <button
                onClick={() => navigate('/city/events')}
                className="text-plos-primary text-sm hover:underline"
              >
                Vedi tutti
              </button>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {events.length === 0 ? (
                <p className="text-plos-text-muted col-span-2 text-center py-8">
                  Nessun evento in programma
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/city/events/${event.id}`)}
                    className="card-tactical p-4 cursor-pointer group"
                    data-testid={`event-${event.id}`}
                  >
                    {event.image_url && (
                      <div
                        className="h-32 mb-3 bg-cover bg-center"
                        style={{ backgroundImage: `url(${event.image_url})` }}
                      />
                    )}
                    <span className="text-xs text-plos-primary uppercase font-heading">
                      {event.category}
                    </span>
                    <h3 className="font-medium mt-1 group-hover:text-plos-primary">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-plos-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatEventDate(event.event_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {event.location}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* News Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl tracking-wider flex items-center gap-2">
                <Newspaper className="text-plos-primary" />
                WEAZEL NEWS
              </h2>
              <button
                onClick={() => navigate('/city/news')}
                className="text-plos-primary text-sm hover:underline"
              >
                Tutte
              </button>
            </div>
            
            <div className="space-y-3">
              {breakingNews.length === 0 ? (
                <p className="text-plos-text-muted text-center py-4">
                  Nessuna news recente
                </p>
              ) : (
                breakingNews.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => navigate(`/city/news/${article.id}`)}
                    className="card-tactical p-3 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      {article.image_url && (
                        <div
                          className="w-16 h-16 flex-shrink-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${article.image_url})` }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium group-hover:text-plos-primary line-clamp-2">
                          {article.title}
                        </h4>
                        <p className="text-xs text-plos-text-muted mt-1">
                          {new Date(article.published_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Standard Card Ads */}
        <div className="grid sm:grid-cols-3 gap-4">
          {activeAds.filter(ad => ad.slot_type === 'standard_card').slice(0, 3).map((ad) => (
            <div
              key={ad.id}
              onClick={() => trackAdClick(ad.id, ad.link_url)}
              className="card-tactical p-4 cursor-pointer"
            >
              <span className="text-xs text-plos-text-muted">Sponsor</span>
              <h4 className="font-medium mt-1">{ad.title}</h4>
              {ad.description && (
                <p className="text-sm text-plos-text-secondary mt-1 line-clamp-2">
                  {ad.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-plos-surface border-t border-plos-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-plos-text-muted text-sm">
            © 2024 PURE LIFE RP - Tutti i diritti riservati
          </p>
          <p className="text-plos-text-muted text-xs mt-1 mono">
            PURE LIFE OS v2.0.0
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CityHubPage;
