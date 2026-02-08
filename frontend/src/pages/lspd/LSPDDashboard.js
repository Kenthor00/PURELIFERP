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

  const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={`card-tactical p-4 cursor-pointer group ${onClick ? 'hover:border-plos-primary' : ''}`}
      data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-plos-text-secondary text-xs tracking-wider font-heading mb-1">
            {label}
          </p>
          <p className={`font-heading text-3xl ${color}`}>{value}</p>
        </div>
        <div className={`p-2 border ${color.replace('text-', 'border-')} bg-black/30`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      {onClick && (
        <div className="mt-3 flex items-center gap-1 text-plos-text-muted text-xs group-hover:text-plos-primary transition-colors">
          <span>Visualizza</span>
          <ChevronRight size={14} />
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-plos-primary animate-pulse">Caricamento...</div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/cases/new');
          }}
          className="p-4 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 transition-colors text-center"
        >
          <FileText className="mx-auto mb-2 text-blue-500" size={24} />
          <span className="font-heading text-sm">Nuovo Caso</span>
        </button>
        
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/warrants/new');
          }}
          className="p-4 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500 transition-colors text-center"
        >
          <AlertTriangle className="mx-auto mb-2 text-orange-500" size={24} />
          <span className="font-heading text-sm">Nuovo Mandato</span>
        </button>
        
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/fines/new');
          }}
          className="p-4 bg-red-500/10 border border-red-500/30 hover:border-red-500 transition-colors text-center"
        >
          <DollarSign className="mx-auto mb-2 text-red-500" size={24} />
          <span className="font-heading text-sm">Nuova Multa</span>
        </button>
        
        <button
          onClick={() => {
            play('click');
            navigate('/dispatch');
          }}
          className="p-4 bg-plos-primary/10 border border-plos-primary/30 hover:border-plos-primary transition-colors text-center"
        >
          <Radio className="mx-auto mb-2 text-plos-primary" size={24} />
          <span className="font-heading text-sm">Dispatch</span>
        </button>
      </div>
    </div>
  );
};

export default LSPDDashboard;
