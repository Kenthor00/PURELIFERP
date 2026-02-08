/**
 * PURE LIFE OS 3.0 - City Hub Page
 * Portale Cittadino Istituzionale Premium
 * Con Custom Scrollbar Premium per FiveM CEF browser
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  UserPlus,
  Megaphone,
  CalendarDays,
  Tv,
  Briefcase,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============================================
// PREMIUM CUSTOM SCROLLBAR COMPONENT
// Per compatibilità FiveM CEF Browser
// ============================================
const PremiumScrollbar = ({ containerRef, className = '' }) => {
  const [thumbHeight, setThumbHeight] = useState(50);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const trackRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // Calcola dimensioni thumb e posizione
  const updateScrollbar = useCallback(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const { scrollHeight, clientHeight, scrollTop } = container;
    const scrollableHeight = scrollHeight - clientHeight;
    
    // Mostra scrollbar solo se c'è contenuto da scrollare
    setIsVisible(scrollableHeight > 10);
    
    if (scrollableHeight <= 0) return;

    // Usa l'altezza effettiva del track
    const trackHeight = track.getBoundingClientRect().height - 16; // padding
    const ratio = clientHeight / scrollHeight;
    const calculatedHeight = Math.max(40, Math.min(trackHeight * 0.6, trackHeight * ratio));
    setThumbHeight(calculatedHeight);

    // Calcola posizione thumb
    const maxThumbTop = trackHeight - calculatedHeight;
    const newThumbTop = (scrollTop / scrollableHeight) * maxThumbTop;
    setThumbTop(newThumbTop);
    
    // Percentuale scroll
    setScrollPercent(Math.round((scrollTop / scrollableHeight) * 100));
  }, [containerRef]);

  // Aggiorna scrollbar quando il container scrolla
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);
    
    // Update iniziale con retry per garantire che il DOM sia pronto
    const timers = [
      setTimeout(updateScrollbar, 100),
      setTimeout(updateScrollbar, 500),
      setTimeout(updateScrollbar, 1000)
    ];
    
    return () => {
      container.removeEventListener('scroll', updateScrollbar);
      window.removeEventListener('resize', updateScrollbar);
      timers.forEach(clearTimeout);
    };
  }, [containerRef, updateScrollbar]);

  // Handle drag start
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = containerRef.current?.scrollTop || 0;
    document.body.style.userSelect = 'none';
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current || !trackRef.current) return;

      const container = containerRef.current;
      const track = trackRef.current;
      const trackRect = track.getBoundingClientRect();
      const trackHeight = trackRect.height - 16;
      
      const deltaY = e.clientY - dragStartY.current;
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      const maxThumbTop = trackHeight - thumbHeight;
      
      const scrollDelta = (deltaY / maxThumbTop) * scrollableHeight;
      container.scrollTop = dragStartScrollTop.current + scrollDelta;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, containerRef, thumbHeight]);

  // Handle click sul track per saltare alla posizione
  const handleTrackClick = (e) => {
    if (!containerRef.current || !trackRef.current) return;
    
    const track = trackRef.current;
    const trackRect = track.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top - 8; // 8px padding
    const trackHeight = trackRect.height - 16;
    
    const container = containerRef.current;
    const scrollableHeight = container.scrollHeight - container.clientHeight;
    const targetScroll = (clickY / trackHeight) * scrollableHeight;
    
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed right-2 sm:right-3 top-1/2 -translate-y-1/2 z-50 ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-testid="premium-scrollbar"
    >
      {/* Scrollbar Container con glow effect */}
      <div 
        className={`relative transition-all duration-300 ${
          isHovering || isDragging ? 'opacity-100' : 'opacity-90'
        }`}
      >
        {/* Percentage Indicator */}
        <div 
          className={`absolute -left-10 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isHovering || isDragging ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          }`}
        >
          <div className="px-2 py-1 bg-black/80 border border-plos-primary/30 rounded text-[10px] font-mono text-plos-primary backdrop-blur-sm">
            {scrollPercent}%
          </div>
        </div>

        {/* Track Background */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative w-3 sm:w-4 rounded-full cursor-pointer transition-all duration-300"
          style={{ 
            height: 'calc(80vh - 60px)',
            background: 'linear-gradient(180deg, rgba(0,200,83,0.08) 0%, rgba(0,0,0,0.4) 50%, rgba(0,200,83,0.08) 100%)',
            border: '1px solid rgba(0,200,83,0.25)',
            boxShadow: isHovering 
              ? '0 0 20px rgba(0,200,83,0.2), inset 0 0 10px rgba(0,200,83,0.05)' 
              : '0 0 10px rgba(0,200,83,0.1)'
          }}
        >
          {/* Track Glow Lines */}
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-plos-primary/20 to-transparent rounded-t-full" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-plos-primary/20 to-transparent rounded-b-full" />
          
          {/* Track Pattern */}
          <div className="absolute inset-2 opacity-30">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="w-full h-px bg-plos-primary/20 mb-4"
                style={{ marginTop: i === 0 ? '4px' : '0' }}
              />
            ))}
          </div>

          {/* Thumb */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute left-1/2 -translate-x-1/2 rounded-full cursor-grab transition-all duration-150 ${
              isDragging ? 'cursor-grabbing scale-110' : ''
            }`}
            style={{
              top: thumbTop + 8, // 8px padding
              height: thumbHeight,
              width: isHovering || isDragging ? '10px' : '8px',
            }}
          >
            {/* Thumb Glow Background */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: isDragging 
                  ? 'linear-gradient(180deg, #00c853 0%, #00e676 50%, #00c853 100%)'
                  : 'linear-gradient(180deg, rgba(0,200,83,0.8) 0%, rgba(0,230,118,0.9) 50%, rgba(0,200,83,0.8) 100%)',
                boxShadow: isDragging
                  ? '0 0 20px rgba(0,200,83,0.8), 0 0 40px rgba(0,200,83,0.4), inset 0 0 10px rgba(255,255,255,0.2)'
                  : isHovering 
                    ? '0 0 15px rgba(0,200,83,0.6), 0 0 30px rgba(0,200,83,0.3)'
                    : '0 0 10px rgba(0,200,83,0.4)',
              }}
            />
            
            {/* Thumb Inner Glow Line */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-0.5 rounded-full bg-white/40"
              style={{
                top: '20%',
                height: '60%',
              }}
            />
            
            {/* Thumb Top Cap */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
              }}
            />
            
            {/* Thumb Bottom Cap */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,200,83,0.6) 0%, transparent 70%)',
              }}
            />
          </div>
        </div>

        {/* Side Glow Effect */}
        <div 
          className={`absolute -left-1 top-0 bottom-0 w-1 rounded-full transition-opacity duration-300 ${
            isDragging ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,200,83,0.3) 50%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
};

