import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useSSE } from '../../context/SSEContext';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Users,
  FileText,
  Activity,
  Clock,
  ChevronRight,
  Plus,
} from 'lucide-react';

export const EMSDashboard = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const { subscribe } = useSSE();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    pazienti_totali: 0,
    referti_oggi: 0,
    referti_totali: 0,
  });
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, patientsRes, eventsRes] = await Promise.all([
          api.get('/ems/stats'),
          api.get('/ems/patients?limit=5'),
          api.get('/timeline/recent?limit=10'),
        ]);
        
        setStats(statsRes.data);
        setRecentPatients(patientsRes.data);
        setRecentEvents(eventsRes.data.filter(e => e.category === 'ems'));
      } catch (error) {
        console.error('Errore fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const unsubscribe = subscribe('patient_registered', (event) => {
      play('notification');
      setStats(prev => ({ ...prev, pazienti_totali: prev.pazienti_totali + 1 }));
    });

    return () => unsubscribe();
  }, [api, subscribe, play]);

  const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={`card-tactical p-4 cursor-pointer group ${onClick ? 'hover:border-plos-primary' : ''}`}
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
    <div className="space-y-6" data-testid="ems-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Heart className="text-red-500" />
            DASHBOARD <span className="text-red-500">EMS</span>
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            Sistema Sanitario Digitale
          </p>
        </div>
        
        <button
          onClick={() => {
            play('click');
            navigate('/ems/patients/new');
          }}
          className="btn-tactical flex items-center gap-2"
          data-testid="new-patient-btn"
        >
          <Plus size={18} />
          NUOVO PAZIENTE
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="PAZIENTI TOTALI"
          value={stats.pazienti_totali}
          color="text-red-500"
          onClick={() => navigate('/ems/patients')}
        />
        <StatCard
          icon={FileText}
          label="REFERTI OGGI"
          value={stats.referti_oggi}
          color="text-plos-primary"
          onClick={() => navigate('/ems/reports')}
        />
        <StatCard
          icon={Activity}
          label="REFERTI TOTALI"
          value={stats.referti_totali}
          color="text-blue-500"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <Users size={18} className="text-red-500" />
              PAZIENTI RECENTI
            </h2>
            <button
              onClick={() => navigate('/ems/patients')}
              className="text-plos-primary text-xs hover:underline"
            >
              Vedi tutti
            </button>
          </div>
          
          <div className="space-y-2">
            {recentPatients.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessun paziente registrato
              </p>
            ) : (
              recentPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    play('click');
                    navigate(`/ems/patients/${p.id}`);
                  }}
                  className="p-3 bg-black/30 border border-plos-border hover:border-plos-primary cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mono text-xs text-plos-text-secondary">{p.patient_number}</p>
                      <p className="text-sm font-medium mt-1">{p.name}</p>
                      {p.blood_type && (
                        <span className="text-xs text-red-500">Gruppo: {p.blood_type}</span>
                      )}
                    </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <button
          onClick={() => {
            play('click');
            navigate('/ems/patients/new');
          }}
          className="p-4 bg-red-500/10 border border-red-500/30 hover:border-red-500 transition-colors text-center"
        >
          <Users className="mx-auto mb-2 text-red-500" size={24} />
          <span className="font-heading text-sm">Nuovo Paziente</span>
        </button>
        
        <button
          onClick={() => {
            play('click');
            navigate('/ems/reports/new');
          }}
          className="p-4 bg-plos-primary/10 border border-plos-primary/30 hover:border-plos-primary transition-colors text-center"
        >
          <FileText className="mx-auto mb-2 text-plos-primary" size={24} />
          <span className="font-heading text-sm">Nuovo Referto</span>
        </button>
        
        <button
          onClick={() => {
            play('click');
            navigate('/dispatch');
          }}
          className="p-4 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500 transition-colors text-center"
        >
          <Activity className="mx-auto mb-2 text-blue-500" size={24} />
          <span className="font-heading text-sm">Dispatch</span>
        </button>
      </div>
    </div>
  );
};

export default EMSDashboard;
