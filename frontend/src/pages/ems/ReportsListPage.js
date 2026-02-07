/**
 * EMS - Reports List Page
 * Gestione referti medici
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Plus, Search, User, Calendar, Eye } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ReportsListPage = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newReport, setNewReport] = useState({
    patient_id: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, patientsRes] = await Promise.all([
        axios.get(`${API_URL}/api/ems/reports`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/ems/patients`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setReports(reportsRes.data);
      setPatients(patientsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/ems/reports`, {
        ...newReport,
        patient_id: parseInt(newReport.patient_id)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Referto creato con successo');
      setShowNewModal(false);
      setNewReport({ patient_id: '', diagnosis: '', treatment: '', prescription: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || 'Paziente sconosciuto';
  };

  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const patientName = getPatientName(r.patient_id);
    return patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           r.report_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           r.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const todayReports = reports.filter(r => {
    const today = new Date().toDateString();
    return new Date(r.created_at).toDateString() === today;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <FileText className="text-plos-primary" />
            GESTIONE REFERTI
          </h1>
          <p className="text-plos-text-secondary text-sm">
            {reports.length} referti totali | {todayReports.length} oggi
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="btn-tactical flex items-center gap-2"
        >
          <Plus size={18} />
          NUOVO REFERTO
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
          <input
            type="text"
            placeholder="Cerca per paziente, numero referto, diagnosi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-8">Caricamento...</div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-8 text-plos-text-muted">Nessun referto trovato</div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div key={report.id} className="glass-card p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <FileText className="text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-plos-primary">{report.report_number}</p>
                  <p className="text-lg flex items-center gap-2">
                    <User size={16} className="text-plos-text-muted" />
                    {getPatientName(report.patient_id)}
                  </p>
                  <p className="text-sm text-plos-text-secondary line-clamp-1">{report.diagnosis}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-plos-text-muted flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(report.created_at).toLocaleDateString('it-IT')}
                  </p>
                  <p className="text-xs text-plos-text-muted">
                    {new Date(report.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedReport(report); setShowDetailModal(true); }}
                  className="p-2 hover:bg-plos-primary/20 rounded-lg transition-colors"
                >
                  <Eye size={18} className="text-plos-primary" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Report Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
              <FileText className="text-plos-primary" />
              NUOVO REFERTO
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">PAZIENTE *</label>
                <select
                  value={newReport.patient_id}
                  onChange={(e) => setNewReport({...newReport, patient_id: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  required
                >
                  <option value="">Seleziona paziente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.patient_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">DIAGNOSI *</label>
                <textarea
                  value={newReport.diagnosis}
                  onChange={(e) => setNewReport({...newReport, diagnosis: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">TRATTAMENTO *</label>
                <textarea
                  value={newReport.treatment}
                  onChange={(e) => setNewReport({...newReport, treatment: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={2}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">PRESCRIZIONE</label>
                <textarea
                  value={newReport.prescription}
                  onChange={(e) => setNewReport({...newReport, prescription: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-plos-text-secondary mb-1">NOTE</label>
                <textarea
                  value={newReport.notes}
                  onChange={(e) => setNewReport({...newReport, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 px-4 py-2 bg-plos-surface rounded-lg">
                  Annulla
                </button>
                <button type="submit" className="flex-1 btn-tactical">
                  CREA REFERTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
              <FileText className="text-plos-primary" />
              {selectedReport.report_number}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-plos-text-secondary">PAZIENTE</p>
                <p className="text-lg">{getPatientName(selectedReport.patient_id)}</p>
              </div>
              <div>
                <p className="text-sm text-plos-text-secondary">DIAGNOSI</p>
                <p className="whitespace-pre-wrap">{selectedReport.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-plos-text-secondary">TRATTAMENTO</p>
                <p className="whitespace-pre-wrap">{selectedReport.treatment}</p>
              </div>
              {selectedReport.prescription && (
                <div>
                  <p className="text-sm text-plos-text-secondary">PRESCRIZIONE</p>
                  <p className="whitespace-pre-wrap">{selectedReport.prescription}</p>
                </div>
              )}
              {selectedReport.notes && (
                <div>
                  <p className="text-sm text-plos-text-secondary">NOTE</p>
                  <p className="whitespace-pre-wrap">{selectedReport.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-plos-text-secondary">DATA</p>
                <p>{new Date(selectedReport.created_at).toLocaleString('it-IT')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full mt-4 px-4 py-2 bg-plos-surface rounded-lg"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsListPage;
