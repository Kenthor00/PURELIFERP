import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import {
  Radio,
  Phone,
  MapPin,
  Clock,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  Loader,
} from 'lucide-react';

export const DispatchPage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const { subscribe } = useSSE();
  
  const [stats, setStats] = useState({
    chiamate_in_attesa: 0,
    chiamate_attive: 0,
    chiamate_p1: 0,
    completate_oggi: 0,
  });
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCall, setShowNewCall] = useState(false);
  const [newCallForm, setNewCallForm] = useState({
    priority: 'P3',
    call_type: '',
    location: '',
    description: '',
    caller_name: '',
    caller_phone: '',
  });

  useEffect(() => {
    fetchData();
    
    const unsubCall = subscribe('call_created', () => {
      play('dispatch');
      fetchData();
    });
    
    const unsubUpdate = subscribe('call_updated', () => {
      play('notification');
      fetchData();
    });

    return () => {
      unsubCall();
      unsubUpdate();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, callsRes] = await Promise.all([
        api.get('/dispatch/stats'),
        api.get('/dispatch/calls/active'),
      ]);
      
      setStats(statsRes.data);
      setCalls(callsRes.data);
    } catch (error) {
      console.error('Errore fetch dispatch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCall = async (e) => {
    e.preventDefault();
    
    if (!newCallForm.call_type || !newCallForm.location) {
      play('error');
      return;
    }
    
    try {
      play('click');
      await api.post('/dispatch/calls', newCallForm);
      play('success');
      setShowNewCall(false);
      setNewCallForm({
        priority: 'P3',
        call_type: '',
        location: '',
        description: '',
        caller_name: '',
        caller_phone: '',
      });
      fetchData();
    } catch (error) {
      play('error');
      console.error('Errore creazione chiamata:', error);
    }
  };

  const handleCompleteCall = async (callId) => {
    try {
      play('click');
      await api.put(`/dispatch/calls/${callId}/complete`);
      play('success');
      fetchData();
    } catch (error) {
      play('error');
      console.error('Errore completamento chiamata:', error);
    }
  };

  const getPriorityStyle = (priority) => {
    if (priority === 'P1') return 'border-l-4 border-l-red-500 bg-red-500/5';
    if (priority === 'P2') return 'border-l-4 border-l-orange-500 bg-orange-500/5';
    if (priority === 'P3') return 'border-l-4 border-l-green-500 bg-green-500/5';
    return '';
  };

  const isDispatcher = user?.role === 'dispatch' || user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-plos-primary animate-pulse">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dispatch-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Radio className="text-plos-primary" />
            DISPATCH <span className="text-plos-primary">CENTER</span>
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            Centro Comando Operativo
          </p>
        </div>
        
        {isDispatcher && (
          <button
            onClick={() => {
              play('click');
              setShowNewCall(true);
            }}
            className="btn-tactical flex items-center gap-2"
            data-testid="new-call-btn"
          >
            <Plus size={18} />
            NUOVA CHIAMATA
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-tactical p-4">
          <p className="text-plos-text-secondary text-xs tracking-wider font-heading">IN ATTESA</p>
          <p className="font-heading text-3xl text-orange-500">{stats.chiamate_in_attesa}</p>
        </div>
        <div className="card-tactical p-4">
          <p className="text-plos-text-secondary text-xs tracking-wider font-heading">ATTIVE</p>
          <p className="font-heading text-3xl text-blue-500">{stats.chiamate_attive}</p>
        </div>
        <div className="card-tactical p-4">
          <p className="text-plos-text-secondary text-xs tracking-wider font-heading">PRIORITÀ 1</p>
          <p className="font-heading text-3xl text-red-500">{stats.chiamate_p1}</p>
        </div>
        <div className="card-tactical p-4">
          <p className="text-plos-text-secondary text-xs tracking-wider font-heading">COMPLETATE OGGI</p>
          <p className="font-heading text-3xl text-green-500">{stats.completate_oggi}</p>
        </div>
      </div>

      <div className="card-tactical p-4">
        <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-500" />
          CHIAMATE ATTIVE
        </h2>
        
        {calls.length === 0 ? (
          <p className="text-plos-text-muted text-sm text-center py-8">
            Nessuna chiamata attiva
          </p>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className={`p-4 border border-plos-border ${getPriorityStyle(call.priority)}`}
                data-testid={`call-${call.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`status-badge status-${call.priority.toLowerCase()}`}>
                        {call.priority}
                      </span>
                      <span className="mono text-xs text-plos-text-secondary">{call.call_number}</span>
                      <span className="text-xs uppercase">{call.status.replace('_', ' ')}</span>
                    </div>
                    
                    <h3 className="font-medium text-lg">{call.call_type}</h3>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-plos-text-secondary">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {call.location}
                      </span>
                      {call.caller_name && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {call.caller_name}
                        </span>
                      )}
                    </div>
                    
                    {call.description && (
                      <p className="text-sm text-plos-text-muted mt-2">{call.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <span className="mono text-xs text-plos-text-muted">
                      {new Date(call.created_at).toLocaleTimeString('it-IT')}
                    </span>
                    {call.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteCall(call.id)}
                        className="text-xs px-2 py-1 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black"
                      >
                        COMPLETA
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCall && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-panel corner-brackets w-full max-w-lg p-6" data-testid="new-call-modal">
            <h2 className="font-heading text-xl tracking-wider mb-4">NUOVA CHIAMATA</h2>
            
            <form onSubmit={handleCreateCall} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
                    PRIORITÀ
                  </label>
                  <select
                    value={newCallForm.priority}
                    onChange={(e) => setNewCallForm({ ...newCallForm, priority: e.target.value })}
                    className="input-tactical w-full"
                  >
                    <option value="P1">P1 - Critica</option>
                    <option value="P2">P2 - Alta</option>
                    <option value="P3">P3 - Normale</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
                    TIPO
                  </label>
                  <input
                    type="text"
                    value={newCallForm.call_type}
                    onChange={(e) => setNewCallForm({ ...newCallForm, call_type: e.target.value })}
                    className="input-tactical w-full"
                    placeholder="Es: Rapina, Incidente..."
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
                  POSIZIONE
                </label>
                <input
                  type="text"
                  value={newCallForm.location}
                  onChange={(e) => setNewCallForm({ ...newCallForm, location: e.target.value })}
                  className="input-tactical w-full"
                  placeholder="Indirizzo o zona"
                  required
                />
              </div>
              
              <div>
                <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
                  DESCRIZIONE
                </label>
                <textarea
                  value={newCallForm.description}
                  onChange={(e) => setNewCallForm({ ...newCallForm, description: e.target.value })}
                  className="input-tactical w-full min-h-[80px]"
                  placeholder="Dettagli della chiamata"
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4 border-t border-plos-border">
                <button
                  type="button"
                  onClick={() => setShowNewCall(false)}
                  className="px-4 py-2 border border-plos-border text-plos-text-secondary"
                >
                  ANNULLA
                </button>
                <button type="submit" className="btn-tactical">
                  CREA CHIAMATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchPage;
