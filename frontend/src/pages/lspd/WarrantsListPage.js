/**
 * LSPD - Warrants List Page
 * Gestione mandati di arresto
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { ListSkeleton } from '../../components/ui/Skeleton';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Plus, Search, Filter, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WarrantsListPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [newWarrant, setNewWarrant] = useState({
    suspect_name: '',
    suspect_identifier: '',
    reason: '',
    case_id: ''
  });
  
  // Check if user can delete
  const canDelete = user?.sector === 'ADMIN' || user?.hierarchy_level >= 8;

  useEffect(() => {
    fetchWarrants();
  }, []);

  const fetchWarrants = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/lspd/warrants`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery || undefined, status: statusFilter !== 'all' ? statusFilter : undefined }
      });
      setWarrants(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento mandati');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/lspd/warrants`, newWarrant, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Mandato emesso con successo');
      setShowNewModal(false);
      setNewWarrant({ suspect_name: '', suspect_identifier: '', reason: '', case_id: '' });
      fetchWarrants();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const filteredWarrants = warrants.filter(w => {
    const matchesSearch = !searchQuery || 
      w.suspect_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.warrant_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && w.is_active) ||
      (statusFilter === 'executed' && w.executed);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <FileText className="text-plos-primary" />
            GESTIONE MANDATI
          </h1>
          <p className="text-plos-text-secondary text-sm">{warrants.length} mandati totali</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-tactical flex items-center gap-2"
        >
          <Plus size={18} />
          NUOVO MANDATO
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per numero, sospetto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-plos-surface border border-plos-border rounded-lg"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="executed">Eseguiti</option>
        </select>
      </div>

      {/* Warrants List */}
      {loading ? (
        <div className="text-center py-8">Caricamento...</div>
      ) : filteredWarrants.length === 0 ? (
        <div className="text-center py-8 text-plos-text-muted">Nessun mandato trovato</div>
      ) : (
        <div className="space-y-3">
          {filteredWarrants.map((warrant) => (
            <div key={warrant.id} className="glass-card p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${warrant.is_active ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                  {warrant.is_active ? <Clock className="text-yellow-500" /> : <CheckCircle className="text-green-500" />}
                </div>
                <div>
                  <p className="font-medium text-plos-primary">{warrant.warrant_number}</p>
                  <p className="text-lg">{warrant.suspect_name}</p>
                  <p className="text-sm text-plos-text-secondary">{warrant.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${warrant.is_active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {warrant.is_active ? 'ATTIVO' : 'ESEGUITO'}
                </span>
                <p className="text-xs text-plos-text-muted mt-1">
                  {new Date(warrant.created_at).toLocaleDateString('it-IT')}
                </p>
                {canDelete && (
                  <button
                    onClick={() => setDeleteModal({ open: true, item: warrant })}
                    className="mt-2 p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                    title="Elimina mandato"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Warrant Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
              <FileText className="text-plos-primary" />
              NUOVO MANDATO
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">NOME SOSPETTO *</label>
                <input
                  type="text"
                  value={newWarrant.suspect_name}
                  onChange={(e) => setNewWarrant({...newWarrant, suspect_name: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">ID SOSPETTO</label>
                <input
                  type="text"
                  value={newWarrant.suspect_identifier}
                  onChange={(e) => setNewWarrant({...newWarrant, suspect_identifier: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">MOTIVO *</label>
                <textarea
                  value={newWarrant.reason}
                  onChange={(e) => setNewWarrant({...newWarrant, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2 bg-plos-surface rounded-lg">
                  Annulla
                </button>
                <button type="submit" className="flex-1 btn-tactical">
                  EMETTI MANDATO
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
        onConfirm={async (options) => {
          const result = await deleteResource('warrant', deleteModal.item?.id, options);
          if (result.success) {
            setWarrants(prev => prev.filter(w => w.id !== deleteModal.item?.id));
            setDeleteModal({ open: false, item: null });
            toast.success('Mandato eliminato');
          }
        }}
        resourceType="warrant"
        resourceName={deleteModal.item?.suspect_name}
        resourceId={deleteModal.item?.id}
        allowPermanent={true}
        loading={deleteLoading}
      />
    </div>
  );
};

export default WarrantsListPage;
