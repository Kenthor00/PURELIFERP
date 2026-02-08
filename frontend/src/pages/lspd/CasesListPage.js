import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useNavigate } from 'react-router-dom';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { ListSkeleton } from '../../components/ui/Skeleton';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Clock,
  Trash2,
} from 'lucide-react';

export const CasesListPage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  
  // Check if user can delete
  const canDelete = user?.sector === 'ADMIN' || user?.level >= 8;

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      
      const res = await api.get(`/lspd/cases?${params.toString()}`);
      setCases(res.data);
    } catch (error) {
      console.error('Errore fetch casi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCases();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'status-p2';
      case 'investigating': return 'status-p1';
      case 'closed': return 'status-p3';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return 'Aperto';
      case 'investigating': return 'In Corso';
      case 'closed': return 'Chiuso';
      case 'archived': return 'Archiviato';
      default: return status;
    }
  };

  return (
    <div className="space-y-6" data-testid="cases-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <FileText className="text-blue-500" />
            GESTIONE CASI
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            {cases.length} casi totali
          </p>
        </div>
        
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/cases/new');
          }}
          className="btn-tactical flex items-center gap-2"
          data-testid="new-case-btn"
        >
          <Plus size={18} />
          NUOVO CASO
        </button>
      </div>

      {/* Filters */}
      <div className="card-tactical p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per numero, titolo, sospetto..."
              className="input-tactical w-full pl-10"
              data-testid="search-input"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-tactical"
              data-testid="status-filter"
            >
              <option value="">Tutti gli stati</option>
              <option value="open">Aperti</option>
              <option value="investigating">In Corso</option>
              <option value="closed">Chiusi</option>
              <option value="archived">Archiviati</option>
            </select>
            
            <button type="submit" className="btn-tactical">
              <Filter size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {loading ? (
          <ListSkeleton rows={5} />
        ) : cases.length === 0 ? (
          <div className="card-tactical p-8 text-center">
            <FileText className="mx-auto mb-4 text-plos-text-muted" size={48} />
            <p className="text-plos-text-secondary">Nessun caso trovato</p>
            <button
              onClick={() => navigate('/lspd/cases/new')}
              className="btn-tactical mt-4"
            >
              Crea il primo caso
            </button>
          </div>
        ) : (
          cases.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                play('click');
                navigate(`/lspd/cases/${c.id}`);
              }}
              className="card-tactical p-4 cursor-pointer group"
              data-testid={`case-item-${c.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="mono text-xs text-plos-primary">{c.case_number}</span>
                    <span className={`status-badge ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                    {c.priority !== 'normale' && (
                      <span className="status-badge status-p1">{c.priority}</span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-lg truncate">{c.title}</h3>
                  
                  {c.description && (
                    <p className="text-plos-text-secondary text-sm mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-plos-text-muted">
                    {c.suspect_name && (
                      <span>Sospetto: <span className="text-plos-text-secondary">{c.suspect_name}</span></span>
                    )}
                    {c.location && (
                      <span>Luogo: <span className="text-plos-text-secondary">{c.location}</span></span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        play('click');
                        setDeleteModal({ open: true, item: c });
                      }}
                      className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Elimina caso"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <ChevronRight className="text-plos-text-muted group-hover:text-plos-primary transition-colors" size={24} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={async (options) => {
          const result = await deleteResource('case', deleteModal.item?.id, options);
          if (result.success) {
            setCases(prev => prev.filter(c => c.id !== deleteModal.item?.id));
            setDeleteModal({ open: false, item: null });
            play('success');
          }
        }}
        resourceType="case"
        resourceName={deleteModal.item?.title}
        resourceId={deleteModal.item?.id}
        allowPermanent={true}
        loading={deleteLoading}
      />
    </div>
  );
};

export default CasesListPage;
