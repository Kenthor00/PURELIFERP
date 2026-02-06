/**
 * PURE LIFE OS - Sector Management Page (Per Capi Settore)
 * Pannello di gestione del proprio reparto
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Search, Key, History, Activity, Edit, 
  XCircle, CheckCircle, Unlock, Shield, FileText
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Gradi predefiniti per ogni settore
const SECTOR_GRADES = {
  LSPD: {
    1: "Cadetto",
    2: "Agente",
    3: "Agente Scelto",
    4: "Assistente Capo",
    5: "Vice Ispettore",
    6: "Ispettore",
    7: "Vice Commissario",
    8: "Commissario",
    9: "Vice Questore",
    10: "Questore"
  },
  EMS: {
    1: "Tirocinante",
    2: "Paramedico",
    3: "Paramedico Senior",
    4: "Infermiere",
    5: "Infermiere Capo",
    6: "Medico",
    7: "Medico Specialista",
    8: "Primario",
    9: "Vice Direttore",
    10: "Direttore Sanitario"
  },
  GOV: {
    1: "Impiegato",
    2: "Funzionario",
    3: "Funzionario Senior",
    4: "Avvocato Junior",
    5: "Avvocato",
    6: "Procuratore",
    7: "Giudice",
    8: "Assessore",
    9: "Vice Sindaco",
    10: "Sindaco"
  },
  NEWS: {
    1: "Stagista",
    2: "Reporter",
    3: "Giornalista",
    4: "Inviato",
    5: "Caporedattore",
    6: "Vice Direttore",
    7: "Direttore"
  },
  DISPATCH: {
    1: "Operatore Base",
    2: "Operatore",
    3: "Operatore Senior",
    4: "Supervisore",
    5: "Capo Sala",
    6: "Vice Direttore",
    7: "Direttore Operativo"
  }
};

const SectorManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showAccessHistoryModal, setShowAccessHistoryModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [accessHistory, setAccessHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    game_name: '',
    grade: '',
    hierarchy_level: 1,
    badge_number: '',
    department: ''
  });
  
  const [newPassword, setNewPassword] = useState('');

  // Verifica se l'utente è capo settore
  const isSectorChief = user?.is_sector_chief || user?.sector === 'ADMIN';
  const userSector = user?.sector;

  useEffect(() => {
    if (isSectorChief) {
      fetchUsers();
      fetchAuditLogs();
    }
  }, [isSectorChief]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/users/my-sector`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/audit/my-sector?hours=168&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAuditLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(`${API_URL}/api/users/create`, {
        ...formData,
        sector: userSector  // Forza il settore corrente
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utente creato con successo');
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
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
        badge_number: formData.badge_number,
        department: formData.department
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

  const openEditModal = (u) => {
    setSelectedUser(u);
    setFormData({
      ...formData,
      game_name: u.game_name || '',
      grade: u.grade,
      hierarchy_level: u.hierarchy_level,
      badge_number: u.badge_number || '',
      department: u.department || ''
    });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (u) => {
    setSelectedUser(u);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      game_name: '',
      grade: '',
      hierarchy_level: 1,
      badge_number: '',
      department: ''
    });
  };

  const handleLevelChange = (level) => {
    const grades = SECTOR_GRADES[userSector] || {};
    const grade = grades[level] || '';
    setFormData({ ...formData, hierarchy_level: level, grade });
  };

  // Filtra utenti
  const filteredUsers = users.filter(u => {
    return !searchQuery || 
      u.game_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Se non è capo settore, mostra messaggio di errore
  if (!isSectorChief) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
        <div className="glass-card rounded-xl p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-white mb-2">
            ACCESSO NEGATO
          </h2>
          <p className="text-plos-text-secondary">
            Solo i capi settore possono accedere a questa pagina.
          </p>
        </div>
      </div>
    );
  }

  const sectorName = {
    LSPD: 'Los Santos Police Department',
    EMS: 'Emergency Medical Services',
    GOV: 'Governo',
    NEWS: 'Weazel News',
    DISPATCH: 'Dispatch Center'
  }[userSector] || userSector;

  return (
    <div className="space-y-6 p-6" data-testid="sector-management">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider flex items-center gap-3">
            <Users className="w-8 h-8 text-plos-primary" />
            GESTIONE REPARTO
          </h1>
          <p className="text-plos-text-secondary mt-1">
            {sectorName} - {users.length} membri
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAuditModal(true)}
            className="px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            Audit Reparto
          </button>
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-plos-primary to-plos-accent text-black font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus size={18} />
            Nuovo Agente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-secondary focus:border-plos-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-plos-surface/50 border-b border-plos-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Agente</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Grado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Livello</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Matricola</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Stato</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Ultimo Accesso</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plos-border">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-plos-text-secondary">
                    Caricamento...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-plos-text-secondary">
                    Nessun agente trovato
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-plos-surface/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{u.game_name || 'N/A'}</p>
                        <p className="text-plos-text-secondary text-xs">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">{u.grade}</td>
                    <td className="px-4 py-3 text-white text-sm">{u.hierarchy_level}</td>
                    <td className="px-4 py-3 text-plos-text-secondary text-sm">{u.badge_number || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle size={14} />
                            Attivo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-xs">
                            <XCircle size={14} />
                            Inattivo
                          </span>
                        )}
                        {u.is_locked && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            Bloccato
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-plos-text-secondary text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleString('it-IT', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      }) : 'Mai'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Solo se livello inferiore */}
                        {u.hierarchy_level < user?.hierarchy_level && (
                          <>
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded hover:bg-plos-surface transition-colors text-plos-text-secondary hover:text-white"
                              title="Modifica Grado"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openResetPasswordModal(u)}
                              className="p-1.5 rounded hover:bg-plos-surface transition-colors text-plos-text-secondary hover:text-white"
                              title="Reset Password"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(u.id, u.is_active)}
                              className={`p-1.5 rounded transition-colors ${
                                u.is_active
                                  ? 'hover:bg-red-500/20 text-red-400'
                                  : 'hover:bg-green-500/20 text-green-400'
                              }`}
                              title={u.is_active ? 'Disattiva' : 'Riattiva'}
                            >
                              {u.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                            {u.is_locked && (
                              <button
                                onClick={() => unlockUser(u.id)}
                                className="p-1.5 rounded hover:bg-orange-500/20 transition-colors text-orange-400"
                                title="Sblocca Account"
                              >
                                <Unlock size={16} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => openAccessHistory(u)}
                          className="p-1.5 rounded hover:bg-plos-surface transition-colors text-plos-text-secondary hover:text-white"
                          title="Storico Accessi"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="text-plos-primary" />
              Crea Nuovo Agente - {userSector}
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
                  <label className="block text-plos-text-secondary text-sm mb-1">Livello *</label>
                  <select
                    value={formData.hierarchy_level}
                    onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  >
                    {Object.keys(SECTOR_GRADES[userSector] || {})
                      .filter(level => parseInt(level) < user?.hierarchy_level)
                      .map(level => (
                        <option key={level} value={level}>
                          {level} - {SECTOR_GRADES[userSector][level]}
                        </option>
                      ))}
                  </select>
                  <p className="text-plos-text-secondary text-xs mt-1">
                    Puoi creare solo livelli inferiori al tuo ({user?.hierarchy_level})
                  </p>
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
                
                <div className="col-span-2">
                  <label className="block text-plos-text-secondary text-sm mb-1">Dipartimento</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  />
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
                  Crea Agente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <Edit className="text-plos-primary" />
              Modifica: {selectedUser.game_name}
            </h2>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-plos-text-secondary text-sm mb-1">Livello</label>
                <select
                  value={formData.hierarchy_level}
                  onChange={(e) => handleLevelChange(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                >
                  {Object.keys(SECTOR_GRADES[userSector] || {})
                    .filter(level => parseInt(level) < user?.hierarchy_level)
                    .map(level => (
                      <option key={level} value={level}>
                        {level} - {SECTOR_GRADES[userSector][level]}
                      </option>
                    ))}
                </select>
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
                  Salva
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
              Reset per: <strong className="text-white">{selectedUser.game_name}</strong>
            </p>
            
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-plos-text-secondary text-sm mb-1">Nuova Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white focus:border-plos-primary focus:outline-none"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-plos-surface text-white rounded-lg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access History Modal */}
      {showAccessHistoryModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <History className="text-plos-primary" />
              Storico Accessi: {selectedUser.game_name}
            </h2>
            
            <div className="overflow-y-auto flex-1">
              {accessHistory.length === 0 ? (
                <p className="text-plos-text-secondary text-center py-8">Nessun accesso registrato</p>
              ) : (
                <div className="space-y-2">
                  {accessHistory.map((log, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-plos-surface/50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        log.action === 'login_success' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-white text-sm">{log.description || log.action}</p>
                        <p className="text-plos-text-secondary text-xs">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : 'N/A'}
                        </p>
                      </div>
                      <p className="text-plos-text-secondary text-xs font-mono">{log.ip_address}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowAccessHistoryModal(false)}
              className="mt-4 px-4 py-2 bg-plos-surface text-white rounded-lg"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Sector Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="text-plos-primary" />
              Audit Reparto {userSector} - Ultimi 7 giorni
            </h2>
            
            <div className="overflow-y-auto flex-1">
              {auditLogs.length === 0 ? (
                <p className="text-plos-text-secondary text-center py-8">Nessun log trovato</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-plos-surface/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Data/Ora</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Agente</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Azione</th>
                      <th className="px-3 py-2 text-left text-xs text-plos-text-secondary">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-plos-border">
                    {auditLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-plos-surface/30">
                        <td className="px-3 py-2 text-white text-xs">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-white text-xs">{log.game_name || '-'}</td>
                        <td className="px-3 py-2 text-plos-accent text-xs font-mono">{log.action}</td>
                        <td className="px-3 py-2 text-plos-text-secondary text-xs">{log.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <button
              onClick={() => setShowAuditModal(false)}
              className="mt-4 px-4 py-2 bg-plos-surface text-white rounded-lg"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectorManagement;
