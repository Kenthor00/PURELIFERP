/**
 * LSPD - Fines List Page
 * Gestione multe
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { ListSkeleton } from '../../components/ui/Skeleton';
import axios from 'axios';
import { toast } from 'sonner';
import { Receipt, Plus, Search, DollarSign, CheckCircle, Clock, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FinesListPage = () => {
  const { token, user } = useAuth();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [newFine, setNewFine] = useState({
    citizen_name: '',
    citizen_identifier: '',
    reason: '',
    amount: ''
  });
  
  // Check if user can delete
  const canDelete = user?.sector === 'ADMIN' || user?.hierarchy_level >= 8;

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/lspd/fines`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery || undefined, status: statusFilter !== 'all' ? statusFilter : undefined }
      });
      setFines(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento multe');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/lspd/fines`, {
        ...newFine,
        amount: parseFloat(newFine.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Multa emessa con successo');
      setShowNewModal(false);
      setNewFine({ citizen_name: '', citizen_identifier: '', reason: '', amount: '' });
      fetchFines();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const filteredFines = fines.filter(f => {
    const matchesSearch = !searchQuery || 
      f.citizen_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fine_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'unpaid' && !f.is_paid) ||
      (statusFilter === 'paid' && f.is_paid);
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = fines.filter(f => !f.is_paid).reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Receipt className="text-plos-primary" />
            GESTIONE MULTE
          </h1>
          <p className="text-plos-text-secondary text-sm">
            {fines.length} multe totali | €{totalUnpaid.toLocaleString()} da riscuotere
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-tactical flex items-center gap-2"
        >
          <Plus size={18} />
          NUOVA MULTA
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per numero, cittadino..."
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
          <option value="unpaid">Non pagate</option>
          <option value="paid">Pagate</option>
        </select>
      </div>

      {/* Fines List */}
      {loading ? (
        <div className="text-center py-8">Caricamento...</div>
      ) : filteredFines.length === 0 ? (
        <div className="text-center py-8 text-plos-text-muted">Nessuna multa trovata</div>
      ) : (
        <div className="space-y-3">
          {filteredFines.map((fine) => (
            <div key={fine.id} className="glass-card p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${fine.is_paid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {fine.is_paid ? <CheckCircle className="text-green-500" /> : <Clock className="text-red-500" />}
                </div>
                <div>
                  <p className="font-medium text-plos-primary">{fine.fine_number}</p>
                  <p className="text-lg">{fine.citizen_name}</p>
                  <p className="text-sm text-plos-text-secondary">{fine.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-plos-primary">€{fine.amount?.toLocaleString()}</p>
                <span className={`px-2 py-1 rounded text-xs ${fine.is_paid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {fine.is_paid ? 'PAGATA' : 'NON PAGATA'}
                </span>
                <p className="text-xs text-plos-text-muted mt-1">
                  {new Date(fine.created_at).toLocaleDateString('it-IT')}
                </p>
                {canDelete && (
                  <button
                    onClick={() => setDeleteModal({ open: true, item: fine })}
                    className="mt-2 p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                    title="Elimina multa"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Fine Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
              <Receipt className="text-plos-primary" />
              NUOVA MULTA
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">NOME CITTADINO *</label>
                <input
                  type="text"
                  value={newFine.citizen_name}
                  onChange={(e) => setNewFine({...newFine, citizen_name: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">ID CITTADINO</label>
                <input
                  type="text"
                  value={newFine.citizen_identifier}
                  onChange={(e) => setNewFine({...newFine, citizen_identifier: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">MOTIVO *</label>
                <textarea
                  value={newFine.reason}
                  onChange={(e) => setNewFine({...newFine, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">IMPORTO (€) *</label>
                <input
                  type="number"
                  value={newFine.amount}
                  onChange={(e) => setNewFine({...newFine, amount: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  min="1"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2 bg-plos-surface rounded-lg">
                  Annulla
                </button>
                <button type="submit" className="flex-1 btn-tactical">
                  EMETTI MULTA
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
          const result = await deleteResource('fine', deleteModal.item?.id, options);
          if (result.success) {
            setFines(prev => prev.filter(f => f.id !== deleteModal.item?.id));
            setDeleteModal({ open: false, item: null });
            toast.success('Multa eliminata');
          }
        }}
        resourceType="fine"
        resourceName={`${deleteModal.item?.citizen_name} - €${deleteModal.item?.amount}`}
        resourceId={deleteModal.item?.id}
        allowPermanent={true}
        loading={deleteLoading}
      />
    </div>
  );
};

export default FinesListPage;
