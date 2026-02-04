import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Calendar,
  FileText,
  Users,
  Clock,
  Plus,
  ChevronRight,
  Gavel,
} from 'lucide-react';

export const JusticePage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    pratiche_in_attesa: 0,
    udienze_programmate: 0,
    verdetti_oggi: 0,
  });
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, hearingsRes, casesRes] = await Promise.all([
        api.get('/justice/stats'),
        api.get('/justice/hearings?limit=10'),
        api.get('/justice/cases?limit=10'),
      ]);
      
      setStats(statsRes.data);
      setHearings(hearingsRes.data);
      setCases(casesRes.data);
    } catch (error) {
      console.error('Errore fetch justice:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-500 border-blue-500';
      case 'in_progress': return 'text-orange-500 border-orange-500';
      case 'completed': return 'text-green-500 border-green-500';
      case 'draft': return 'text-plos-text-muted border-plos-border';
      case 'submitted': return 'text-blue-500 border-blue-500';
      case 'review': return 'text-orange-500 border-orange-500';
      case 'approved': return 'text-green-500 border-green-500';
      case 'rejected': return 'text-red-500 border-red-500';
      default: return 'text-plos-text-muted border-plos-border';
    }
  };

  const canCreateHearing = user?.role === 'judge' || user?.role === 'government' || user?.role === 'admin';
  const canCreateCase = user?.role === 'lawyer' || user?.role === 'prosecutor' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-plos-primary animate-pulse">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="justice-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Scale className="text-purple-500" />
            GOVERNO & <span className="text-purple-500">GIUSTIZIA</span>
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            Sistema Giudiziario
          </p>
        </div>
        
        <div className="flex gap-2">
          {canCreateCase && (
            <button
              onClick={() => {
                play('click');
                navigate('/justice/cases/new');
              }}
              className="btn-tactical flex items-center gap-2"
            >
              <Plus size={18} />
              NUOVA PRATICA
            </button>
          )}
          {canCreateHearing && (
            <button
              onClick={() => {
                play('click');
                navigate('/justice/hearings/new');
              }}
              className="btn-tactical flex items-center gap-2"
            >
              <Calendar size={18} />
              NUOVA UDIENZA
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-tactical p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs tracking-wider font-heading">
                PRATICHE IN ATTESA
              </p>
              <p className="font-heading text-3xl text-orange-500">{stats.pratiche_in_attesa}</p>
            </div>
            <FileText className="text-orange-500" size={24} />
          </div>
        </div>
        
        <div className="card-tactical p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs tracking-wider font-heading">
                UDIENZE PROGRAMMATE
              </p>
              <p className="font-heading text-3xl text-blue-500">{stats.udienze_programmate}</p>
            </div>
            <Calendar className="text-blue-500" size={24} />
          </div>
        </div>
        
        <div className="card-tactical p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs tracking-wider font-heading">
                VERDETTI OGGI
              </p>
              <p className="font-heading text-3xl text-green-500">{stats.verdetti_oggi}</p>
            </div>
            <Gavel className="text-green-500" size={24} />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              PROSSIME UDIENZE
            </h2>
          </div>
          
          <div className="space-y-3">
            {hearings.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessuna udienza programmata
              </p>
            ) : (
              hearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="p-3 bg-black/30 border border-plos-border hover:border-purple-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono text-xs text-purple-500">{hearing.hearing_number}</span>
                        <span className={`status-badge ${getStatusColor(hearing.status)}`}>
                          {hearing.status}
                        </span>
                      </div>
                      <p className="font-medium">{hearing.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-plos-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(hearing.scheduled_date).toLocaleString('it-IT')}
                        </span>
                        {hearing.courtroom && (
                          <span>Aula: {hearing.courtroom}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="text-plos-text-muted" size={20} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legal Cases */}
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-orange-500" />
              PRATICHE LEGALI
            </h2>
          </div>
          
          <div className="space-y-3">
            {cases.length === 0 ? (
              <p className="text-plos-text-muted text-sm text-center py-4">
                Nessuna pratica
              </p>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-black/30 border border-plos-border hover:border-purple-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono text-xs text-orange-500">{c.case_number}</span>
                        <span className={`status-badge ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="font-medium">{c.case_type}</p>
                      <p className="text-sm text-plos-text-secondary mt-1">
                        Cliente: {c.client_name}
                      </p>
                    </div>
                    <ChevronRight className="text-plos-text-muted" size={20} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JusticePage;