// Logo Component - Compatto
const CityLogo = () => (
  <div className="flex items-center gap-2">
    <div className="relative">
      <img 
        src="/logo.png" 
        alt="Pure Life" 
        className="h-7 sm:h-8 w-auto"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      <div 
        className="hidden h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-br from-plos-primary/30 to-cyan-500/20 border border-plos-primary/50 rounded items-center justify-center"
      >
        <span className="text-plos-primary font-heading font-bold text-sm">PL</span>
      </div>
    </div>
    <div>
      <h1 className="font-heading text-sm sm:text-base tracking-wider">
        PURE LIFE <span className="text-plos-primary">CITY</span>
      </h1>
    </div>
  </div>
);

export const CityHubPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scrollContainerRef = useRef(null);
  
  const [activeAds, setActiveAds] = useState([]);
  const [events, setEvents] = useState([]);
  const [breakingNews, setBreakingNews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    fetchData();
    
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % Math.max(activeAds.length, 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [activeAds.length]);

  const fetchData = async () => {
    try {
      const [adsRes, eventsRes, newsRes, announcementsRes] = await Promise.all([
        axios.get(`${API_URL}/api/city/ads/active?slot_type=premium_banner&limit=5`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/city/events?limit=6`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/news/breaking?limit=3`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/city/announcements?limit=4`).catch(() => ({ data: [] })),
      ]);
      
      setActiveAds(adsRes.data);
      setEvents(eventsRes.data);
      setBreakingNews(newsRes.data);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
    } catch (error) {
      console.error('Errore fetch city hub:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackAdClick = async (adId, linkUrl) => {
    try {
      await axios.post(`${API_URL}/api/city/ads/${adId}/click`);
      if (linkUrl) window.open(linkUrl, '_blank');
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
      <div className="min-h-screen bg-[#080c0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-plos-primary/20 flex items-center justify-center animate-pulse">
            <Building2 size={32} className="text-plos-primary" />
          </div>
          <p className="text-plos-text-muted text-sm tracking-widest">CARICAMENTO PORTALE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#080c0f]" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Scrollable Content Container */}
      <div 
        ref={scrollContainerRef}
        className="fivem-scroll-container" 
        data-testid="city-hub-page"
        style={{ 
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch'
        }}
      >
      {/* Institutional Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-plos-primary/[0.02] via-transparent to-cyan-500/[0.02]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-plos-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header - Compatto */}
      <header className="sticky top-0 z-50 bg-[#0a0f12]/95 backdrop-blur-xl border-b border-plos-border/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <CityLogo />
            
            <nav className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-heading text-plos-text-secondary hover:text-white border border-plos-border hover:border-plos-text-muted rounded transition-all"
              >
                ACCEDI
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-heading bg-plos-primary/10 text-plos-primary border border-plos-primary/50 hover:bg-plos-primary/20 rounded transition-all"
                data-testid="cityhub-register-btn"
              >
                REGISTRATI
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main className="relative flex-1 overflow-y-auto">
        {/* Hero Panel - Ultra Compatto per Tablet */}
        <section className="relative py-4 sm:py-6 lg:py-8 overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
            <div className="relative bg-gradient-to-br from-plos-surface/80 to-[#0a0f12]/90 backdrop-blur-xl border border-plos-border/50 rounded-lg p-4 sm:p-5 lg:p-6 overflow-hidden">
              {/* Decorative elements - hidden on small screens */}
              <div className="hidden sm:block absolute top-0 right-0 w-32 h-32 bg-plos-primary/10 rounded-full blur-[40px]" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={12} className="text-plos-primary" />
                  <span className="text-[8px] sm:text-[9px] tracking-[0.2em] text-plos-primary font-heading">SERVIZI DIGITALI</span>
                </div>
                
                <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold leading-tight mb-2">
                  Benvenuto nel <span className="text-plos-primary">Portale</span>
                </h2>
                
                <p className="text-plos-text-secondary text-xs sm:text-sm mb-4 max-w-md leading-relaxed">
                  Accedi ai servizi digitali. Consulta annunci, eventi e opportunità.
                </p>
                
                {/* Pulsanti in griglia 2x2 per tablet */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                  <button
                    onClick={() => navigate('/city/announcements')}
                    className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-xs transition-all"
                  >
                    <Megaphone size={14} />
                    <span>Annunci</span>
                  </button>
                  <button
                    onClick={() => navigate('/city/events')}
                    className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 bg-white/5 border border-plos-border hover:border-plos-text-muted rounded-lg text-white font-heading text-xs transition-all"
                  >
                    <Calendar size={14} />
                    <span>Eventi</span>
                  </button>
                  <button
                    onClick={() => navigate('/city/recruitment')}
                    className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 bg-white/5 border border-plos-border hover:border-plos-text-muted rounded-lg text-white font-heading text-xs transition-all"
                  >
                    <Briefcase size={14} />
                    <span>Lavoro</span>
                  </button>
                  <button
                    onClick={() => navigate('/city/appointments')}
                    className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 bg-white/5 border border-plos-border hover:border-plos-text-muted rounded-lg text-white font-heading text-xs transition-all"
                  >
                    <CalendarDays size={14} />
                    <span>Prenota</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Breaking News Banner - Compatto */}
        {breakingNews.length > 0 && (
          <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 mb-4">
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-2.5 sm:p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-red-500/20 rounded">
                  <AlertCircle className="text-red-400 animate-pulse" size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-heading text-red-400 text-[8px] tracking-wider block">ULTIMA ORA</span>
                  <h3 className="font-medium text-xs truncate">{breakingNews[0].title}</h3>
                </div>
                <button
                  onClick={() => navigate(`/city/news/${breakingNews[0].id}`)}
                  className="flex-shrink-0 px-2.5 py-1 text-red-400 border border-red-500/50 hover:bg-red-500/10 rounded text-[10px] font-heading transition-all"
                >
                  Leggi
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Content Grid - Stack verticale su mobile */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-6 sm:pb-8 space-y-4">
          
          {/* Announcements Section - Compatto */}
          <div className="bg-gradient-to-br from-plos-surface/60 to-transparent border border-plos-border/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-plos-border/30">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-500/20 rounded">
                  <Megaphone size={14} className="text-purple-400" />
                </div>
                <h2 className="font-heading text-sm tracking-wider">ANNUNCI</h2>
              </div>
              <button
                onClick={() => navigate('/city/announcements')}
                className="text-plos-primary text-[9px] tracking-wider hover:underline flex items-center gap-0.5"
              >
                TUTTI <ChevronRight size={10} />
              </button>
            </div>
            
            <div className="p-3">
              {announcements.length === 0 ? (
                <div className="text-center py-4">
                  <Megaphone size={20} className="mx-auto mb-1.5 text-plos-text-muted/30" />
                  <p className="text-plos-text-muted text-xs">Nessun annuncio</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {announcements.slice(0, 4).map((announcement) => (
                    <div
                      key={announcement.id}
                      className="group p-2.5 bg-black/20 border border-plos-border/30 rounded hover:border-purple-500/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/city/announcements/${announcement.id}`)}
                    >
                      <span className="text-[8px] text-purple-400 font-heading tracking-wider">
                        {announcement.category?.toUpperCase() || 'GENERALE'}
                      </span>
                      <h3 className="font-medium text-xs mt-0.5 group-hover:text-plos-primary transition-colors line-clamp-2">
                        {announcement.title}
                      </h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Events and News Grid - Stack su mobile */}
          <div className="grid lg:grid-cols-3 gap-4">
            
            {/* Events */}
            <div className="lg:col-span-2 bg-gradient-to-br from-plos-surface/60 to-transparent border border-plos-border/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-plos-border/30">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-500/20 rounded">
                    <Calendar size={14} className="text-blue-400" />
                  </div>
                  <h2 className="font-heading text-sm tracking-wider">EVENTI</h2>
                </div>
                <button
                  onClick={() => navigate('/city/events')}
                  className="text-plos-primary text-[9px] tracking-wider hover:underline flex items-center gap-0.5"
                >
                  TUTTI <ChevronRight size={10} />
                </button>
              </div>
              
              <div className="p-3">
                {events.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar size={20} className="mx-auto mb-1.5 text-plos-text-muted/30" />
                    <p className="text-plos-text-muted text-xs">Nessun evento</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {events.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => navigate(`/city/events/${event.id}`)}
                        className="group bg-black/30 border border-plos-border/30 rounded overflow-hidden hover:border-blue-500/30 transition-all cursor-pointer"
                        data-testid={`event-${event.id}`}
                      >
                        <div className="p-2.5">
                          <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-heading tracking-wider rounded">
                            {event.category?.toUpperCase() || 'EVENTO'}
                          </span>
                          <h3 className="font-medium text-xs mt-1 group-hover:text-plos-primary transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] text-plos-text-muted">
                            <span className="flex items-center gap-0.5">
                              <Clock size={9} className="text-blue-400" />
                              {formatEventDate(event.event_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Media Panel - Weazel News */}
            <div className="bg-gradient-to-br from-plos-surface/60 to-transparent border border-plos-border/50 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-plos-border/30">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-500/20 rounded relative">
                    <Tv size={14} className="text-red-400" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <h2 className="font-heading text-sm tracking-wider">NEWS</h2>
                </div>
              </div>
              
              <div className="divide-y divide-plos-border/20">
                {breakingNews.length === 0 ? (
                  <div className="p-4 text-center">
                    <Tv size={20} className="mx-auto mb-1.5 text-plos-text-muted/30" />
                    <p className="text-plos-text-muted text-xs">Nessuna news</p>
                  </div>
                ) : (
                  breakingNews.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => navigate(`/city/news/${article.id}`)}
                      className="p-2.5 hover:bg-white/[0.02] cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[7px] font-heading tracking-wider rounded">
                          {article.category?.toUpperCase() || 'NEWS'}
                        </span>
                        {article.is_breaking && (
                          <span className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 text-[7px] font-heading rounded animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-medium group-hover:text-plos-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t border-plos-border/30">
                <button
                  onClick={() => navigate('/city/news')}
                  className="w-full py-2.5 text-center text-plos-primary text-sm font-heading tracking-wider hover:bg-plos-primary/10 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  TUTTE LE NEWS
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Premium Banner Ads */}
          {activeAds.length > 0 && (
            <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden border border-plos-border/50">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="px-2 py-1 bg-plos-primary/20 text-plos-primary text-[10px] font-heading rounded">SPONSOR</span>
                    <h3 className="font-heading text-2xl mt-2">{ad.title}</h3>
                    {ad.description && (
                      <p className="text-sm text-plos-text-secondary mt-1 line-clamp-2">{ad.description}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Dots */}
              <div className="absolute bottom-4 right-6 flex gap-2">
                {activeAds.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAdIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentAdIndex ? 'bg-plos-primary w-6' : 'bg-plos-text-muted/50 hover:bg-plos-text-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-plos-border/30 bg-[#080c0f]/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-plos-primary/10 rounded-lg">
                  <Building2 size={18} className="text-plos-primary" />
                </div>
                <div>
                  <p className="font-heading text-sm">PURE LIFE CITY</p>
                  <p className="text-[10px] text-plos-text-muted">© 2026 Tutti i diritti riservati</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-plos-text-muted">
                <button onClick={() => navigate('/city/news')} className="hover:text-white transition-colors">News</button>
                <button onClick={() => navigate('/city/events')} className="hover:text-white transition-colors">Eventi</button>
                <button onClick={() => navigate('/city/announcements')} className="hover:text-white transition-colors">Annunci</button>
                <button onClick={() => navigate('/login')} className="hover:text-plos-primary transition-colors">Accedi</button>
              </div>
            </div>
          </div>
        </footer>
      </main>
      </div>

      {/* Premium Custom Scrollbar per FiveM CEF */}
      <PremiumScrollbar containerRef={scrollContainerRef} />
    </div>
  );
};

export default CityHubPage;
