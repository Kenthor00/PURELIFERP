/**
 * PURE LIFE OS - User Management Page
 * Gestione utenti per amministratori
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sectorGrades, setSectorGrades] = useState([]);

  const sectors = ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH', 'CIVIL', 'ADMIN'];

  useEffect(() => {
    fetchUsers();
    fetchSectorGrades();
  }, []);

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

  const fetchSectorGrades = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/users/sector-grades`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSectorGrades(response.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const filteredUsers = selectedSector === 'all' 
    ? users 
    : users.filter(u => u.sector === selectedSector);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('plos_token');
      await axios.put(
        `${API_URL}/api/users/${userId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Utente ${currentStatus ? 'disattivato' : 'riattivato'}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella modifica');
    }
  };

  const unlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(
        `${API_URL}/api/users/${userId}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Account sbloccato');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nello sblocco');
    }
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

  return (
    <div className="space-y-6 p-6" data-testid="user-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider">
            GESTIONE UTENTI
          </h1>
          <p className="text-plos-text-secondary mt-1">
            Gestisci gli utenti del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-plos-primary to-plos-accent text-black font-semibold rounded-lg hover:shadow-lg transition-all"
          data-testid="create-user-btn"
        >
          + Nuovo Utente
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedSector === 'all'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface text-plos-text-secondary hover:text-white'
            }`}
          >
            Tutti ({users.length})
          </button>
          {sectors.map(sector => {
            const count = users.filter(u => u.sector === sector).length;
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedSector === sector
                    ? 'bg-plos-primary text-black'
                    : 'bg-plos-surface text-plos-text-secondary hover:text-white'
                }`}
              >
                {sector} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-plos-surface/50 border-b border-plos-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Utente</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Settore</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Grado</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Livello</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Stato</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-plos-text-secondary">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plos-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-plos-text-secondary">
                    Caricamento...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-plos-text-secondary">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-plos-surface/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{u.game_name || 'N/A'}</p>
                        <p className="text-plos-text-secondary text-sm">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getSectorColor(u.sector)}`}>
                        {u.sector}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{u.grade}</td>
                    <td className="px-6 py-4 text-white">{u.hierarchy_level}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.is_active ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            Attivo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                            Inattivo
                          </span>
                        )}
                        {u.is_locked && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            Bloccato
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          className={`px-3 py-1 rounded text-sm ${
                            u.is_active
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          } transition-colors`}
                        >
                          {u.is_active ? 'Disattiva' : 'Riattiva'}
                        </button>
                        {u.is_locked && (
                          <button
                            onClick={() => unlockUser(u.id)}
                            className="px-3 py-1 rounded text-sm bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                          >
                            Sblocca
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-heading font-semibold text-white mb-4">
              Crea Nuovo Utente
            </h2>
            <p className="text-plos-text-secondary mb-4">
              Funzionalità in arrivo nella prossima versione.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
