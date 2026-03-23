/**
 * PURE LIFE OS - Audit Dashboard (Admin)
 * Dashboard avanzata per visualizzare e filtrare i log di audit
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  FileText, Download, Filter, Search, RefreshCw, 
  User, Calendar, Activity, ChevronDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditDashboard = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  
  // Filtri
  const [filters, setFilters] = useState({
    sector: '',
    action: '',
    hours: 24,
    user_id: '',
    start_date: '',
    end_date: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', '24h', 'user'
  const [selectedUserId, setSelectedUserId] = useState('');

  const sectors = ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH', 'CIVIL', 'ADMIN'];
  const timeRanges = [
    { label: 'Ultime 24 ore', value: 24 },
    { label: 'Ultimi 3 giorni', value: 72 },
    { label: 'Ultima settimana', value: 168 },
    { label: 'Ultimo mese', value: 720 }
  ];

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchAvailableActions();
  }, []);

  useEffect(() => {
    if (viewMode !== 'user') {
      fetchLogs();
    }
  }, [filters.hours, filters.sector, filters.action]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('plos_token');
      const params = new URLSearchParams();
      
      if (filters.sector) params.append('sector', filters.sector);
      if (filters.action) params.append('action_filter', filters.action);
      params.append('hours', filters.hours);
      params.append('limit', '200');

      const endpoint = user?.sector === 'ADMIN' ? '/api/audit/my-sector' : '/api/audit/my-sector';
      const response = await axios.get(`${API_URL}${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLogs = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/audit/user/${userId}?hours=720&limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
      setViewMode('user');
      setSelectedUserId(userId);
    } catch (error) {
      toast.error('Errore nel caricamento log utente');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/audit/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableActions = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/audit/actions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableActions(response.data.actions || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await axios.get(`${API_URL}/api/audit/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export completato');
    } catch (error) {
      toast.error('Errore durante l\'export');
    }
  };

  const getActionColor = (action) => {
    if (!action) return 'text-plos-text-secondary';
    if (action.includes('login_success')) return 'text-lime-400';
    if (action.includes('login_failed')) return 'text-red-400';
    if (action.includes('create')) return 'text-blue-400';
    if (action.includes('update') || action.includes('change')) return 'text-yellow-400';
    if (action.includes('delete') || action.includes('deactivate')) return 'text-red-400';
    if (action.includes('export')) return 'text-purple-400';
    return 'text-plos-text-secondary';
  };

  const getActionBadgeColor = (action) => {
    if (!action) return 'bg-gray-500/20 text-gray-400';
    if (action.includes('login_success')) return 'bg-lime-500/20 text-lime-400';
    if (action.includes('login_failed')) return 'bg-red-500/20 text-red-400';
    if (action.includes('create')) return 'bg-blue-500/20 text-blue-400';
    if (action.includes('update') || action.includes('change')) return 'bg-yellow-500/20 text-yellow-400';
    if (action.includes('delete') || action.includes('deactivate')) return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const resetFilters = () => {
    setFilters({
      sector: '',
      action: '',
      hours: 24,
      user_id: '',
      start_date: '',
      end_date: ''
    });
    setViewMode('all');
    setSelectedUserId('');
  };

  // Raggruppa log per tipo di azione per le statistiche
  const actionStats = logs.reduce((acc, log) => {
    const action = log.action || 'unknown';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6" data-testid="audit-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider flex items-center gap-3">
            <FileText className="w-8 h-8 text-plos-primary" />
            AUDIT LOG
          </h1>
          <p className="text-plos-text-secondary mt-1">
            {viewMode === 'user' 
              ? `Visualizzando log utente ID: ${selectedUserId}` 
              : `${logs.length} log nelle ultime ${filters.hours} ore`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetFilters(); fetchLogs(); }}
            className="px-3 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors flex items-center gap-2"
            data-testid="export-csv-btn"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs">Log Totali (24h)</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.total_logs_24h || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-plos-primary opacity-50" />
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs">Login Riusciti</p>
              <p className="text-2xl font-bold text-lime-400 mt-1">{stats?.logins_24h || 0}</p>
            </div>
            <User className="w-8 h-8 text-lime-400 opacity-50" />
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs">Login Falliti</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats?.failed_logins_24h || 0}</p>
            </div>
            <User className="w-8 h-8 text-red-400 opacity-50" />
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs">Utenti Attivi</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{stats?.active_users || 0}</p>
            </div>
            <User className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-xs">Azioni Diverse</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {Object.keys(stats?.actions_by_type || {}).length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Filter size={18} />
            Filtri
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-plos-text-secondary hover:text-white transition-colors"
          >
            <ChevronDown size={20} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Time Range */}
          <select
            value={filters.hours}
            onChange={(e) => setFilters(f => ({ ...f, hours: Number(e.target.value) }))}
            className="px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
          >
            {timeRanges.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          
          {/* Sector Filter */}
          <select
            value={filters.sector}
            onChange={(e) => setFilters(f => ({ ...f, sector: e.target.value }))}
            className="px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
          >
            <option value="">Tutti i settori</option>
            {sectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
            className="px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
          >
            <option value="">Tutte le azioni</option>
            {availableActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          
          {/* User ID Search */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="ID Utente"
              value={filters.user_id}
              onChange={(e) => setFilters(f => ({ ...f, user_id: e.target.value }))}
              className="w-24 px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
            />
            <button
              onClick={() => filters.user_id && fetchUserLogs(filters.user_id)}
              disabled={!filters.user_id}
              className="px-3 py-1.5 bg-plos-primary text-black text-sm rounded-lg disabled:opacity-50"
            >
              Cerca
            </button>
          </div>
          
          {viewMode === 'user' && (
            <button
              onClick={() => { setViewMode('all'); fetchLogs(); }}
              className="px-3 py-1.5 bg-orange-500/20 text-orange-400 text-sm rounded-lg hover:bg-orange-500/30 transition-colors"
            >
              Mostra tutti
            </button>
          )}
        </div>
        
        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-plos-border grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-plos-text-secondary text-xs mb-1">Data Inizio (export)</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-plos-text-secondary text-xs mb-1">Data Fine (export)</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
              />
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-1.5 bg-plos-surface text-plos-text-secondary text-sm rounded-lg hover:text-white transition-colors"
              >
                Reset Filtri
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Distribution */}
      {Object.keys(actionStats).length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Distribuzione Azioni</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(actionStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([action, count]) => (
                <button
                  key={action}
                  onClick={() => setFilters(f => ({ ...f, action }))}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${getActionBadgeColor(action)} hover:opacity-80`}
                >
                  {action}: {count}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-plos-surface/50 border-b border-plos-border sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Timestamp</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Utente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Game Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Settore</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Azione</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Entità</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">Descrizione</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-plos-text-secondary">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plos-border">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-plos-text-secondary">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Caricamento...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-8 text-center text-plos-text-secondary">
                    Nessun log trovato
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-plos-surface/30 transition-colors">
                    <td className="px-3 py-2 text-white text-xs whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => log.user_id && fetchUserLogs(log.user_id)}
                        className="text-plos-text-secondary text-xs hover:text-plos-primary transition-colors"
                      >
                        {log.user_email || 'N/A'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-white text-xs font-medium">
                      {log.game_name || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {log.sector && (
                        <span className="px-1.5 py-0.5 bg-plos-surface text-white text-xs rounded">
                          {log.sector}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-mono ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-plos-text-secondary text-xs">
                      {log.entity_type ? `${log.entity_type}#${log.entity_id}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-plos-text-secondary text-xs max-w-[200px] truncate" title={log.description}>
                      {log.description || '-'}
                    </td>
                    <td className="px-3 py-2 text-plos-text-secondary text-xs font-mono">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;
