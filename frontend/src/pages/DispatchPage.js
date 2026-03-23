/**
 * PURE LIFE OS 3.0 - Dispatch Page
 * WOW PASS Applied
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import { DeleteModal, useDelete } from '../components/DeleteModal';
import { OsStatCard, OsPanel, OsSectionHeader, OsListRow, OsBadge, OsEmptyState, OsSkeleton, OsPageHeader } from '../components/os/OsComponents';
import { toast } from 'sonner';
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
  Trash2,
  X,
  PhoneCall,
  Siren,
} from 'lucide-react';

export const DispatchPage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const { subscribe } = useSSE();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [stats, setStats] = useState({
    chiamate_in_attesa: 0,
    chiamate_attive: 0,
    chiamate_p1: 0,
    completate_oggi: 0,
  });
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCall, setShowNewCall] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [newCallForm, setNewCallForm] = useState({
    priority: 'P3',
    call_type: '',
    location: '',
    description: '',
    caller_name: '',
    caller_phone: '',
  });
  
  const canDelete = user?.sector === 'ADMIN' || (user?.sector === 'DISPATCH' && user?.hierarchy_level >= 8);

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
      toast.error('Tipo chiamata e posizione sono obbligatori');
      play('error');
      return;
    }
    
    try {
      play('click');
      await api.post('/dispatch/calls', newCallForm);
      toast.success('Chiamata creata con successo');
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
      toast.error('Errore nella creazione della chiamata');
      play('error');
    }
  };

  const handleCompleteCall = async (callId) => {
    try {
      play('click');
      await api.put(`/dispatch/calls/${callId}/complete`);
      toast.success('Chiamata completata');
      play('success');
      fetchData();
    } catch (error) {
      toast.error('Errore nel completamento');
      play('error');
    }
  };

  const isDispatcher = user?.role === 'dispatch' || user?.role === 'admin' || user?.sector === 'DISPATCH' || user?.sector === 'ADMIN';

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <OsPageHeader icon={Radio} title="DISPATCH CENTER" subtitle="Centro Comando Operativo" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-plos-surface rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-plos-bg rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-plos-bg rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <OsPanel><OsSkeleton rows={5} /></OsPanel>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dispatch-page">
      {/* Header */}
      <OsPageHeader 
        icon={Radio}
        title={<>DISPATCH <span className="text-plos-primary">CENTER</span></>}
        subtitle="Centro Comando Operativo"
        action={isDispatcher ? () => { play('click'); setShowNewCall(true); } : null}
        actionLabel="NUOVA CHIAMATA"
        actionIcon={Plus}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OsStatCard
          icon={Clock}
          label="IN ATTESA"
          value={stats.chiamate_in_attesa}
          color="orange"
        />
        <OsStatCard
          icon={PhoneCall}
          label="ATTIVE"
          value={stats.chiamate_attive}
          color="blue"
        />
        <OsStatCard
          icon={Siren}
          label="PRIORITÀ 1"
          value={stats.chiamate_p1}
          color="red"
        />
        <OsStatCard
          icon={CheckCircle}
          label="COMPLETATE OGGI"
          value={stats.completate_oggi}
          color="green"
        />
      </div>

      {/* Active Calls */}
      <OsPanel>
        <OsSectionHeader 
          icon={PhoneCall} 
          title="CHIAMATE ATTIVE" 
          color="orange"
        />
        
        <div className="divide-y divide-plos-border/20">
          {calls.length === 0 ? (
            <OsEmptyState 
              icon={Phone}
              title="Nessuna chiamata attiva"
              description="Le chiamate in arrivo appariranno qui"
              action={isDispatcher ? () => setShowNewCall(true) : null}
              actionLabel="Crea chiamata test"
            />
          ) : (
            calls.map((call, i) => (
              <OsListRow key={call.id} index={i}>
                <div className={`flex items-start justify-between gap-4 ${
                  call.priority === 'P1' ? 'border-l-4 border-l-red-500 -ml-4 pl-4' :
                  call.priority === 'P2' ? 'border-l-4 border-l-orange-500 -ml-4 pl-4' :
                  'border-l-4 border-l-lime-500 -ml-4 pl-4'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <OsBadge variant={
                        call.priority === 'P1' ? 'danger' :
                        call.priority === 'P2' ? 'warning' : 'success'
                      }>
                        {call.priority}
                      </OsBadge>
                      <span className="font-heading text-sm tracking-wider">{call.call_type}</span>
                      <span className="mono text-[10px] text-plos-text-muted">{call.call_number}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-plos-text-secondary mt-2">
                      <MapPin size={12} className="text-plos-primary" />
                      <span>{call.location}</span>
                    </div>
                    
                    {call.description && (
                      <p className="text-xs text-plos-text-muted mt-2 line-clamp-2">{call.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-plos-text-muted">
                      {call.caller_name && (
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {call.caller_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {new Date(call.created_at).toLocaleTimeString('it-IT')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {call.status !== 'completed' && isDispatcher && (
                      <button
                        onClick={() => handleCompleteCall(call.id)}
                        className="px-3 py-1.5 bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-heading tracking-wider hover:bg-lime-500/20 transition-colors rounded"
                      >
                        COMPLETA
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setDeleteModal({ open: true, item: call })}
                        className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                        title="Elimina chiamata"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </OsListRow>
            ))
          )}
        </div>
      </OsPanel>

      {/* New Call Modal */}
      {showNewCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-plos-surface to-plos-bg border border-plos-border rounded-lg w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-plos-border bg-orange-500/5">
              <h2 className="font-heading text-lg tracking-wider flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/20 rounded">
                  <Plus size={16} className="text-orange-400" />
                </div>
                NUOVA CHIAMATA
              </h2>
              <button onClick={() => setShowNewCall(false)} className="p-1 hover:bg-plos-surface rounded">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCall} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">PRIORITÀ</label>
                  <select
                    value={newCallForm.priority}
                    onChange={(e) => setNewCallForm({ ...newCallForm, priority: e.target.value })}
                    className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none"
                  >
                    <option value="P1">P1 - EMERGENZA</option>
                    <option value="P2">P2 - URGENTE</option>
                    <option value="P3">P3 - NORMALE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">TIPO *</label>
                  <input
                    type="text"
                    value={newCallForm.call_type}
                    onChange={(e) => setNewCallForm({ ...newCallForm, call_type: e.target.value })}
                    className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none"
                    placeholder="Es: Incidente, Rapina..."
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">POSIZIONE *</label>
                <input
                  type="text"
                  value={newCallForm.location}
                  onChange={(e) => setNewCallForm({ ...newCallForm, location: e.target.value })}
                  className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none"
                  placeholder="Indirizzo o coordinate"
                  required
                />
              </div>
              
              <div>
                <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">DESCRIZIONE</label>
                <textarea
                  value={newCallForm.description}
                  onChange={(e) => setNewCallForm({ ...newCallForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none resize-none"
                  placeholder="Dettagli dell'emergenza..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">CHIAMANTE</label>
                  <input
                    type="text"
                    value={newCallForm.caller_name}
                    onChange={(e) => setNewCallForm({ ...newCallForm, caller_name: e.target.value })}
                    className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none"
                    placeholder="Nome chiamante"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-plos-text-muted tracking-wider font-heading block mb-1">TELEFONO</label>
                  <input
                    type="text"
                    value={newCallForm.caller_phone}
                    onChange={(e) => setNewCallForm({ ...newCallForm, caller_phone: e.target.value })}
                    className="w-full bg-plos-bg border border-plos-border rounded px-3 py-2 text-sm focus:border-plos-primary focus:outline-none"
                    placeholder="Numero telefono"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCall(false)}
                  className="flex-1 py-2.5 border border-plos-border hover:border-plos-text-muted transition-colors font-heading text-sm"
                >
                  ANNULLA
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 transition-colors font-heading text-sm flex items-center justify-center gap-2"
                >
                  <Radio size={16} />
                  CREA CHIAMATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        resourceType="dispatch_call"
        resourceName={deleteModal.item?.call_number || ''}
        resourceId={deleteModal.item?.id}
        allowPermanent={true}
        loading={deleteLoading}
        onConfirm={async (options) => {
          const result = await deleteResource('dispatch_call', deleteModal.item.id, options);
          if (result.success) {
            toast.success('Chiamata eliminata con successo');
            setDeleteModal({ open: false, item: null });
            fetchData();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
};

export default DispatchPage;
