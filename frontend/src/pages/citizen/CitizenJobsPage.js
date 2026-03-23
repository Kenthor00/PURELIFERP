/**
 * Citizen Job Board - Bandi di Lavoro per Dipartimento
 * Esplora posizioni aperte raggruppate per dipartimento e candidati
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Briefcase, Send, Clock, CheckCircle2, XCircle, Eye,
  MapPin, DollarSign, Users, ChevronRight, Loader2,
  Calendar, FileText, ArrowLeft, Star
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const appStatusConfig = {
  pending: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'In Attesa', icon: Clock },
  reviewing: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'In Revisione', icon: Eye },
  interview: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Colloquio', icon: Calendar },
  accepted: { text: 'text-[#adff2f]', bg: 'bg-[#adff2f]/10', border: 'border-[#adff2f]/20', label: 'Accettato', icon: CheckCircle2 },
  rejected: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Rifiutato', icon: XCircle },
};

const CitizenJobsPage = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState('browse');
  const [jobs, setJobs] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState({ motivation: '', experience: '', availability: '', custom_fields: '' });
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        axios.get(`${API}/api/jobs/open`, { headers }),
        axios.get(`${API}/api/jobs/my-applications`, { headers })
      ]);
      setJobs(jobsRes.data);
      setMyApps(appsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  // Group jobs by department
  const groupedJobs = jobs.reduce((acc, job) => {
    const key = job.dept_code || 'OTHER';
    if (!acc[key]) acc[key] = { name: job.dept_name || key, color: job.dept_color || '#adff2f', icon: job.dept_icon, jobs: [] };
    acc[key].jobs.push(job);
    return acc;
  }, {});

  const selectJob = (job) => {
    setSelectedJob(job);
    setTab('apply');
    setForm({ motivation: '', experience: '', availability: '', custom_fields: '' });
  };

  const handleApply = async () => {
    if (!form.motivation.trim()) {
      toast.error('Scrivi la tua motivazione');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/jobs/postings/${selectedJob.id}/apply`, form, { headers });
      toast.success('Candidatura inviata!');
      setTab('my-applications');
      setSelectedJob(null);
      setLoading(true);
      await fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore candidatura'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 text-[#adff2f] animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-4xl" data-testid="citizen-jobs-page">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white">Bandi di Lavoro</h1>
        <p className="text-[0.625rem] text-[#7f9aa3]">Trova la tua posizione ideale a Los Santos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0e12] rounded-lg p-1 border border-[#1b2a30]">
        {[
          { id: 'browse', label: 'Posizioni Aperte', icon: Briefcase, count: jobs.length },
          { id: 'my-applications', label: 'Le Mie Candidature', icon: FileText, count: myApps.length },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedJob(null); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${
              tab === t.id || (tab === 'apply' && t.id === 'browse')
                ? 'bg-[#adff2f]/10 text-[#adff2f] border border-[#adff2f]/20'
                : 'text-[#7f9aa3] hover:text-white'
            }`}
            data-testid={`tab-${t.id}`}>
            <t.icon size={13} />
            {t.label}
            <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-[0.5625rem]">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ==================== BROWSE JOBS (grouped by department) ==================== */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {Object.keys(groupedJobs).length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={32} className="mx-auto text-[#4a6670] mb-2" />
              <p className="text-[#7f9aa3] text-sm">Nessun bando disponibile al momento</p>
            </div>
          ) : Object.entries(groupedJobs).map(([code, dept]) => (
            <div key={code} className="space-y-2">
              {/* Department Header */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: dept.color + '20' }}>
                  <Briefcase size={12} style={{ color: dept.color }} />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: dept.color }}>{dept.name}</h2>
                <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-white/5 text-[#7f9aa3]">{dept.jobs.length} posizioni</span>
                <div className="flex-1 border-b border-[#1b2a30]" />
              </div>

              {/* Jobs in this department */}
              {dept.jobs.map(job => (
                <div key={job.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3 hover:border-[#adff2f]/15 transition-colors" data-testid={`job-card-${job.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{job.title}</h3>
                        {job.priority === 'urgent' && <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">URGENTE</span>}
                        {job.priority === 'high' && <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold">PRIORITA'</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[0.625rem] text-[#7f9aa3]">
                        <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>
                        {job.salary_range && <span className="flex items-center gap-1"><DollarSign size={10} />{job.salary_range}</span>}
                        <span className="flex items-center gap-1"><Users size={10} />{job.available_slots} posti</span>
                      </div>
                      <p className="text-xs text-[#c0cdd0] mt-2 line-clamp-2">{job.description}</p>
                      {job.requirements && <p className="text-[0.625rem] text-[#7f9aa3] mt-1"><strong>Requisiti:</strong> {job.requirements}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                      {job.user_applied ? (
                        <span className={`px-2 py-1 rounded text-[0.625rem] font-bold ${appStatusConfig[job.user_application_status]?.bg || 'bg-yellow-500/10'} ${appStatusConfig[job.user_application_status]?.text || 'text-yellow-400'}`}>
                          {appStatusConfig[job.user_application_status]?.label || 'Inviata'}
                        </span>
                      ) : (
                        <button onClick={() => selectJob(job)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#adff2f]/10 border border-[#adff2f]/20 text-[#adff2f] text-xs font-bold hover:bg-[#adff2f]/20 transition-colors"
                          data-testid={`apply-btn-${job.id}`}>
                          <Send size={12} /> CANDIDATI
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ==================== APPLY FORM ==================== */}
      {tab === 'apply' && selectedJob && (
        <div className="space-y-3">
          <button onClick={() => setTab('browse')} className="text-[#adff2f] text-xs hover:underline flex items-center gap-1">
            <ArrowLeft size={12} /> Torna ai bandi
          </button>
          <div className="bg-[#0a0e12] border border-[#adff2f]/15 rounded-lg p-4 space-y-3" data-testid="apply-form">
            <div>
              <h2 className="text-sm font-bold text-[#adff2f]">Candidatura: {selectedJob.title}</h2>
              <p className="text-[0.625rem] text-[#7f9aa3]">
                <span style={{ color: selectedJob.dept_color || '#adff2f' }}>{selectedJob.dept_name}</span> - {selectedJob.location}
              </p>
            </div>
            {selectedJob.requirements && (
              <div className="bg-[#060a0d] border border-[#1b2a30] rounded p-2">
                <p className="text-[0.625rem] text-[#7f9aa3] font-bold uppercase tracking-wider mb-1">Requisiti richiesti</p>
                <p className="text-xs text-[#c0cdd0]">{selectedJob.requirements}</p>
              </div>
            )}
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Motivazione *</label>
              <textarea value={form.motivation} onChange={e => setForm({...form, motivation: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-24 resize-none focus:border-[#adff2f]/30 outline-none"
                placeholder="Perche' vuoi questo lavoro?" data-testid="apply-motivation" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Esperienza</label>
                <textarea value={form.experience} onChange={e => setForm({...form, experience: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none focus:border-[#adff2f]/30 outline-none"
                  placeholder="Esperienza precedente..." />
              </div>
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Disponibilita'</label>
                <input value={form.availability} onChange={e => setForm({...form, availability: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                  placeholder="Es: Lun-Ven, 18-23" />
              </div>
            </div>
            <button onClick={handleApply} disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#adff2f] text-[#060a0d] rounded font-bold text-xs hover:bg-[#c5ff5e] transition-colors disabled:opacity-50"
              data-testid="submit-apply-btn">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> INVIA CANDIDATURA</>}
            </button>
          </div>
        </div>
      )}

      {/* ==================== MY APPLICATIONS ==================== */}
      {tab === 'my-applications' && (
        <div className="space-y-2">
          {myApps.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={32} className="mx-auto text-[#4a6670] mb-2" />
              <p className="text-[#7f9aa3] text-sm">Nessuna candidatura inviata</p>
              <button onClick={() => setTab('browse')} className="mt-2 text-[#adff2f] text-xs hover:underline">Esplora i bandi</button>
            </div>
          ) : myApps.map(app => {
            const st = appStatusConfig[app.status] || appStatusConfig.pending;
            const StIcon = st.icon;
            return (
              <div key={app.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3" data-testid={`my-app-${app.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{app.job_title}</h3>
                    <p className="text-[0.625rem] text-[#7f9aa3]">
                      <span style={{ color: app.dept_color || '#adff2f' }}>{app.dept_name}</span>
                      {' '}- Inviata il {app.created_at?.slice(0, 10)}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2 py-1 rounded text-[0.625rem] font-bold ${st.bg} ${st.text} ${st.border} border`}>
                    <StIcon size={12} />
                    {st.label}
                  </span>
                </div>
                {app.reviewer_notes && (
                  <div className="mt-2 text-xs bg-[#adff2f]/5 border border-[#adff2f]/10 rounded p-2">
                    <p className="text-[#adff2f]/70 text-[0.625rem] font-bold">Note dallo staff:</p>
                    <p className="text-[#c0cdd0]">{app.reviewer_notes}</p>
                  </div>
                )}
                {app.interview_date && (
                  <div className="mt-2 flex items-center gap-2 text-purple-400 text-xs">
                    <Calendar size={12} /> Colloquio: {app.interview_date}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CitizenJobsPage;
