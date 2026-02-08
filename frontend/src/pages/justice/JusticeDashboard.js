/**
 * PURE LIFE OS 3.0 - Justice Dashboard
 * WOW PASS - Premium UI Design
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useNavigate } from 'react-router-dom';
import { DeleteModal, useDelete } from '../../components/DeleteModal';
import { toast } from 'sonner';
import { StatsSkeleton, ListSkeleton } from '../../components/ui/Skeleton';
import {
  OsStatCard,
  OsPanel,
  OsSectionHeader,
  OsListRow,
  OsBadge,
  OsEmptyState,
  OsPageHeader,
  OsQuickAction,
} from '../../components/os/OsComponents';
import {
  Scale,
  Calendar,
  FileText,
  Users,
  Clock,
  Plus,
  ChevronRight,
  Gavel,
  Trash2,
  Briefcase,
} from 'lucide-react';

export const JusticePage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  const { deleteResource, loading: deleteLoading } = useDelete();
  
  const [stats, setStats] = useState({
    pratiche_in_attesa: 0,
    udienze_programmate: 0,
    verdetti_oggi: 0,
  });
  const [hearings, setHearings] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, type: null });
  
  const canDelete = user?.sector === 'ADMIN' || (user?.sector === 'GOV' && user?.hierarchy_level >= 8);

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

  const getStatusBadge = (status) => {
    const map = {
      scheduled: { variant: 'info', label: 'PROGRAMMATA' },
      in_progress: { variant: 'warning', label: 'IN CORSO' },
      completed: { variant: 'success', label: 'COMPLETATA' },
      draft: { variant: 'default', label: 'BOZZA' },
      submitted: { variant: 'info', label: 'INVIATA' },
      review: { variant: 'warning', label: 'IN REVISIONE' },
      approved: { variant: 'success', label: 'APPROVATA' },
      rejected: { variant: 'danger', label: 'RESPINTA' },
    };
    return map[status] || { variant: 'default', label: status?.toUpperCase() || 'N/A' };
  };

  const canCreateHearing = user?.role === 'judge' || user?.role === 'government' || user?.role === 'admin' || user?.sector === 'GOV' || user?.sector === 'ADMIN';
  const canCreateCase = user?.role === 'lawyer' || user?.role === 'prosecutor' || user?.role === 'admin' || user?.sector === 'GOV' || user?.sector === 'ADMIN';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="justice-dashboard-loading">
        <OsPageHeader
          icon={Scale}
          title="GOVERNO & GIUSTIZIA"
          subtitle="Sistema Giudiziario"
        />
        <StatsSkeleton count={3} />
        <div className="grid lg:grid-cols-2 gap-6">
          <OsPanel><ListSkeleton rows={5} /></OsPanel>
          <OsPanel><ListSkeleton rows={5} /></OsPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="justice-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Scale className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              GOVERNO & <span className="text-purple-400">GIUSTIZIA</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              Sistema Giudiziario Pure Life
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {canCreateCase && (
            <button
              onClick={() => {
                play('click');
                navigate('/justice/cases/new');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/50 hover:bg-purple-500/20 rounded-lg text-purple-400 font-heading text-sm transition-all"
              data-testid="new-case-btn"
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
              className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm transition-all"
              data-testid="new-hearing-btn"
            >
              <Calendar size={18} />
              NUOVA UDIENZA
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <OsStatCard
          icon={FileText}
          label="PRATICHE IN ATTESA"
          value={stats.pratiche_in_attesa}
          color="orange"
          onClick={() => navigate('/justice/cases')}
        />
        <OsStatCard
          icon={Calendar}
          label="UDIENZE PROGRAMMATE"
          value={stats.udienze_programmate}
          color="blue"
          onClick={() => navigate('/justice/hearings')}
        />
        <OsStatCard
          icon={Gavel}
          label="VERDETTI OGGI"
          value={stats.verdetti_oggi}
          color="green"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <OsPanel>
          <OsSectionHeader
            icon={Calendar}
            title="PROSSIME UDIENZE"
            color="blue"
            action={() => navigate('/justice/hearings')}
            actionLabel="TUTTE"
          />
          
          <div className="divide-y divide-plos-border/20">
            {hearings.length === 0 ? (
              <OsEmptyState
                icon={Calendar}
                title="Nessuna udienza programmata"
                description="Le udienze appariranno qui"
                action={canCreateHearing ? () => navigate('/justice/hearings/new') : null}
                actionLabel="Programma udienza"
              />
            ) : (
              hearings.map((hearing, index) => {
                const badge = getStatusBadge(hearing.status);
                return (
                  <OsListRow
                    key={hearing.id}
                    index={index}
                    onClick={() => navigate(`/justice/hearings/${hearing.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-purple-400 tracking-wider">
                            {hearing.hearing_number}
                          </span>
                          <OsBadge variant={badge.variant}>{badge.label}</OsBadge>
                        </div>
                        <p className="text-sm font-medium group-hover:text-plos-primary transition-colors line-clamp-1">
                          {hearing.title}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-plos-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-blue-400" />
                            {new Date(hearing.scheduled_date).toLocaleString('it-IT', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {hearing.courtroom && (
                            <span className="text-purple-400">Aula: {hearing.courtroom}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ open: true, item: hearing, type: 'court_hearing' });
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Elimina udienza"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-plos-text-muted group-hover:text-plos-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </OsListRow>
                );
              })
            )}
          </div>
        </OsPanel>

        {/* Legal Cases */}
        <OsPanel>
          <OsSectionHeader
            icon={FileText}
            title="PRATICHE LEGALI"
            color="orange"
            action={() => navigate('/justice/cases')}
            actionLabel="TUTTE"
          />
          
          <div className="divide-y divide-plos-border/20">
            {cases.length === 0 ? (
              <OsEmptyState
                icon={FileText}
                title="Nessuna pratica"
                description="Le pratiche appariranno qui"
                action={canCreateCase ? () => navigate('/justice/cases/new') : null}
                actionLabel="Nuova pratica"
              />
            ) : (
              cases.map((c, index) => {
                const badge = getStatusBadge(c.status);
                return (
                  <OsListRow
                    key={c.id}
                    index={index}
                    onClick={() => navigate(`/justice/cases/${c.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-orange-400 tracking-wider">
                            {c.case_number}
                          </span>
                          <OsBadge variant={badge.variant}>{badge.label}</OsBadge>
                        </div>
                        <p className="text-sm font-medium group-hover:text-plos-primary transition-colors">
                          {c.case_type}
                        </p>
                        <p className="text-xs text-plos-text-muted mt-1">
                          Cliente: <span className="text-plos-text-secondary">{c.client_name}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ open: true, item: c, type: 'legal_case' });
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Elimina pratica"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        )}
                        <ChevronRight size={16} className="text-plos-text-muted group-hover:text-plos-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </OsListRow>
                );
              })
            )}
          </div>
        </OsPanel>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-plos-text-muted text-[10px] tracking-[0.2em] font-heading mb-3 uppercase flex items-center gap-2">
          <div className="w-1 h-3 bg-purple-500 rounded-full"></div>
          AZIONI RAPIDE
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <OsQuickAction
            icon={FileText}
            title="Nuova Pratica"
            subtitle="Crea fascicolo"
            color="orange"
            onClick={() => { play('click'); navigate('/justice/cases/new'); }}
          />
          <OsQuickAction
            icon={Calendar}
            title="Nuova Udienza"
            subtitle="Programma sessione"
            color="blue"
            onClick={() => { play('click'); navigate('/justice/hearings/new'); }}
          />
          <OsQuickAction
            icon={Gavel}
            title="Verdetti"
            subtitle="Decisioni recenti"
            color="green"
            onClick={() => { play('click'); navigate('/justice/verdicts'); }}
          />
          <OsQuickAction
            icon={Briefcase}
            title="Archivio"
            subtitle="Casi archiviati"
            color="plos-primary"
            onClick={() => { play('click'); navigate('/justice/archive'); }}
          />
        </div>
      </div>
      
      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null, type: null })}
        resourceType={deleteModal.type}
        resourceName={deleteModal.item?.case_number || deleteModal.item?.hearing_number || ''}
        resourceId={deleteModal.item?.id}
        allowPermanent={true}
        loading={deleteLoading}
        onConfirm={async (options) => {
          const result = await deleteResource(deleteModal.type, deleteModal.item.id, options);
          if (result.success) {
            toast.success(`${deleteModal.type === 'legal_case' ? 'Pratica' : 'Udienza'} eliminata con successo`);
            setDeleteModal({ open: false, item: null, type: null });
            fetchData();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </div>
  );
};

export default JusticePage;
