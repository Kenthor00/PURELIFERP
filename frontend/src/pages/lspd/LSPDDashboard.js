import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useSSE } from '../../context/SSEContext';
import { useNavigate } from 'react-router-dom';
import { StatsSkeleton, ListSkeleton } from '../../components/ui/Skeleton';
import {
  Shield,
  FileText,
  AlertTriangle,
  DollarSign,
  Radio,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';

export const LSPDDashboard = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const { subscribe } = useSSE();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    casi_aperti: 0,
    mandati_attivi: 0,
    multe_non_pagate: 0,
    totale_multe: 0,
  });
  const [recentCases, setRecentCases] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, casesRes, eventsRes] = await Promise.all([
          api.get('/lspd/stats'),
          api.get('/lspd/cases?limit=5'),
          api.get('/timeline/recent?limit=10'),
        ]);
        
        setStats(statsRes.data);
        setRecentCases(casesRes.data);
        setRecentEvents(eventsRes.data.filter(e => e.category === 'lspd'));
      } catch (error) {
        console.error('Errore fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = subscribe('case_created', (event) => {
      play('notification');
      setStats(prev => ({ ...prev, casi_aperti: prev.casi_aperti + 1 }));
    });

    return () => unsubscribe();
  }, [api, subscribe, play]);

  const StatCard = ({ icon: Icon, label, value, color, onClick, trend }) => (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-gradient-to-br from-plos-surface to-plos-bg border border-plos-border rounded-lg p-5 cursor-pointer group transition-all duration-300 hover:border-opacity-50 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${onClick ? 'hover:border-plos-primary/50' : ''}`}
      data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
      style={{ '--stat-color': color.includes('blue') ? '#3b82f6' : color.includes('orange') ? '#f97316' : color.includes('red') ? '#ef4444' : '#00ff9c' }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ background: 'var(--stat-color)' }} />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" 
           style={{ background: `radial-gradient(ellipse at top, color-mix(in srgb, var(--stat-color) 10%, transparent) 0%, transparent 70%)` }} />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-plos-text-muted text-[10px] tracking-[0.15em] font-heading mb-2 uppercase">
            {label}
          </p>
          <p className={`font-heading text-4xl font-bold tracking-tight ${color}`}>{value}</p>
          {trend && (
            <div className={`mt-2 text-xs flex items-center gap-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
              <span>{Math.abs(trend)}% oggi</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-black/40 border ${color.replace('text-', 'border-')}/30 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className={color} />
        </div>
      </div>
      
      {onClick && (
        <div className="mt-4 pt-3 border-t border-plos-border/50 flex items-center gap-1 text-plos-text-muted text-xs group-hover:text-plos-primary transition-colors">
          <span className="tracking-wider">APRI DETTAGLI</span>
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="lspd-dashboard-loading">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
              <Shield className="text-blue-500" />
              DASHBOARD <span className="text-blue-500">LSPD</span>
            </h1>
            <p className="text-plos-text-secondary text-sm mt-1">
              Centro Operativo Polizia
            </p>
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <StatsSkeleton count={4} />
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-tactical p-4">
            <h3 className="font-heading text-sm tracking-wider mb-4">CASI RECENTI</h3>
            <ListSkeleton rows={5} />
          </div>
          <div className="card-tactical p-4">
            <h3 className="font-heading text-sm tracking-wider mb-4">ATTIVITÀ RECENTE</h3>
            <ListSkeleton rows={5} showAvatar />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="lspd-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Shield className="text-blue-500" />
            DASHBOARD <span className="text-blue-500">LSPD</span>
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            Centro Operativo Polizia
          </p>
        </div>
        
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/cases/new');
          }}
          className="btn-tactical flex items-center gap-2"
          data-testid="new-case-btn"
        >
          <Plus size={18} />
          NUOVO CASO
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="CASI APERTI"
          value={stats.casi_aperti}
          color="text-blue-500"
          onClick={() => navigate('/lspd/cases')}
        />
        <StatCard
          icon={AlertTriangle}
          label="MANDATI ATTIVI"
          value={stats.mandati_attivi}
          color="text-orange-500"
          onClick={() => navigate('/lspd/warrants')}
        />
        <StatCard
          icon={DollarSign}
          label="MULTE NON PAGATE"
          value={stats.multe_non_pagate}
          color="text-red-500"
          onClick={() => navigate('/lspd/fines')}
        />
        <StatCard
          icon={TrendingUp}
          label="TOTALE MULTE €"
          value={stats.totale_multe?.toLocaleString() || 0}
          color="text-plos-primary"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              CASI RECENTI
            </h2>
            <button
              onClick={() => navigate('/lspd/cases')}
              className="text-plos-primary text-xs hover:underline"
            >
              Vedi tutti
            </button>
          </div>
          
          <div className="space-y-2">
            {recentCases.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessun caso recente
              </p>
            ) : (
              recentCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    play('click');
                    navigate(`/lspd/cases/${c.id}`);
                  }}
                  className="p-3 bg-black/30 border border-plos-border hover:border-plos-primary cursor-pointer transition-colors"
                  data-testid={`case-${c.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mono text-xs text-plos-text-secondary">{c.case_number}</p>
                      <p className="text-sm font-medium mt-1">{c.title}</p>
                    </div>
                    <span className={`status-badge status-${c.status}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <Clock size={18} className="text-plos-primary" />
              ATTIVITÀ RECENTE
            </h2>
            <button
              onClick={() => navigate('/timeline')}
              className="text-plos-primary text-xs hover:underline"
            >
              Timeline completa
            </button>
          </div>
          
          <div className="space-y-0">
            {recentEvents.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessuna attività recente
              </p>
            ) : (
              recentEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="timeline-item">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-plos-text-secondary mt-1">
                    {event.description}
                  </p>
                  <p className="mono text-xs text-plos-text-muted mt-1">
                    {new Date(event.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - OS Style Module Grid */}
      <div className="mt-6">
        <h2 className="text-plos-text-muted text-[10px] tracking-[0.2em] font-heading mb-3 uppercase flex items-center gap-2">
          <div className="w-1 h-3 bg-plos-primary rounded-full"></div>
          AZIONI RAPIDE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => {
              play('click');
              navigate('/lspd/cases/new');
            }}
            className="group relative overflow-hidden p-5 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-lg hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
            <FileText className="mb-3 text-blue-400 group-hover:scale-110 transition-transform" size={28} />
            <p className="font-heading text-sm text-white">Nuovo Caso</p>
            <p className="text-[10px] text-plos-text-muted mt-1">Apri investigazione</p>
          </button>
          
          <button
            onClick={() => {
              play('click');
              navigate('/lspd/warrants/new');
            }}
            className="group relative overflow-hidden p-5 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
            <AlertTriangle className="mb-3 text-orange-400 group-hover:scale-110 transition-transform" size={28} />
            <p className="font-heading text-sm text-white">Nuovo Mandato</p>
            <p className="text-[10px] text-plos-text-muted mt-1">Emetti mandato</p>
          </button>
          
          <button
            onClick={() => {
              play('click');
              navigate('/lspd/fines/new');
            }}
            className="group relative overflow-hidden p-5 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-lg hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
            <DollarSign className="mb-3 text-red-400 group-hover:scale-110 transition-transform" size={28} />
            <p className="font-heading text-sm text-white">Nuova Multa</p>
            <p className="text-[10px] text-plos-text-muted mt-1">Sanzione amministrativa</p>
          </button>
          
          <button
            onClick={() => {
              play('click');
              navigate('/dispatch');
            }}
            className="group relative overflow-hidden p-5 bg-gradient-to-br from-plos-primary/10 to-transparent border border-plos-primary/20 rounded-lg hover:border-plos-primary/50 hover:shadow-lg hover:shadow-plos-primary/10 transition-all duration-300 text-left"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-plos-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
            <Radio className="mb-3 text-plos-primary group-hover:scale-110 transition-transform" size={28} />
            <p className="font-heading text-sm text-white">Dispatch</p>
            <p className="text-[10px] text-plos-text-muted mt-1">Centro chiamate</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LSPDDashboard;
