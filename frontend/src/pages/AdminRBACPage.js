/**
 * PURE LIFE OS - Admin RBAC Page
 * Gestione Lavori, Gradi, Permessi, Utenti
 * UI 100% in Italiano
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  OsPanel,
  OsPageHeader,
  OsSectionHeader,
  OsStatCard
} from '../components/os/OsComponents';
import {
  Users, Shield, Briefcase, Lock, Settings, Search,
  ChevronRight, ChevronDown, Plus, Edit, Trash2, Save,
  AlertTriangle, Check, X, Download, Filter, RefreshCw,
  UserPlus, UserMinus, Key, History, Building2, BadgeCheck,
  Database, Play, Eye, Loader2, CheckCircle2, XCircle, ArrowRightLeft
} from 'lucide-react';

// Traduzioni categorie
const CATEGORY_LABELS = {
  law_enforcement: 'Forze dell\'Ordine',
  medical: 'Sanitario',
  government: 'Governo',
  emergency: 'Emergenza',
  media: 'Media',
  civilian: 'Civile'
};

const CATEGORY_COLORS = {
  law_enforcement: '#3B82F6',
  medical: '#EF4444',
  government: '#10B981',
  emergency: '#6366F1',
  media: '#EC4899',
  civilian: '#9CA3AF'
};

export default function AdminRBACPage() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('lavori');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Data states
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [grades, setGrades] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [staffRoles, setStaffRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJob, setExpandedJob] = useState(null);
  const [userModal, setUserModal] = useState({ open: false, user: null });
  const [assignModal, setAssignModal] = useState({ open: false, type: null, userId: null });
  
  // Sync states
  const [syncConfig, setSyncConfig] = useState(null);
  const [syncSource, setSyncSource] = useState('auto');
  const [syncMode, setSyncMode] = useState('merge');
  const [syncDryRun, setSyncDryRun] = useState(true);
  const [syncFivemDbUrl, setSyncFivemDbUrl] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [lastSyncReport, setLastSyncReport] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, permRes, staffRes] = await Promise.all([
        api.get('/admin/rbac/stats'),
        api.get('/admin/rbac/jobs'),
        api.get('/admin/rbac/permissions'),
        api.get('/admin/rbac/staff-roles')
      ]);
      
      setStats(statsRes.data);
      setJobs(jobsRes.data);
      setPermissions(permRes.data);
      setStaffRoles(staffRes.data);
    } catch (error) {
      console.error('Error fetching RBAC data:', error);
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobGrades = async (jobId) => {
    try {
      const res = await api.get(`/admin/rbac/jobs/${jobId}/grades`);
      setGrades(res.data);
      setSelectedJob(jobId);
    } catch (error) {
      toast.error('Errore nel caricamento gradi');
    }
  };

  const fetchUsers = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.jobId) params.append('job_id', filters.jobId);
      if (filters.staffOnly) params.append('staff_only', 'true');
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await api.get(`/admin/rbac/users?${params}`);
      setUsers(res.data.users);
    } catch (error) {
      toast.error('Errore nel caricamento utenti');
    }
  };

  const fetchAuditLogs = async (filters = {}) => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filters.userId) params.append('user_id', filters.userId);
      if (filters.action) params.append('action', filters.action);
      
      const res = await api.get(`/admin/rbac/audit?${params}`);
      setAuditLogs(res.data);
    } catch (error) {
      toast.error('Errore nel caricamento audit log');
    }
  };

  // Handle assign job to user
  const handleAssignJob = async (userId, jobId, gradeId, reason) => {
    try {
      await api.post('/admin/rbac/users/assign-job', {
        user_id: userId,
        job_id: jobId,
        grade_id: gradeId,
        reason
      });
      toast.success('Lavoro assegnato con successo');
      setAssignModal({ open: false });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'assegnazione');
    }
  };

  // Handle assign staff role
  const handleAssignStaffRole = async (userId, roleId, reason, expiresAt) => {
    try {
      await api.post('/admin/rbac/staff-roles/assign', {
        user_id: userId,
        staff_role_id: roleId,
        reason,
        expires_at: expiresAt
      });
      toast.success('Ruolo staff assegnato');
      setAssignModal({ open: false });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'assegnazione');
    }
  };

  // Group jobs by category
  const jobsByCategory = useMemo(() => {
    const grouped = {};
    jobs.forEach(job => {
      const cat = job.category || 'civilian';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(job);
    });
    return grouped;
  }, [jobs]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped = {};
    permissions.forEach(perm => {
      const cat = perm.category || 'system';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(perm);
    });
    return grouped;
  }, [permissions]);

  const tabs = [
    { id: 'lavori', label: 'Lavori e Gradi', icon: Briefcase },
    { id: 'utenti', label: 'Utenti', icon: Users },
    { id: 'permessi', label: 'Matrice Permessi', icon: Lock },
    { id: 'staff', label: 'Ruoli Staff', icon: Shield },
    { id: 'sync', label: 'Sync FiveM', icon: RefreshCw },
    { id: 'audit', label: 'Registro Attività', icon: History }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-plos-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-plos-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-plos-background p-4 sm:p-6">
      <OsPageHeader 
        title="Gestione Ruoli e Permessi" 
        subtitle="Sistema RBAC - Amministrazione"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <OsStatCard
          title="Lavori Attivi"
          value={stats?.lavori_attivi || 0}
          icon={Briefcase}
          color="blue"
        />
        <OsStatCard
          title="Staff Attivi"
          value={stats?.staff_attivi || 0}
          icon={Shield}
          color="purple"
        />
        <OsStatCard
          title="Override Attivi"
          value={stats?.override_attivi || 0}
          icon={Key}
          color="yellow"
        />
        <OsStatCard
          title="Azioni 24h"
          value={stats?.azioni_24h || 0}
          icon={History}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'utenti') fetchUsers();
              if (tab.id === 'audit') fetchAuditLogs();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-plos-primary text-black font-bold'
                : 'bg-plos-surface text-plos-text-secondary hover:bg-plos-hover'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'lavori' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Jobs List */}
          <OsPanel>
            <OsSectionHeader title="Lavori per Categoria" icon={Building2} />
            <div className="space-y-4">
              {Object.entries(jobsByCategory).map(([category, categoryJobs]) => (
                <div key={category} className="border border-plos-border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-plos-hover"
                    style={{ borderLeft: `4px solid ${CATEGORY_COLORS[category] || '#666'}` }}
                    onClick={() => setExpandedJob(expandedJob === category ? null : category)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-heading font-bold">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="text-xs text-plos-text-muted bg-plos-surface px-2 py-0.5 rounded">
                        {categoryJobs.length} lavori
                      </span>
                    </div>
                    {expandedJob === category ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                  
                  {expandedJob === category && (
                    <div className="border-t border-plos-border">
                      {categoryJobs.map(job => (
                        <div
                          key={job.id}
                          className={`flex items-center justify-between p-3 hover:bg-plos-hover cursor-pointer ${
                            selectedJob === job.id ? 'bg-plos-primary/10' : ''
                          }`}
                          onClick={() => fetchJobGrades(job.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: job.color || '#666' }}
                            >
                              <Briefcase size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{job.name_short}</p>
                              <p className="text-xs text-plos-text-muted">{job.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{job.grades_count || 0} gradi</p>
                            <p className="text-xs text-plos-text-muted">{job.employee_count || 0} dipendenti</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </OsPanel>

          {/* Grades Detail */}
          <OsPanel>
            <OsSectionHeader 
              title={selectedJob ? `Gradi ${jobs.find(j => j.id === selectedJob)?.name_short || ''}` : 'Seleziona un Lavoro'} 
              icon={BadgeCheck} 
            />
            {selectedJob && grades.length > 0 ? (
              <div className="space-y-2">
                {/* Group by category */}
                {(() => {
                  const gradesByCategory = {};
                  grades.forEach(g => {
                    const cat = g.category || 'ALTRO';
                    if (!gradesByCategory[cat]) gradesByCategory[cat] = [];
                    gradesByCategory[cat].push(g);
                  });
                  
                  return Object.entries(gradesByCategory).map(([cat, catGrades]) => (
                    <div key={cat} className="mb-4">
                      <h4 className="text-xs font-bold text-plos-primary uppercase tracking-wider mb-2 px-2">
                        {cat}
                      </h4>
                      {catGrades.map(grade => (
                        <div 
                          key={grade.id}
                          className="flex items-center justify-between p-3 bg-plos-surface rounded-lg mb-1"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-plos-primary/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-plos-primary">{grade.grade_level}</span>
                            </div>
                            <div>
                              <p className="font-medium">{grade.name}</p>
                              <div className="flex gap-2 mt-1">
                                {grade.is_boss && (
                                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">BOSS</span>
                                )}
                                {grade.is_supervisor && (
                                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">SUPERVISORE</span>
                                )}
                                {grade.can_hire && (
                                  <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">ASSUNZIONI</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-plos-text-muted">{grade.employee_count || 0} persone</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-plos-text-muted">
                <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                <p>Seleziona un lavoro dalla lista per vedere i gradi</p>
              </div>
            )}
          </OsPanel>
        </div>
      )}

      {activeTab === 'utenti' && (
        <OsPanel>
          <div className="flex items-center justify-between mb-4">
            <OsSectionHeader title="Gestione Utenti" icon={Users} />
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" />
                <input
                  type="text"
                  placeholder="Cerca utente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-sm focus:border-plos-primary focus:outline-none"
                />
              </div>
              <button
                onClick={() => fetchUsers()}
                className="p-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-plos-border">
                  <th className="text-left p-3 text-xs font-bold text-plos-text-muted uppercase">Utente</th>
                  <th className="text-left p-3 text-xs font-bold text-plos-text-muted uppercase">Lavoro</th>
                  <th className="text-left p-3 text-xs font-bold text-plos-text-muted uppercase">Grado</th>
                  <th className="text-left p-3 text-xs font-bold text-plos-text-muted uppercase">Staff</th>
                  <th className="text-left p-3 text-xs font-bold text-plos-text-muted uppercase">Permessi</th>
                  <th className="text-right p-3 text-xs font-bold text-plos-text-muted uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-plos-border/50 hover:bg-plos-hover">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{user.game_name || 'N/D'}</p>
                        <p className="text-xs text-plos-text-muted">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      {user.job ? (
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: `${user.job.color}20`, color: user.job.color }}
                        >
                          {user.job.name_short}
                        </span>
                      ) : (
                        <span className="text-plos-text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {user.job_grade ? (
                        <span className="text-sm">{user.job_grade.name}</span>
                      ) : (
                        <span className="text-plos-text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {user.staff_roles?.map(role => (
                          <span 
                            key={role.id}
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{ backgroundColor: `${role.color}20`, color: role.color }}
                          >
                            {role.name}
                          </span>
                        ))}
                        {(!user.staff_roles || user.staff_roles.length === 0) && (
                          <span className="text-plos-text-muted text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{user.permissions_count || 0}</span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setAssignModal({ open: true, type: 'job', userId: user.id })}
                          className="p-1.5 hover:bg-plos-primary/20 rounded text-plos-primary"
                          title="Assegna Lavoro"
                        >
                          <Briefcase size={16} />
                        </button>
                        <button
                          onClick={() => setAssignModal({ open: true, type: 'staff', userId: user.id })}
                          className="p-1.5 hover:bg-purple-500/20 rounded text-purple-400"
                          title="Assegna Ruolo Staff"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => setAssignModal({ open: true, type: 'permission', userId: user.id })}
                          className="p-1.5 hover:bg-yellow-500/20 rounded text-yellow-400"
                          title="Override Permessi"
                        >
                          <Key size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-8 text-plos-text-muted">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nessun utente trovato. Prova a cercare o modifica i filtri.</p>
            </div>
          )}
        </OsPanel>
      )}

      {activeTab === 'permessi' && (
        <OsPanel>
          <OsSectionHeader title="Matrice Permessi per Categoria" icon={Lock} />
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category}>
                <h3 className="text-sm font-bold text-plos-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Lock size={14} />
                  {category === 'lspd' ? 'LSPD - Polizia' : 
                   category === 'ems' ? 'EMS - Sanitario' :
                   category === 'admin' ? 'Amministrazione' :
                   category === 'justice' ? 'Giustizia' :
                   category.toUpperCase()}
                </h3>
                <div className="grid gap-2">
                  {perms.map(perm => (
                    <div 
                      key={perm.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        perm.is_dangerous ? 'bg-red-500/10 border border-red-500/30' : 'bg-plos-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {perm.is_dangerous && (
                          <AlertTriangle size={16} className="text-red-400" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{perm.name}</p>
                          <p className="text-xs text-plos-text-muted font-mono">{perm.code}</p>
                        </div>
                      </div>
                      {perm.description && (
                        <p className="text-xs text-plos-text-muted max-w-xs text-right">{perm.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </OsPanel>
      )}

      {activeTab === 'staff' && (
        <OsPanel>
          <OsSectionHeader title="Ruoli Staff" icon={Shield} />
          <div className="grid md:grid-cols-3 gap-4">
            {staffRoles.map(role => (
              <div 
                key={role.id}
                className="p-4 rounded-lg border-2"
                style={{ borderColor: role.color, backgroundColor: `${role.color}10` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-lg font-bold" style={{ color: role.color }}>
                    {role.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: role.color, color: '#000' }}>
                    Livello {role.level}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {role.bypass_job_permissions ? (
                      <>
                        <Check size={14} className="text-green-400" />
                        <span>Bypass permessi job</span>
                      </>
                    ) : (
                      <>
                        <X size={14} className="text-red-400" />
                        <span>Rispetta permessi job</span>
                      </>
                    )}
                  </div>
                  <p className="text-plos-text-muted text-xs">
                    {role.level === 1 && 'Può moderare chat e utenti base'}
                    {role.level === 2 && 'Accesso completo a tutte le funzioni'}
                    {role.level === 3 && 'Controllo totale del sistema'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </OsPanel>
      )}

      {activeTab === 'audit' && (
        <OsPanel>
          <div className="flex items-center justify-between mb-4">
            <OsSectionHeader title="Registro Attività (Audit Log)" icon={History} />
            <button
              onClick={() => fetchAuditLogs()}
              className="flex items-center gap-2 px-3 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg text-sm"
            >
              <RefreshCw size={16} />
              Aggiorna
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {auditLogs.map(log => (
              <div 
                key={log.id}
                className="flex items-start gap-4 p-3 bg-plos-surface rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-plos-primary/20 flex items-center justify-center flex-shrink-0">
                  <History size={18} className="text-plos-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{log.user_email || 'Sistema'}</span>
                    <span className="text-xs text-plos-text-muted">
                      {log.game_name && `(${log.game_name})`}
                    </span>
                  </div>
                  <p className="text-sm mb-1">
                    <span className="font-mono text-xs bg-plos-hover px-1.5 py-0.5 rounded mr-2">
                      {log.action}
                    </span>
                    {log.description}
                  </p>
                  <p className="text-xs text-plos-text-muted">
                    {new Date(log.timestamp).toLocaleString('it-IT')}
                    {log.entity_type && ` • ${log.entity_type} #${log.entity_id}`}
                  </p>
                </div>
              </div>
            ))}
            
            {auditLogs.length === 0 && (
              <div className="text-center py-8 text-plos-text-muted">
                <History size={48} className="mx-auto mb-4 opacity-30" />
                <p>Nessuna attività registrata</p>
              </div>
            )}
          </div>
        </OsPanel>
      )}

      {/* Assign Modal */}
      {assignModal.open && (
        <AssignModal
          type={assignModal.type}
          userId={assignModal.userId}
          jobs={jobs}
          staffRoles={staffRoles}
          permissions={permissions}
          onClose={() => setAssignModal({ open: false })}
          onAssignJob={handleAssignJob}
          onAssignStaffRole={handleAssignStaffRole}
          api={api}
        />
      )}
    </div>
  );
}

// Componente Modal per assegnazioni
function AssignModal({ type, userId, jobs, staffRoles, permissions, onClose, onAssignJob, onAssignStaffRole, api }) {
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedJob) {
      api.get(`/admin/rbac/jobs/${selectedJob}/grades`)
        .then(res => setGrades(res.data))
        .catch(() => setGrades([]));
    }
  }, [selectedJob, api]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('La motivazione è obbligatoria');
      return;
    }
    
    setLoading(true);
    try {
      if (type === 'job' && selectedJob && selectedGrade) {
        await onAssignJob(userId, parseInt(selectedJob), parseInt(selectedGrade), reason);
      } else if (type === 'staff' && selectedRole) {
        await onAssignStaffRole(userId, parseInt(selectedRole), reason, null);
      }
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    job: 'Assegna Lavoro',
    staff: 'Assegna Ruolo Staff',
    permission: 'Override Permesso'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-surface rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-heading font-bold mb-4">{titles[type]}</h2>
        
        {type === 'job' && (
          <>
            <div className="mb-4">
              <label className="block text-sm text-plos-text-muted mb-1">Lavoro</label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full p-2 bg-plos-background border border-plos-border rounded-lg"
              >
                <option value="">Seleziona lavoro...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
            </div>
            
            {selectedJob && (
              <div className="mb-4">
                <label className="block text-sm text-plos-text-muted mb-1">Grado</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-2 bg-plos-background border border-plos-border rounded-lg"
                >
                  <option value="">Seleziona grado...</option>
                  {grades.map(grade => (
                    <option key={grade.id} value={grade.id}>
                      Lv{grade.grade_level} - {grade.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {type === 'staff' && (
          <div className="mb-4">
            <label className="block text-sm text-plos-text-muted mb-1">Ruolo Staff</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-2 bg-plos-background border border-plos-border rounded-lg"
            >
              <option value="">Seleziona ruolo...</option>
              {staffRoles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-plos-text-muted mb-1">
            Motivazione <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Inserisci la motivazione per questa assegnazione..."
            className="w-full p-2 bg-plos-background border border-plos-border rounded-lg h-24 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-plos-hover rounded-lg"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-plos-primary text-black font-bold rounded-lg disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}
