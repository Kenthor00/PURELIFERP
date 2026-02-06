/**
 * PURE LIFE OS - Audit Dashboard
 * Dashboard per visualizzare i log di audit
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuditDashboard = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sector: '',
    action: '',
    hours: 24
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('plos_token');
      const params = new URLSearchParams();
      if (filters.sector) params.append('sector', filters.sector);
      if (filters.action) params.append('action', filters.action);
      params.append('hours', filters.hours);
      params.append('limit', '100');

      const response = await axios.get(`${API_URL}/api/audit/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      // Se l'endpoint non esiste ancora, mostra log vuoti
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      const response = await axios.get(`${API_URL}/api/audit/export`, {
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
    if (action?.includes('login')) return 'text-blue-400';
    if (action?.includes('create')) return 'text-green-400';
    if (action?.includes('update') || action?.includes('change')) return 'text-yellow-400';
    if (action?.includes('delete') || action?.includes('deactivate')) return 'text-red-400';
    return 'text-plos-text-secondary';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sectors = ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH', 'CIVIL', 'ADMIN'];
  const timeRanges = [
    { label: 'Ultime 24 ore', value: 24 },
    { label: 'Ultimi 7 giorni', value: 168 },
    { label: 'Ultimi 30 giorni', value: 720 }
  ];

  return (
    <div className="space-y-6 p-6" data-testid="audit-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider">
            AUDIT LOG
          </h1>
          <p className="text-plos-text-secondary mt-1">
            Monitora tutte le azioni nel sistema
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-plos-surface text-white rounded-lg hover:bg-plos-surface/80 transition-colors flex items-center gap-2"
          data-testid="export-csv-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-plos-text-secondary text-sm mb-1">Settore</label>
            <select
              value={filters.sector}
              onChange={(e) => setFilters(f => ({ ...f, sector: e.target.value }))}
              className="px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
            >
              <option value="">Tutti</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-plos-text-secondary text-sm mb-1">Periodo</label>
            <select
              value={filters.hours}
              onChange={(e) => setFilters(f => ({ ...f, hours: Number(e.target.value) }))}
              className="px-3 py-2 bg-plos-surface border border-plos-border rounded-lg text-white text-sm focus:border-plos-primary focus:outline-none"
            >
              {timeRanges.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-plos-primary text-black rounded-lg text-sm font-medium hover:bg-plos-primary/80 transition-colors"
            >
              Applica Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-plos-text-secondary text-sm">Totale Log</p>
          <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-plos-text-secondary text-sm">Login</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {logs.filter(l => l.action?.includes('login')).length}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-plos-text-secondary text-sm">Creazioni</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {logs.filter(l => l.action?.includes('create')).length}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-plos-text-secondary text-sm">Modifiche</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {logs.filter(l => l.action?.includes('update') || l.action?.includes('change')).length}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-plos-surface/50 border-b border-plos-border sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Utente</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Settore</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Azione</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">Descrizione</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-plos-text-secondary">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plos-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-plos-text-secondary">
                    Caricamento...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-plos-text-secondary">
                    Nessun log trovato
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-plos-surface/30 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm">{log.game_name || 'N/A'}</p>
                        <p className="text-plos-text-secondary text-xs">{log.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-plos-surface text-white text-xs rounded">
                        {log.sector || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-plos-text-secondary text-sm max-w-xs truncate">
                      {log.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-plos-text-secondary text-sm font-mono">
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
