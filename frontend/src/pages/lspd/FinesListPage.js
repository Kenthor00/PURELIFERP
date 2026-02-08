/**
 * LSPD - Fines List Page
 * WOW PASS - Premium UI Design
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
  OsPageHeader,
} from '../../components/os/OsComponents';
import axios from 'axios';
import { toast } from 'sonner';
import { Receipt, Plus, Search, DollarSign, CheckCircle, Clock, Trash2, ChevronRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FinesListPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
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
              {fines.length} multe totali | <span className="text-red-400">€{totalUnpaid.toLocaleString()}</span> da riscuotere
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

      {/* Search & Filter */}
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none transition-all"
        >
          <option value="all">Tutti gli stati</option>
          <option value="unpaid">Non pagate</option>
          <option value="paid">Pagate</option>
        </select>
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
                    <div className={`p-2.5 rounded-lg ${fine.is_paid ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                      {fine.is_paid ? <CheckCircle className="text-green-400" size={20} /> : <Clock className="text-red-400" size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-red-400 tracking-wider">{fine.fine_number}</span>
                        <OsBadge variant={fine.is_paid ? 'success' : 'danger'}>
                          {fine.is_paid ? 'PAGATA' : 'NON PAGATA'}
                        </OsBadge>
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
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ open: true, item: fine });
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Elimina multa"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </OsListRow>
            ))}
          </div>
        )}
      </OsPanel>

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
