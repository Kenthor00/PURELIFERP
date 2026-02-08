/**
 * PURE LIFE OS 3.0 - EMS Dashboard
 * WOW PASS Applied
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useSSE } from '../../context/SSEContext';
import { useNavigate } from 'react-router-dom';
import { OsStatCard, OsPanel, OsSectionHeader, OsListRow, OsBadge, OsEmptyState, OsSkeleton, OsQuickAction, OsPageHeader } from '../../components/os/OsComponents';
import {
  Heart,
  Users,
  FileText,
  Activity,
  Clock,
  ChevronRight,
  Plus,
  Ambulance,
  Stethoscope,
  AlertCircle,
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

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <OsPageHeader icon={Heart} title="DASHBOARD EMS" subtitle="Sistema Sanitario Digitale" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-plos-surface rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-plos-bg rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-plos-bg rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <OsPanel><OsSkeleton rows={4} /></OsPanel>
          <OsPanel><OsSkeleton rows={4} /></OsPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ems-dashboard">
      {/* Header */}
      <OsPageHeader 
        icon={Heart} 
        title={<>DASHBOARD <span className="text-red-400">EMS</span></>}
        subtitle="Sistema Sanitario Digitale"
        action={() => { play('click'); navigate('/ems/patients/new'); }}
        actionLabel="NUOVO PAZIENTE"
        actionIcon={Plus}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <OsStatCard
          icon={Users}
          label="PAZIENTI TOTALI"
          value={stats.pazienti_totali}
          color="red"
          onClick={() => navigate('/ems/patients')}
        />
        <OsStatCard
          icon={FileText}
          label="REFERTI OGGI"
          value={stats.referti_oggi}
          color="plos-primary"
          onClick={() => navigate('/ems/reports')}
        />
        <OsStatCard
          icon={Activity}
          label="REFERTI TOTALI"
          value={stats.referti_totali}
          color="blue"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <OsPanel>
          <OsSectionHeader 
            icon={Users} 
            title="PAZIENTI RECENTI" 
            color="red"
            action={() => navigate('/ems/patients')}
          />
          
          <div className="divide-y divide-plos-border/20">
            {recentPatients.length === 0 ? (
              <OsEmptyState 
                icon={Users}
                title="Nessun paziente registrato"
                description="Registra il primo paziente per iniziare"
                action={() => navigate('/ems/patients/new')}
                actionLabel="Registra paziente"
              />
            ) : (
              recentPatients.map((p, i) => (
                <OsListRow
                  key={p.id}
                  index={i}
                  onClick={() => {
                    play('click');
                    navigate(`/ems/patients/${p.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="mono text-[10px] text-plos-text-muted tracking-wider">{p.patient_number}</p>
                      <p className="text-sm font-medium mt-1 truncate group-hover:text-plos-primary transition-colors">{p.name}</p>
                      {p.blood_type && (
                        <p className="text-[10px] text-red-400 mt-1">Gruppo: {p.blood_type}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.is_critical && (
                        <OsBadge variant="danger">CRITICO</OsBadge>
                      )}
                      <ChevronRight size={14} className="text-plos-text-muted group-hover:text-plos-primary transition-colors" />
                    </div>
                  </div>
                </OsListRow>
              ))
            )}
          </div>
        </OsPanel>

        {/* Timeline */}
        <OsPanel>
          <OsSectionHeader 
            icon={Clock} 
            title="ATTIVITÀ RECENTE" 
            color="plos-primary"
            action={() => navigate('/timeline')}
            actionLabel="TIMELINE"
          />
          
          <div className="divide-y divide-plos-border/20">
            {recentEvents.length === 0 ? (
              <OsEmptyState 
                icon={Activity}
                title="Nessuna attività recente"
                description="Le attività EMS appariranno qui"
              />
            ) : (
              recentEvents.slice(0, 6).map((event, i) => (
                <OsListRow key={event.id} index={i}>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-plos-text-secondary mt-1 line-clamp-1">
                    {event.description}
                  </p>
                  <p className="mono text-[10px] text-plos-text-muted mt-2">
                    {new Date(event.created_at).toLocaleString('it-IT')}
                  </p>
                </OsListRow>
              ))
            )}
          </div>
        </OsPanel>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-plos-text-muted text-[10px] tracking-[0.2em] font-heading mb-3 uppercase flex items-center gap-2">
          <div className="w-1 h-3 bg-red-500 rounded-full"></div>
          AZIONI RAPIDE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <OsQuickAction
            icon={Plus}
            title="Nuovo Paziente"
            subtitle="Registra paziente"
            color="red"
            onClick={() => { play('click'); navigate('/ems/patients/new'); }}
          />
          <OsQuickAction
            icon={FileText}
            title="Nuovo Referto"
            subtitle="Crea referto medico"
            color="plos-primary"
            onClick={() => { play('click'); navigate('/ems/reports'); }}
          />
          <OsQuickAction
            icon={Stethoscope}
            title="Pazienti"
            subtitle="Gestione pazienti"
            color="blue"
            onClick={() => { play('click'); navigate('/ems/patients'); }}
          />
          <OsQuickAction
            icon={Ambulance}
            title="Dispatch"
            subtitle="Centrale operativa"
            color="orange"
            onClick={() => { play('click'); navigate('/dispatch'); }}
          />
        </div>
      </div>
    </div>
  );
};

export default EMSDashboard;
