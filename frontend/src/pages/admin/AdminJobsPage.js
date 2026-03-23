/**
 * Admin Job Management - Gestione Bandi di Lavoro
 * Crea, modifica, gestisci bandi e candidature
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Briefcase, Plus, Users, CheckCircle2, XCircle, Clock, Eye,
  ChevronRight, Loader2, Pencil, Trash2, PauseCircle, PlayCircle,
  MessageSquare, Calendar, AlertTriangle, BarChart3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  open: { text: 'text-[#adff2f]', bg: 'bg-[#adff2f]/10', border: 'border-[#adff2f]/20', label: 'APERTO' },
  closed: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'CHIUSO' },
  paused: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'IN PAUSA' },
};

const appStatusColors = {
  pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'In Attesa' },
  reviewing: { text: 'text-blue-400', bg: 'bg-blue-500/10', label: 'In Revisione' },
  interview: { text: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Colloquio' },
  accepted: { text: 'text-[#adff2f]', bg: 'bg-[#adff2f]/10', label: 'Accettato' },
  rejected: { text: 'text-red-400', bg: 'bg-red-500/10', label: 'Rifiutato' },
};

const priorityColors = {
  normal: { text: 'text-[#7f9aa3]', label: 'Normale' },
  high: { text: 'text-orange-400', label: 'Alta' },
  urgent: { text: 'text-red-400', label: 'Urgente' },
};

const AdminJobsPage = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list, create, detail, applications
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({ title: '', department: '', description: '', requirements: '', salary_range: '', max_slots: 1, location: 'Los Santos', contact_info: '', priority: 'normal' });
  const [submitting, setSubmitting] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: '', notes: '', interview_date: '' });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchJobs = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/jobs/admin/all`, { headers }),
        axios.get(`${API}/api/jobs/admin/stats`, { headers })
      ]);
      setJobs(jobsRes.data);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleCreate = async () => {
    if (!form.title || !form.department || !form.description) {
      toast.error('Compila titolo, dipartimento e descrizione');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/jobs/create`, form, { headers });
      toast.success('Bando creato con successo');
      setView('list');
      setForm({ title: '', department: '', description: '', requirements: '', salary_range: '', max_slots: 1, location: 'Los Santos', contact_info: '', priority: 'normal' });
      fetchJobs();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setSubmitting(false); }
  };

  const toggleJobStatus = async (job) => {
    const newStatus = job.status === 'open' ? 'paused' : 'open';
    try {
      await axios.put(`${API}/api/jobs/${job.id}`, { status: newStatus }, { headers });
      toast.success(`Bando ${newStatus === 'open' ? 'riaperto' : 'in pausa'}`);
      fetchJobs();
    } catch (err) { toast.error('Errore'); }
  };

  const closeJob = async (job) => {
    try {
      await axios.put(`${API}/api/jobs/${job.id}`, { status: 'closed' }, { headers });
      toast.success('Bando chiuso');
      fetchJobs();
    } catch (err) { toast.error('Errore'); }
  };

  const deleteJob = async (job) => {
    try {
      await axios.delete(`${API}/api/jobs/${job.id}`, { headers });
      toast.success('Bando eliminato');
      fetchJobs();
    } catch (err) { toast.error('Errore'); }
  };

  const viewApplications = async (job) => {
    setSelectedJob(job);
    try {
      const res = await axios.get(`${API}/api/jobs/${job.id}/applications`, { headers });
      setApplications(res.data);
      setView('applications');
    } catch (err) { toast.error('Errore caricamento candidature'); }
  };

  const reviewApplication = async () => {
    if (!reviewForm.status) return;
    try {
      await axios.put(`${API}/api/jobs/applications/${reviewModal.id}/review`, reviewForm, { headers });
      toast.success('Candidatura aggiornata');
      setReviewModal(null);
      viewApplications(selectedJob);
      fetchJobs();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 text-[#adff2f] animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-5xl" data-testid="admin-jobs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Gestione Bandi di Lavoro</h1>
          <p className="text-[0.625rem] text-[#7f9aa3]">Crea e gestisci le posizioni lavorative</p>
        </div>
        <button onClick={() => setView(view === 'create' ? 'list' : 'create')} className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#adff2f]/10 border border-[#adff2f]/20 text-[#adff2f] text-xs font-bold hover:bg-[#adff2f]/20 transition-colors" data-testid="create-job-btn">
          <Plus size={14} />
          {view === 'create' ? 'ANNULLA' : 'NUOVO BANDO'}
        </button>
      </div>

      {/* Stats */}
      {stats && view === 'list' && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Totale Bandi', value: stats.total_jobs, icon: Briefcase, color: '#adff2f' },
            { label: 'Aperti', value: stats.open_jobs, icon: PlayCircle, color: '#adff2f' },
            { label: 'Candidature', value: stats.total_applications, icon: Users, color: '#8b5cf6' },
            { label: 'In Attesa', value: stats.pending_applications, icon: Clock, color: '#f59e0b' },
            { label: 'Accettati', value: stats.accepted_applications, icon: CheckCircle2, color: '#22c55e' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <s.icon size={15} style={{ color: s.color }} />
                <span className="text-lg font-bold text-white">{s.value}</span>
              </div>
              <p className="text-[0.5625rem] text-[#7f9aa3] uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {view === 'create' && (
        <div className="bg-[#0a0e12] border border-[#adff2f]/10 rounded-lg p-4 space-y-3" data-testid="create-job-form">
          <h2 className="text-sm font-bold text-[#adff2f]">Nuovo Bando</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Titolo *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" placeholder="Es: Agente LSPD" data-testid="job-title-input" />
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Dipartimento *</label>
              <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" placeholder="Es: LSPD, EMS, Meccanico..." data-testid="job-dept-input" />
            </div>
          </div>
          <div>
            <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Descrizione *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-20 resize-none" placeholder="Descrivi la posizione..." data-testid="job-desc-input" />
          </div>
          <div>
            <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Requisiti</label>
            <textarea value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none" placeholder="Es: Livello minimo 5, patente B..." />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Stipendio</label>
              <input value={form.salary_range} onChange={e => setForm({...form, salary_range: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" placeholder="$2000-$5000" />
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Posti</label>
              <input type="number" min={1} value={form.max_slots} onChange={e => setForm({...form, max_slots: parseInt(e.target.value) || 1})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" />
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Luogo</label>
              <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" />
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Priorita'</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white">
                <option value="normal">Normale</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={submitting} className="px-4 py-2 bg-[#adff2f] text-[#060a0d] rounded font-bold text-xs hover:bg-[#c5ff5e] transition-colors disabled:opacity-50" data-testid="submit-job-btn">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'PUBBLICA BANDO'}
          </button>
        </div>
      )}

      {/* Applications View */}
      {view === 'applications' && selectedJob && (
        <div className="space-y-3">
          <button onClick={() => { setView('list'); setSelectedJob(null); }} className="text-[#adff2f] text-xs hover:underline flex items-center gap-1">
            <ChevronRight size={12} className="rotate-180" /> Torna ai bandi
          </button>
          <div className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3">
            <h2 className="text-sm font-bold text-white">{selectedJob.title}</h2>
            <p className="text-[0.625rem] text-[#7f9aa3]">{selectedJob.department} - {applications.length} candidature</p>
          </div>
          {applications.length === 0 ? (
            <p className="text-[#4a6670] text-sm text-center py-8">Nessuna candidatura ricevuta</p>
          ) : (
            <div className="space-y-2">
              {applications.map(app => {
                const st = appStatusColors[app.status] || appStatusColors.pending;
                return (
                  <div key={app.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#adff2f]/10 flex items-center justify-center text-[#adff2f] text-xs font-bold">{app.game_name?.[0] || '?'}</div>
                        <div>
                          <p className="text-sm font-bold text-white">{app.game_name}</p>
                          <p className="text-[0.5625rem] text-[#7f9aa3]">{app.created_at?.slice(0,10)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[0.625rem] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                        <button onClick={() => { setReviewModal(app); setReviewForm({ status: '', notes: '', interview_date: '' }); }} className="px-2 py-1 rounded bg-[#adff2f]/10 text-[#adff2f] text-[0.625rem] hover:bg-[#adff2f]/20" data-testid={`review-app-${app.id}`}>
                          Gestisci
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 pl-11 text-xs text-[#c0cdd0]">
                      <p><strong className="text-[#7f9aa3]">Motivazione:</strong> {app.motivation}</p>
                      {app.experience && <p className="mt-1"><strong className="text-[#7f9aa3]">Esperienza:</strong> {app.experience}</p>}
                      {app.reviewer_notes && <p className="mt-1 text-[#adff2f]/70"><strong>Note staff:</strong> {app.reviewer_notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Jobs List */}
      {view === 'list' && (
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={32} className="mx-auto text-[#4a6670] mb-2" />
              <p className="text-[#7f9aa3] text-sm">Nessun bando creato</p>
              <p className="text-[#4a6670] text-xs">Crea il primo bando per iniziare</p>
            </div>
          ) : jobs.map(job => {
            const st = statusColors[job.status] || statusColors.open;
            const pr = priorityColors[job.priority] || priorityColors.normal;
            return (
              <div key={job.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3 hover:border-[#adff2f]/10 transition-colors group" data-testid={`job-${job.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-[#adff2f]/8 border border-[#adff2f]/15 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={17} className="text-[#adff2f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{job.title}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-bold ${st.bg} ${st.text} ${st.border} border`}>{st.label}</span>
                        {job.priority !== 'normal' && <span className={`text-[0.5rem] font-bold ${pr.text}`}>{pr.label}</span>}
                      </div>
                      <p className="text-[0.625rem] text-[#7f9aa3]">{job.department} - {job.location} - {job.filled_slots}/{job.max_slots} posti</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => viewApplications(job)} className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] text-[0.625rem] hover:bg-[#8b5cf6]/20" data-testid={`view-apps-${job.id}`}>
                      <Users size={12} />
                      <span>{job.applications_count}</span>
                    </button>
                    <button onClick={() => toggleJobStatus(job)} className="p-1.5 rounded hover:bg-white/5" title={job.status === 'open' ? 'Pausa' : 'Riapri'}>
                      {job.status === 'open' ? <PauseCircle size={14} className="text-yellow-400" /> : <PlayCircle size={14} className="text-[#adff2f]" />}
                    </button>
                    <button onClick={() => closeJob(job)} className="p-1.5 rounded hover:bg-white/5" title="Chiudi"><XCircle size={14} className="text-red-400" /></button>
                    <button onClick={() => deleteJob(job)} className="p-1.5 rounded hover:bg-white/5" title="Elimina"><Trash2 size={14} className="text-red-400/50 hover:text-red-400" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="review-modal">
          <div className="bg-[#0a0e12] border border-[#adff2f]/20 rounded-lg p-4 w-96 space-y-3">
            <h3 className="text-sm font-bold text-white">Gestisci Candidatura - {reviewModal.game_name}</h3>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Stato</label>
              <select value={reviewForm.status} onChange={e => setReviewForm({...reviewForm, status: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" data-testid="review-status-select">
                <option value="">Seleziona...</option>
                <option value="reviewing">In Revisione</option>
                <option value="interview">Colloquio</option>
                <option value="accepted">Accettato</option>
                <option value="rejected">Rifiutato</option>
              </select>
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Note</label>
              <textarea value={reviewForm.notes} onChange={e => setReviewForm({...reviewForm, notes: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none" />
            </div>
            {reviewForm.status === 'interview' && (
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Data Colloquio</label>
                <input type="datetime-local" value={reviewForm.interview_date} onChange={e => setReviewForm({...reviewForm, interview_date: e.target.value})} className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={reviewApplication} className="flex-1 px-3 py-2 bg-[#adff2f] text-[#060a0d] rounded text-xs font-bold hover:bg-[#c5ff5e]" data-testid="confirm-review-btn">CONFERMA</button>
              <button onClick={() => setReviewModal(null)} className="px-3 py-2 bg-[#1b2a30] text-[#7f9aa3] rounded text-xs hover:bg-[#243038]">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobsPage;
