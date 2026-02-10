/**
 * LSPD - Fines List Page
 * WOW PASS - Premium UI Design
 * Senza stato pagata/non pagata, con modifica e cancellazione ownership-based
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { ListSkeleton } from '../../components/ui/Skeleton';
import {
  OsPanel,
  OsSectionHeader,
  OsListRow,
  OsBadge,
  OsEmptyState,
} from '../../components/os/OsComponents';
import axios from 'axios';
import { toast } from 'sonner';
import { Receipt, Plus, Search, DollarSign, Trash2, Edit, X, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FinesListPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, reason: '' });
  const [editModal, setEditModal] = useState({ open: false, fine: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Check permissions
  const canManage = (fine) => {
    if (user?.sector === 'ADMIN') return true;
    if (user?.hierarchy_level >= 7) return true; // Comandante+
    return fine?.issued_by === user?.id;
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/lspd/fines`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery || undefined }
      });
      setFines(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento multe');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fine) => {
    setEditForm({
      citizen_name: fine.citizen_name,
      amount: fine.amount,
      reason: fine.reason,
      modification_reason: ''
    });
    setEditModal({ open: true, fine });
  };

  const handleSaveEdit = async () => {
    if (!editForm.modification_reason) {
      toast.error('Inserisci il motivo della modifica');
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/lspd/fines/${editModal.fine.id}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            citizen_name: editForm.citizen_name,
            amount: editForm.amount,
            reason: editForm.reason,
            modification_reason: editForm.modification_reason
          }
        }
      );
      
      toast.success('Multa modificata con successo');
      setEditModal({ open: false, fine: null });
      fetchFines();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella modifica');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fine, reason) => {
    try {
      await axios.delete(
        `${API_URL}/api/lspd/fines/${fine.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { deletion_reason: reason }
        }
      );
      
      toast.success('Multa eliminata con successo');
      setDeleteModal({ open: false, item: null, reason: '' });
      setFines(prev => prev.filter(f => f.id !== fine.id));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella cancellazione');
    }
  };

  const filteredFines = fines.filter(f => {
    return !searchQuery || 
      f.citizen_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fine_number?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6" data-testid="fines-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <Receipt className="text-red-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              GESTIONE <span className="text-red-400">MULTE</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              {fines.length} multe totali | <span className="text-red-400">€{totalAmount.toLocaleString()}</span> totale
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lspd/fines/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm transition-all"
          data-testid="new-fine-btn"
        >
          <Plus size={18} />
          NUOVA MULTA
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per numero, cittadino..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-all"
            data-testid="fines-search"
          />
        </div>
      </div>

      {/* Fines List */}
      <OsPanel>
        <OsSectionHeader
          icon={Receipt}
          title={`MULTE (${filteredFines.length})`}
          color="red"
        />
        
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : filteredFines.length === 0 ? (
          <OsEmptyState
            icon={Receipt}
            title="Nessuna multa trovata"
            description="Le multe emesse appariranno qui"
            action={() => navigate('/lspd/fines/new')}
            actionLabel="Emetti multa"
          />
        ) : (
          <div className="divide-y divide-plos-border/20">
            {filteredFines.map((fine, index) => (
              <OsListRow key={fine.id} index={index}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30">
                      <DollarSign className="text-red-400" size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-red-400 tracking-wider">{fine.fine_number}</span>
                        {fine.modification_reason && (
                          <OsBadge variant="warning">MODIFICATA</OsBadge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{fine.citizen_name}</p>
                      <p className="text-xs text-plos-text-muted truncate">{fine.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-heading font-bold text-plos-primary">€{fine.amount?.toLocaleString()}</p>
                      <p className="text-[10px] text-plos-text-muted">
                        {new Date(fine.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    {canManage(fine) && (
                      <>
                        <button
                          onClick={() => handleEdit(fine)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Modifica multa"
                        >
                          <Edit size={16} className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, item: fine, reason: '' })}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Elimina multa"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </OsListRow>
            ))}
          </div>
        )}
      </OsPanel>

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">MODIFICA MULTA</h3>
              <button onClick={() => setEditModal({ open: false, fine: null })} className="p-1">
                <X size={20} className="text-plos-text-muted" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">CITTADINO</label>
                <input
                  type="text"
                  value={editForm.citizen_name}
                  onChange={(e) => setEditForm({ ...editForm, citizen_name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">IMPORTO (€)</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">MOTIVAZIONE</label>
                <textarea
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-xs text-red-400 mb-1">MOTIVO MODIFICA *</label>
                <textarea
                  value={editForm.modification_reason}
                  onChange={(e) => setEditForm({ ...editForm, modification_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-white text-sm"
                  rows={2}
                  placeholder="Obbligatorio - Spiega il motivo della modifica..."
                />
              </div>
              
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-plos-primary/20 border border-plos-primary/50 hover:bg-plos-primary/30 rounded-lg text-plos-primary font-heading text-sm transition-all"
              >
                <Save size={18} />
                {saving ? 'SALVATAGGIO...' : 'SALVA MODIFICHE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal Custom (con motivo obbligatorio) */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-red-400">ELIMINA MULTA</h3>
              <button onClick={() => setDeleteModal({ open: false, item: null, reason: '' })} className="p-1">
                <X size={20} className="text-plos-text-muted" />
              </button>
            </div>
            
            <p className="text-sm text-plos-text-secondary mb-4">
              Stai per eliminare la multa <span className="text-red-400">{deleteModal.item?.fine_number}</span><br/>
              Cittadino: {deleteModal.item?.citizen_name}<br/>
              Importo: €{deleteModal.item?.amount}
            </p>
            
            <div className="mb-4">
              <label className="block text-xs text-red-400 mb-1">MOTIVO CANCELLAZIONE *</label>
              <textarea
                value={deleteModal.reason}
                onChange={(e) => setDeleteModal({ ...deleteModal, reason: e.target.value })}
                className="w-full px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-white text-sm"
                rows={2}
                placeholder="Obbligatorio - Spiega il motivo della cancellazione..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, item: null, reason: '' })}
                className="flex-1 px-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-white"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (!deleteModal.reason) {
                    toast.error('Inserisci il motivo della cancellazione');
                    return;
                  }
                  handleDelete(deleteModal.item, deleteModal.reason);
                }}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 rounded-lg text-red-400 font-heading"
              >
                ELIMINA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinesListPage;
