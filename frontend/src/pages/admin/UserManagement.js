/**
 * PURE LIFE OS 3.0 - User Management Page (Admin)
 * WOW PASS - Premium UI Design
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  OsPanel,
  OsSectionHeader,
  OsStatCard,
  OsListRow,
  OsBadge,
  OsEmptyState,
} from '../../components/os/OsComponents';
import { ListSkeleton } from '../../components/ui/Skeleton';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Search, Filter, MoreVertical, 
  Lock, Unlock, Key, History, Activity, Edit, XCircle, CheckCircle,
  Trash2, AlertTriangle, Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Gradi predefiniti per ogni settore - ALLINEATI AL BACKEND
const SECTOR_GRADES = {
  LSPD: {
    1: "Agente",
    2: "Agente Senior",
    3: "Sergente",
    4: "Sottotenente",
    5: "Tenente",
    6: "Capitano",
    7: "Vice Comandante",
    8: "Comandante",
    9: "Vice Capo della Polizia",
    10: "Capo della Polizia"
  },
  EMS: {
    1: "Tirocinante",
    2: "Paramedico",
    3: "Paramedico Senior",
    4: "Primario",
    5: "Dirigente Sanitario",
    6: "Direttore Sanitario"
  },
  GOV: {
    1: "Impiegato",
    2: "Funzionario",
    3: "Funzionario Senior",
    4: "Responsabile Ufficio",
    5: "Direttore",
    6: "Vice Sindaco",
    7: "Sindaco"
  },
  NEWS: {
    1: "Giornalista",
    2: "Giornalista Senior",
    3: "Caporedattore",
    4: "Direttore del Giornale"
  },
  DISPATCH: {
    1: "Operatore",
    2: "Operatore Senior",
    3: "Supervisore",
    4: "Coordinatore",
    5: "Capo Centrale"
  },
  CIVIL: {
    1: "Cittadino"
  },
  ADMIN: {
    9: "Admin Staff",
    10: "Super Admin"
  }
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showAccessHistoryModal, setShowAccessHistoryModal] = useState(false);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [accessHistory, setAccessHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [deleting, setDeleting] = useState(false);
  
  // Form state per creazione/modifica
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    game_name: '',
    sector: 'LSPD',
    grade: '',
    hierarchy_level: 1,
    is_sector_chief: false,
    badge_number: '',
    department: ''
  });
  
  const [newPassword, setNewPassword] = useState('');

  const sectors = ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH', 'CIVIL', 'ADMIN'];

  // Auto-completa il grado quando cambiano settore o livello
  useEffect(() => {
    const grades = SECTOR_GRADES[formData.sector];
    if (grades && grades[formData.hierarchy_level]) {
      setFormData(prev => ({
        ...prev,
        grade: grades[formData.hierarchy_level]
      }));
    }
  }, [formData.sector, formData.hierarchy_level]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/users/all/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      // Fallback per capi settore
      try {
        const token = localStorage.getItem('plos_token');
        const response = await axios.get(`${API_URL}/api/users/my-sector`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data);
      } catch (e) {
        toast.error('Errore nel caricamento utenti');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validazione password lato client
    if (formData.password.length < 8) {
      toast.error('Password troppo corta: minimo 8 caratteri');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      toast.error('Password non valida: deve contenere almeno un numero');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      toast.error('Password non valida: deve contenere almeno un carattere speciale');
      return;
    }
    
    // Validazione badge_number
    if (formData.badge_number && !/^\d+$/.test(formData.badge_number)) {
      toast.error('Matricola non valida: deve contenere solo numeri');
      return;
    }
    
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(`${API_URL}/api/users/create`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utente creato con successo');
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      
      // Messaggi specifici in base al codice di errore
      if (status === 409) {
        if (detail?.includes('Email')) {
          toast.error('❌ Email già registrata nel sistema');
        } else if (detail?.includes('Matricola') || detail?.includes('badge')) {
          toast.error('❌ Matricola già in uso da un altro utente');
        } else {
          toast.error(`❌ Conflitto: ${detail}`);
        }
      } else if (status === 422) {
        toast.error(`⚠️ ${detail || 'Dati non validi'}`);
      } else if (status === 403) {
        toast.error(`🔒 ${detail || 'Non hai i permessi'}`);
      } else {
        toast.error(detail || 'Errore nella creazione utente');
      }
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('plos_token');
      await axios.put(`${API_URL}/api/users/${selectedUser.id}`, {
        game_name: formData.game_name,
        grade: formData.grade,
        hierarchy_level: formData.hierarchy_level,
        is_sector_chief: formData.is_sector_chief,
        badge_number: formData.badge_number,
        department: formData.department,
        is_active: formData.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utente modificato con successo');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella modifica');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(`${API_URL}/api/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password resettata con successo');
      setShowResetPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel reset password');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('plos_token');
      await axios.put(`${API_URL}/api/users/${userId}`, {
        is_active: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Utente ${currentStatus ? 'disattivato' : 'riattivato'}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella modifica');
    }
  };

  const unlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(`${API_URL}/api/users/${userId}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Account sbloccato');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nello sblocco');
    }
  };

  const openAccessHistory = async (u) => {
    setSelectedUser(u);
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/users/${u.id}/access-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessHistory(response.data);
      setShowAccessHistoryModal(true);
    } catch (error) {
      toast.error('Errore nel caricamento storico accessi');
    }
  };

  const openActivityLog = async (u) => {
    setSelectedUser(u);
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/users/${u.id}/activity-log`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivityLog(response.data);
      setShowActivityLogModal(true);
    } catch (error) {
      toast.error('Errore nel caricamento log azioni');
    }
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setFormData({
      ...formData,
      game_name: u.game_name || '',
      sector: u.sector,
      grade: u.grade,
      hierarchy_level: u.hierarchy_level,
      is_sector_chief: u.is_sector_chief || false,
      badge_number: u.badge_number || '',
      department: u.department || '',
      is_active: u.is_active
    });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const openDeleteModal = (u) => {
    setSelectedUser(u);
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const handleHardDelete = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Scrivi "DELETE" per confermare l\'eliminazione');
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('plos_token');
      await axios.delete(`${API_URL}/api/users/${selectedUser.id}/hard-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { confirmation: 'DELETE' }
      });
      toast.success(`Utente ${selectedUser.game_name || selectedUser.email} eliminato definitivamente`);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      fetchUsers();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      game_name: '',
      sector: 'LSPD',
      grade: '',
      hierarchy_level: 1,
      is_sector_chief: false,
      badge_number: '',
      department: ''
    });
  };

  const getSectorColor = (sector) => {
    const colors = {
      LSPD: 'bg-blue-500',
      EMS: 'bg-red-500',
      GOV: 'bg-yellow-500',
      NEWS: 'bg-green-500',
      DISPATCH: 'bg-orange-500',
      CIVIL: 'bg-gray-500',
      ADMIN: 'bg-purple-500'
    };
    return colors[sector] || 'bg-gray-500';
  };

  // Filtra utenti
  const filteredUsers = users.filter(u => {
    const matchesSector = selectedSector === 'all' || u.sector === selectedSector;
    const matchesSearch = !searchQuery || 
      u.game_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  // Aggiorna grado quando cambia il livello o settore nel form
  const handleLevelChange = (level) => {
    const grades = SECTOR_GRADES[formData.sector] || {};
    const grade = grades[level] || '';
    setFormData({ ...formData, hierarchy_level: level, grade });
  };

  const handleSectorChange = (sector) => {
    const grades = SECTOR_GRADES[sector] || {};
    const firstLevel = Object.keys(grades)[0] || 1;
    const grade = grades[firstLevel] || '';
    setFormData({ ...formData, sector, hierarchy_level: parseInt(firstLevel), grade });
  };

  return (
    <div className="space-y-6" data-testid="user-management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Users className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              GESTIONE <span className="text-purple-400">UTENTI</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              {users.length} utenti totali | {users.filter(u => u.is_active).length} attivi
            </p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm transition-all"
          data-testid="create-user-btn"
        >
          <UserPlus size={18} />
          NUOVO UTENTE
        </button>
      </div>

      {/* Stats per settore */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {sectors.map(sector => {
          const count = users.filter(u => u.sector === sector).length;
          const colors = {
            LSPD: 'blue', EMS: 'red', GOV: 'orange', NEWS: 'green',
            DISPATCH: 'orange', CIVIL: 'default', ADMIN: 'purple'
          };
          return (
            <OsStatCard
              key={sector}
              icon={Shield}
              label={sector}
              value={count}
              color={colors[sector] || 'default'}
              onClick={() => setSelectedSector(sector)}
              className={selectedSector === sector ? 'ring-2 ring-plos-primary' : ''}
            />
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-all"
            data-testid="user-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedSector === 'all'
                ? 'bg-plos-primary/20 border border-plos-primary/50 text-plos-primary'
                : 'bg-plos-surface border border-plos-border text-plos-text-secondary hover:text-white'
            }`}
          >
            Tutti
          </button>
        </div>
      </div>

      {/* Users Table */}
      <OsPanel>
        <OsSectionHeader
          icon={Users}
          title={`UTENTI (${filteredUsers.length})`}
          color="purple"
        />
        
        {loading ? (
          <div className="p-4"><ListSkeleton rows={8} /></div>
        ) : filteredUsers.length === 0 ? (
          <OsEmptyState
            icon={Users}
            title="Nessun utente trovato"
            description="Prova a modificare i filtri di ricerca"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-plos-surface/30 border-b border-plos-border/30">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">UTENTE</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">SETTORE</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">GRADO</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">LVL</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">STATO</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">ULTIMO ACCESSO</th>
                  <th className="px-4 py-3 text-left text-[10px] font-heading text-plos-text-muted tracking-wider">AZIONI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plos-border/20">
                {filteredUsers.map((u, index) => (
                  <tr 
                    key={u.id} 
                    className="hover:bg-plos-surface/20 transition-colors group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-plos-primary/20 border border-plos-primary/30 flex items-center justify-center text-xs font-bold text-plos-primary">
                          {u.game_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{u.game_name || 'N/A'}</p>
                          <p className="text-plos-text-muted text-[10px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <OsBadge variant={
                        u.sector === 'LSPD' ? 'info' :
                        u.sector === 'EMS' ? 'danger' :
                        u.sector === 'ADMIN' ? 'purple' :
                        u.sector === 'GOV' ? 'warning' : 'default'
                      }>
                        {u.sector}
                      </OsBadge>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{u.grade || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-plos-surface border border-plos-border rounded text-xs text-white font-mono">
                        {u.hierarchy_level}
                      </span>
                      {u.is_sector_chief && (
                        <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded">
                          CAPO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle size={12} />
                            Attivo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-xs">
                            <XCircle size={12} />
                            Inattivo
                          </span>
                        )}
                        {u.is_locked && (
                          <Lock size={12} className="text-red-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-plos-text-muted text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleString('it-IT', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : 'Mai'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg hover:bg-plos-surface transition-colors text-plos-text-muted hover:text-white"
                          title="Modifica"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(u)}
                          className="p-1.5 rounded-lg hover:bg-plos-surface transition-colors text-plos-text-muted hover:text-white"
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => openAccessHistory(u)}
                          className="p-1.5 rounded-lg hover:bg-plos-surface transition-colors text-plos-text-muted hover:text-white"
                          title="Storico Accessi"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => openActivityLog(u)}
                          className="p-1.5 rounded-lg hover:bg-plos-surface transition-colors text-plos-text-muted hover:text-white"
                          title="Log Azioni"
                        >
                          <Activity size={14} />
                        </button>
                        {u.is_locked && (
                          <button
                            onClick={() => unlockUser(u.id)}
                            className="p-1.5 rounded-lg hover:bg-orange-500/20 transition-colors text-orange-400"
                            title="Sblocca Account"
                          >
                            <Unlock size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.is_active
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-green-500/20 text-green-400'
                          }`}
                          title={u.is_active ? 'Disattiva' : 'Riattiva'}
                        >
                          {u.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </button>
                        {user?.hierarchy_level >= 10 && u.id !== user?.id && (
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-1.5 rounded-lg hover:bg-red-600/30 transition-colors text-red-500"
                            title="Elimina Definitivamente"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OsPanel>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="text-plos-primary" />
              Crea Nuovo Utente
            </h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                    placeholder="Min 8 caratteri, maiuscola, minuscola, numero, speciale"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Nome In Game *</label>
                  <input
                    type="text"
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Settore *</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  >
                    {sectors.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Livello Gerarchico *</label>
                  <select
                    value={formData.hierarchy_level}
                    onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  >
                    {Object.keys(SECTOR_GRADES[formData.sector] || {}).map(level => (
                      <option key={level} value={level}>
                        {level} - {SECTOR_GRADES[formData.sector][level]}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Grado</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                    placeholder="Compilato automaticamente o personalizzato"
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Badge/Matricola</label>
                  <input
                    type="text"
                    value={formData.badge_number}
                    onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Dipartimento</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_sector_chief}
                      onChange={(e) => setFormData({ ...formData, is_sector_chief: e.target.checked })}
                      className="w-4 h-4 rounded border-plos-border bg-plos-surface text-plos-primary focus:ring-plos-primary"
                    />
                    <span className="text-white text-sm">Capo Settore</span>
                  </label>
                  <p className="text-plos-text-secondary text-xs mt-1">
                    I capi settore possono gestire gli utenti del proprio reparto
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-plos-primary to-plos-accent text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Crea Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Edit className="text-plos-primary" />
              Modifica Utente: {selectedUser.game_name || selectedUser.email}
            </h2>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Nome In Game</label>
                  <input
                    type="text"
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Livello Gerarchico</label>
                  <select
                    value={formData.hierarchy_level}
                    onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  >
                    {Object.keys(SECTOR_GRADES[selectedUser.sector] || {}).map(level => (
                      <option key={level} value={level}>
                        {level} - {SECTOR_GRADES[selectedUser.sector][level]}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Grado</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Badge/Matricola</label>
                  <input
                    type="text"
                    value={formData.badge_number}
                    onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-plos-text-secondary text-sm mb-1">Dipartimento</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
                </div>
                
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_sector_chief}
                      onChange={(e) => setFormData({ ...formData, is_sector_chief: e.target.checked })}
                      className="w-4 h-4 rounded border-plos-border bg-plos-surface text-plos-primary focus:ring-plos-primary"
                    />
                    <span className="text-white text-sm">Capo Settore</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-plos-border bg-plos-surface text-plos-primary focus:ring-plos-primary"
                    />
                    <span className="text-white text-sm">Account Attivo</span>
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-plos-primary to-plos-accent text-black font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="text-plos-primary" />
              Reset Password
            </h2>
            <p className="text-plos-text-secondary mb-4">
              Stai resettando la password per: <strong className="text-white">{selectedUser.game_name || selectedUser.email}</strong>
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-plos-text-secondary text-sm mb-1">Nuova Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  placeholder="Min 8 caratteri, maiuscola, minuscola, numero, speciale"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access History Modal */}
      {showAccessHistoryModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <History className="text-plos-primary" />
              Storico Accessi: {selectedUser.game_name || selectedUser.email}
            </h2>
            
            <div className="overflow-y-auto flex-1">
              {accessHistory.length === 0 ? (
                <p className="text-plos-text-secondary text-center py-8">Nessun accesso registrato</p>
              ) : (
                <div className="space-y-2">
                  {accessHistory.map((log, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-plos-surface/50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        log.action === 'login_success' ? 'bg-green-400' :
                        log.action === 'login_failed' ? 'bg-red-400' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-white text-sm">{log.description || log.action}</p>
                        <p className="text-plos-text-secondary text-xs">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-plos-text-secondary text-xs font-mono">{log.ip_address || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowAccessHistoryModal(false)}
              className="mt-4 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {showActivityLogModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="text-plos-primary" />
              Log Azioni: {selectedUser.game_name || selectedUser.email}
            </h2>
            
            <div className="overflow-y-auto flex-1">
              {activityLog.length === 0 ? (
                <p className="text-plos-text-secondary text-center py-8">Nessuna azione registrata</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-plos-surface/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Data/Ora</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Azione</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Entità</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Descrizione</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-plos-border">
                    {activityLog.map((log, i) => (
                      <tr key={i} className="hover:bg-plos-surface/30">
                        <td className="px-3 py-2 text-white text-xs">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : 'N/A'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono text-plos-accent">{log.action}</span>
                        </td>
                        <td className="px-3 py-2 text-plos-text-secondary text-xs">
                          {log.entity_type ? `${log.entity_type}#${log.entity_id}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-plos-text-secondary text-xs max-w-xs truncate">
                          {log.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-plos-text-secondary text-xs font-mono">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <button
              onClick={() => setShowActivityLogModal(false)}
              className="mt-4 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md border-2 border-red-500/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-heading font-semibold text-red-400">
                  ELIMINAZIONE DEFINITIVA
                </h2>
                <p className="text-plos-text-secondary text-sm">
                  Questa azione è irreversibile
                </p>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-white text-sm mb-2">
                Stai per eliminare definitivamente:
              </p>
              <div className="space-y-1">
                <p className="text-red-400 font-semibold">
                  {selectedUser.game_name || 'N/A'}
                </p>
                <p className="text-plos-text-secondary text-xs">
                  {selectedUser.email}
                </p>
                <p className="text-plos-text-secondary text-xs">
                  {selectedUser.sector} - {selectedUser.grade}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-plos-text-secondary text-sm mb-2">
                Scrivi <span className="text-red-400 font-bold">DELETE</span> per confermare:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 bg-plos-surface border border-red-500/50 rounded-lg text-white focus:border-red-500 focus:outline-none font-mono"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
                disabled={deleting}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={deleteConfirmation !== 'DELETE' || deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Elimina Definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
