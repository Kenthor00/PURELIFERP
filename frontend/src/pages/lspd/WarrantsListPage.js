/**
 * LSPD - Warrants List Page
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
} from '../../components/os/OsComponents';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Plus, Search, Filter, Clock, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WarrantsListPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  
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

  const filteredWarrants = warrants.filter(w => {
    const matchesSearch = !searchQuery || 
      w.suspect_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.warrant_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && w.is_active) ||
      (statusFilter === 'executed' && w.executed);
    return matchesSearch && matchesStatus;
  });

  const activeCount = warrants.filter(w => w.is_active).length;

  return (
    <div className="space-y-6" data-testid="warrants-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <AlertTriangle className="text-orange-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              GESTIONE <span className="text-orange-400">MANDATI</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              {warrants.length} mandati totali | <span className="text-orange-400">{activeCount} attivi</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lspd/warrants/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm transition-all"
          data-testid="new-warrant-btn"
        >
          <Plus size={18} />
          NUOVO MANDATO
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per numero, sospetto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-all"
            data-testid="warrants-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none transition-all"
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="executed">Eseguiti</option>
        </select>
      </div>

      {/* Warrants List */}
      <OsPanel>
        <OsSectionHeader
          icon={AlertTriangle}
          title={`MANDATI (${filteredWarrants.length})`}
          color="orange"
        />
        
        {loading ? (
          <div className="p-4"><ListSkeleton rows={5} /></div>
        ) : filteredWarrants.length === 0 ? (
          <OsEmptyState
            icon={AlertTriangle}
            title="Nessun mandato trovato"
            description="I mandati emessi appariranno qui"
            action={() => navigate('/lspd/warrants/new')}
            actionLabel="Emetti mandato"
          />
        ) : (
          <div className="divide-y divide-plos-border/20">
            {filteredWarrants.map((warrant, index) => (
              <OsListRow key={warrant.id} index={index}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-lg ${warrant.is_active ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-green-500/20 border border-green-500/30'}`}>
                      {warrant.is_active ? <Clock className="text-orange-400" size={20} /> : <CheckCircle className="text-green-400" size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-orange-400 tracking-wider">{warrant.warrant_number}</span>
                        <OsBadge variant={warrant.is_active ? 'warning' : 'success'}>
                          {warrant.is_active ? 'ATTIVO' : 'ESEGUITO'}
                        </OsBadge>
                      </div>
                      <p className="text-sm font-medium truncate">{warrant.suspect_name}</p>
                      <p className="text-xs text-plos-text-muted truncate">{warrant.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-plos-text-muted">
                        {new Date(warrant.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ open: true, item: warrant });
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Elimina mandato"
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
