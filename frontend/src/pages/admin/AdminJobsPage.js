/**
 * Admin/Direttore Job Management - Gestione Dipartimenti, Bandi e Candidature
 * 
 * ADMIN: Crea dipartimenti, assegna direttori, vede tutto
 * DIRETTORE: Crea bandi e gestisce candidature per il suo dipartimento
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Briefcase, Plus, Users, CheckCircle2, XCircle, Clock,
  Loader2, Trash2, PauseCircle, PlayCircle,
  Calendar, Building2, Code, UserPlus, Search,
  ChevronDown, ArrowLeft, Star, Shield
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
  const { token, user } = useAuth();
  const isAdmin = ['ADMIN', 'GOV'].includes(user?.sector?.toUpperCase());
  const userSector = user?.sector?.toUpperCase() || '';

  const [view, setView] = useState(isAdmin ? 'departments' : 'postings');
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [postings, setPostings] = useState([]);
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', icon: 'fa-solid fa-building', color: '#adff2f' });
  const [postForm, setPostForm] = useState({ title: '', description: '', requirements: '', salary_range: '', max_slots: 1, location: 'Los Santos', priority: 'normal' });
  const [postDeptCode, setPostDeptCode] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: '', notes: '', interview_date: '' });

  // Manager assignment state
  const [managerDept, setManagerDept] = useState(null);
  const [managers, setManagers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptsRes, postsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/jobs/departments`, { headers }),
        axios.get(`${API}/api/jobs/postings/my-dept`, { headers }),
        axios.get(`${API}/api/jobs/dept-stats`, { headers }),
      ]);
      setDepartments(deptsRes.data);
      setPostings(postsRes.data);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ===== DEPARTMENT CRUD (Admin) =====
  const createDept = async () => {
    if (!deptForm.name || !deptForm.code || !deptForm.description) {
      toast.error('Compila nome, codice e descrizione'); return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/jobs/departments/create`, deptForm, { headers });
      toast.success('Dipartimento creato');
      setShowDeptForm(false);
      setDeptForm({ name: '', code: '', description: '', icon: 'fa-solid fa-building', color: '#adff2f' });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setSubmitting(false); }
  };

  const deleteDept = async (id) => {
    if (!window.confirm('Eliminare questo dipartimento e tutti i suoi bandi?')) return;
    try {
      await axios.delete(`${API}/api/jobs/departments/${id}`, { headers });
      toast.success('Dipartimento eliminato'); fetchAll();
    } catch (err) { toast.error('Errore eliminazione'); }
  };

  const toggleDeptActive = async (dept) => {
    try {
      await axios.put(`${API}/api/jobs/departments/${dept.id}`, { active: !dept.active }, { headers });
      toast.success(dept.active ? 'Dipartimento disattivato' : 'Dipartimento attivato'); fetchAll();
    } catch (err) { toast.error('Errore'); }
  };

  // ===== MANAGER ASSIGNMENT (Admin) =====
  const openManagerPanel = async (dept) => {
    setManagerDept(dept);
    setSearchQuery(''); setSearchResults([]);
    try {
      const res = await axios.get(`${API}/api/jobs/departments/${dept.id}/managers`, { headers });
      setManagers(res.data);
    } catch { setManagers([]); }
  };

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${API}/api/jobs/users/search?q=${encodeURIComponent(q)}`, { headers });
      setSearchResults(res.data.filter(u => !managers.some(m => m.user_id === u.id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addManager = async (userId) => {
    try {
      await axios.post(`${API}/api/jobs/departments/${managerDept.id}/managers?user_id=${userId}`, {}, { headers });
      toast.success('Direttore assegnato');
      openManagerPanel(managerDept); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const removeManager = async (userId) => {
    try {
      await axios.delete(`${API}/api/jobs/departments/${managerDept.id}/managers/${userId}`, { headers });
      toast.success('Direttore rimosso');
      openManagerPanel(managerDept); fetchAll();
    } catch { toast.error('Errore'); }
  };

  // ===== POSTING CRUD (Direttore) =====
  const createPosting = async () => {
    const code = postDeptCode || (isAdmin ? '' : userSector);
    if (!postForm.title || !postForm.description || !code) {
      toast.error('Compila titolo, descrizione e seleziona dipartimento'); return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/jobs/postings/create?dept_code=${code}`, postForm, { headers });
      toast.success('Bando creato');
      setShowPostForm(false);
      setPostForm({ title: '', description: '', requirements: '', salary_range: '', max_slots: 1, location: 'Los Santos', priority: 'normal' });
      setPostDeptCode(''); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore creazione bando'); }
    finally { setSubmitting(false); }
  };

  const togglePostStatus = async (posting) => {
    const newStatus = posting.status === 'open' ? 'paused' : 'open';
    try {
      await axios.put(`${API}/api/jobs/postings/${posting.id}`, { status: newStatus }, { headers });
      toast.success(newStatus === 'open' ? 'Bando riaperto' : 'Bando in pausa'); fetchAll();
    } catch { toast.error('Errore'); }
  };

  const closePost = async (posting) => {
    try {
      await axios.put(`${API}/api/jobs/postings/${posting.id}`, { status: 'closed' }, { headers });
      toast.success('Bando chiuso'); fetchAll();
    } catch { toast.error('Errore'); }
  };

  const deletePost = async (posting) => {
    if (!window.confirm('Eliminare questo bando?')) return;
    try {
      await axios.delete(`${API}/api/jobs/postings/${posting.id}`, { headers });
      toast.success('Bando eliminato'); fetchAll();
    } catch { toast.error('Errore'); }
  };

  // ===== APPLICATIONS =====
  const viewApplications = async (posting) => {
    setSelectedPosting(posting);
    try {
      const res = await axios.get(`${API}/api/jobs/postings/${posting.id}/applications`, { headers });
      setApplications(res.data);
      setView('applications');
    } catch { toast.error('Errore caricamento candidature'); }
  };

  const reviewApplication = async () => {
    if (!reviewForm.status) { toast.error('Seleziona uno stato'); return; }
    try {
      await axios.put(`${API}/api/jobs/applications/${reviewModal.id}/review`, reviewForm, { headers });
      toast.success('Candidatura aggiornata');
      setReviewModal(null);
      viewApplications(selectedPosting); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 text-[#adff2f] animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-5xl" data-testid="admin-jobs-page">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white">
          {isAdmin ? 'Gestione Lavori' : `Bandi ${userSector}`}
        </h1>
        <p className="text-[0.625rem] text-[#7f9aa3]">
          {isAdmin ? 'Dipartimenti, direttori, bandi e candidature' : 'Gestisci i bandi del tuo dipartimento'}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Bandi', value: stats.total_postings, icon: Briefcase, color: '#adff2f' },
            { label: 'Aperti', value: stats.open_postings, icon: PlayCircle, color: '#22d3ee' },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0e12] rounded-lg p-1 border border-[#1b2a30]">
        {isAdmin && (
          <button onClick={() => setView('departments')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${
              view === 'departments' ? 'bg-[#adff2f]/10 text-[#adff2f] border border-[#adff2f]/20' : 'text-[#7f9aa3] hover:text-white'
            }`} data-testid="tab-departments">
            <Building2 size={13} /> Dipartimenti
            <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-[0.5625rem]">{departments.length}</span>
          </button>
        )}
        <button onClick={() => setView('postings')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-bold transition-colors ${
            view === 'postings' ? 'bg-[#adff2f]/10 text-[#adff2f] border border-[#adff2f]/20' : 'text-[#7f9aa3] hover:text-white'
          }`} data-testid="tab-postings">
          <Briefcase size={13} /> Bandi
          <span className="ml-1 px-1.5 py-0.5 rounded bg-white/5 text-[0.5625rem]">{postings.length}</span>
        </button>
      </div>

      {/* ==================== DEPARTMENTS VIEW (Admin only) ==================== */}
      {view === 'departments' && isAdmin && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowDeptForm(!showDeptForm)}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#adff2f]/10 border border-[#adff2f]/20 text-[#adff2f] text-xs font-bold hover:bg-[#adff2f]/20 transition-colors"
              data-testid="create-dept-btn">
              <Plus size={14} /> {showDeptForm ? 'ANNULLA' : 'NUOVO DIPARTIMENTO'}
            </button>
          </div>

          {/* Dept Form */}
          {showDeptForm && (
            <div className="bg-[#0a0e12] border border-[#adff2f]/10 rounded-lg p-4 space-y-3" data-testid="create-dept-form">
              <h2 className="text-sm font-bold text-[#adff2f]">Nuovo Dipartimento</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Nome *</label>
                  <input value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                    placeholder="Es: Los Santos Police Department" data-testid="dept-name-input" />
                </div>
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Codice * (settore)</label>
                  <input value={deptForm.code} onChange={e => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white uppercase focus:border-[#adff2f]/30 outline-none"
                    placeholder="Es: LSPD, EMS, MECH" data-testid="dept-code-input" />
                </div>
              </div>
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Descrizione *</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none focus:border-[#adff2f]/30 outline-none"
                  placeholder="Descrizione del dipartimento..." data-testid="dept-desc-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Icona FontAwesome</label>
                  <input value={deptForm.icon} onChange={e => setDeptForm({...deptForm, icon: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                    placeholder="fa-solid fa-shield" />
                </div>
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Colore</label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={deptForm.color} onChange={e => setDeptForm({...deptForm, color: e.target.value})}
                      className="w-10 h-[38px] rounded border border-[#1b2a30] bg-[#060a0d] cursor-pointer" />
                    <input value={deptForm.color} onChange={e => setDeptForm({...deptForm, color: e.target.value})}
                      className="flex-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={createDept} disabled={submitting}
                className="px-4 py-2 bg-[#adff2f] text-[#060a0d] rounded font-bold text-xs hover:bg-[#c5ff5e] transition-colors disabled:opacity-50"
                data-testid="submit-dept-btn">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'CREA DIPARTIMENTO'}
              </button>
            </div>
          )}

          {/* Departments List */}
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={32} className="mx-auto text-[#4a6670] mb-2" />
              <p className="text-[#7f9aa3] text-sm">Nessun dipartimento creato</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {departments.map(dept => (
                <div key={dept.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3 hover:border-[#adff2f]/10 transition-colors" data-testid={`dept-${dept.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: dept.color + '15', border: `1px solid ${dept.color}30` }}>
                        <Code size={17} style={{ color: dept.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{dept.name}</h3>
                          <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold bg-white/5 text-[#7f9aa3]">{dept.code}</span>
                        </div>
                        <p className="text-[0.625rem] text-[#7f9aa3] mt-0.5 line-clamp-1">{dept.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[0.5625rem] text-[#4a6670]">
                          <span>{dept.open_postings} bandi</span>
                          <span>{dept.pending_applications} candidature</span>
                          <span className="text-[#adff2f]/50">{dept.managers_count || 0} direttori</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openManagerPanel(dept)}
                        className="p-1.5 rounded hover:bg-white/5" title="Gestisci Direttori"
                        data-testid={`manage-directors-${dept.id}`}>
                        <UserPlus size={14} className="text-[#adff2f]/70 hover:text-[#adff2f]" />
                      </button>
                      <button onClick={() => toggleDeptActive(dept)} className="p-1.5 rounded hover:bg-white/5"
                        title={dept.active ? 'Disattiva' : 'Attiva'}>
                        {dept.active ? <PauseCircle size={14} className="text-yellow-400" /> : <PlayCircle size={14} className="text-[#adff2f]" />}
                      </button>
                      <button onClick={() => deleteDept(dept.id)} className="p-1.5 rounded hover:bg-white/5" title="Elimina">
                        <Trash2 size={14} className="text-red-400/50 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== MANAGER ASSIGNMENT MODAL ==================== */}
      {managerDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="manager-modal">
          <div className="bg-[#0a0e12] border border-[#adff2f]/20 rounded-lg p-4 w-[420px] space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Direttori - {managerDept.name}</h3>
                <p className="text-[0.625rem] text-[#7f9aa3]">Assegna chi puo' creare bandi e gestire candidature</p>
              </div>
              <button onClick={() => setManagerDept(null)} className="text-[#7f9aa3] hover:text-white text-lg">&times;</button>
            </div>

            {/* Current Managers */}
            <div className="space-y-1">
              <p className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Direttori assegnati</p>
              {managers.length === 0 ? (
                <p className="text-[#4a6670] text-xs py-2">Nessun direttore assegnato manualmente</p>
              ) : managers.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-[#060a0d] border border-[#1b2a30] rounded p-2">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-[#adff2f]" />
                    <span className="text-sm text-white">{m.game_name}</span>
                    <span className="text-[0.5rem] text-[#4a6670]">{m.sector}</span>
                  </div>
                  <button onClick={() => removeManager(m.user_id)}
                    className="text-red-400/50 hover:text-red-400" data-testid={`remove-mgr-${m.user_id}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Search & Add */}
            <div className="space-y-2">
              <p className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Aggiungi direttore</p>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6670]" />
                <input value={searchQuery} onChange={e => searchUsers(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                  placeholder="Cerca per nome o email..." data-testid="search-user-input" />
              </div>
              {searching && <p className="text-[#4a6670] text-xs">Cercando...</p>}
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-[#060a0d] border border-[#1b2a30] rounded p-2">
                  <div>
                    <span className="text-sm text-white">{u.game_name}</span>
                    <span className="text-[0.5rem] text-[#4a6670] ml-2">{u.sector} - {u.email}</span>
                  </div>
                  <button onClick={() => addManager(u.id)}
                    className="px-2 py-1 bg-[#adff2f]/10 text-[#adff2f] rounded text-[0.625rem] hover:bg-[#adff2f]/20"
                    data-testid={`add-mgr-${u.id}`}>
                    <UserPlus size={12} />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[0.5rem] text-[#4a6670] border-t border-[#1b2a30] pt-2">
              Nota: utenti con grado &ge; 8 nel settore {managerDept.code} o con ruolo "capo settore" sono direttori automatici.
            </p>
          </div>
        </div>
      )}

      {/* ==================== POSTINGS VIEW ==================== */}
      {view === 'postings' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => {
              setShowPostForm(!showPostForm);
              if (!showPostForm && !isAdmin) setPostDeptCode(userSector);
            }}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#adff2f]/10 border border-[#adff2f]/20 text-[#adff2f] text-xs font-bold hover:bg-[#adff2f]/20 transition-colors"
              data-testid="create-posting-btn">
              <Plus size={14} /> {showPostForm ? 'ANNULLA' : 'NUOVO BANDO'}
            </button>
          </div>

          {showPostForm && (
            <div className="bg-[#0a0e12] border border-[#adff2f]/10 rounded-lg p-4 space-y-3" data-testid="create-posting-form">
              <h2 className="text-sm font-bold text-[#adff2f]">Nuovo Bando</h2>
              {isAdmin ? (
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Dipartimento *</label>
                  <select value={postDeptCode} onChange={e => setPostDeptCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                    data-testid="posting-dept-select">
                    <option value="">Seleziona dipartimento...</option>
                    {departments.filter(d => d.active).map(d => (
                      <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-[#7f9aa3]">Dipartimento: <span className="text-[#adff2f] font-bold">{userSector}</span></p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Titolo *</label>
                  <input value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                    placeholder="Es: Agente di Polizia" data-testid="posting-title-input" />
                </div>
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Stipendio</label>
                  <input value={postForm.salary_range} onChange={e => setPostForm({...postForm, salary_range: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                    placeholder="$2000-$5000" />
                </div>
              </div>
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Descrizione *</label>
                <textarea value={postForm.description} onChange={e => setPostForm({...postForm, description: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-20 resize-none focus:border-[#adff2f]/30 outline-none"
                  placeholder="Descrivi la posizione..." data-testid="posting-desc-input" />
              </div>
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Requisiti</label>
                <textarea value={postForm.requirements} onChange={e => setPostForm({...postForm, requirements: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none focus:border-[#adff2f]/30 outline-none"
                  placeholder="Es: Livello minimo 5, patente B..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Posti</label>
                  <input type="number" min={1} value={postForm.max_slots} onChange={e => setPostForm({...postForm, max_slots: parseInt(e.target.value) || 1})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none" />
                </div>
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Luogo</label>
                  <input value={postForm.location} onChange={e => setPostForm({...postForm, location: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none" />
                </div>
                <div>
                  <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Priorita'</label>
                  <select value={postForm.priority} onChange={e => setPostForm({...postForm, priority: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none">
                    <option value="normal">Normale</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <button onClick={createPosting} disabled={submitting}
                className="px-4 py-2 bg-[#adff2f] text-[#060a0d] rounded font-bold text-xs hover:bg-[#c5ff5e] transition-colors disabled:opacity-50"
                data-testid="submit-posting-btn">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'PUBBLICA BANDO'}
              </button>
            </div>
          )}

          {/* Postings List */}
          {postings.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={32} className="mx-auto text-[#4a6670] mb-2" />
              <p className="text-[#7f9aa3] text-sm">Nessun bando</p>
              <p className="text-[#4a6670] text-xs">
                {isAdmin ? 'Crea un dipartimento prima, poi aggiungi i bandi' : 'Crea il primo bando per il tuo reparto'}
              </p>
            </div>
          ) : postings.map(posting => {
            const st = statusColors[posting.status] || statusColors.open;
            const pr = priorityColors[posting.priority] || priorityColors.normal;
            return (
              <div key={posting.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3 hover:border-[#adff2f]/10 transition-colors" data-testid={`posting-${posting.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (posting.dept_color || '#adff2f') + '15', border: `1px solid ${posting.dept_color || '#adff2f'}30` }}>
                      <Briefcase size={17} style={{ color: posting.dept_color || '#adff2f' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{posting.title}</h3>
                        <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-bold ${st.bg} ${st.text} ${st.border} border`}>{st.label}</span>
                        {posting.priority !== 'normal' && <span className={`text-[0.5rem] font-bold ${pr.text}`}>{pr.label}</span>}
                      </div>
                      <p className="text-[0.625rem] text-[#7f9aa3]">
                        <span style={{ color: posting.dept_color || '#adff2f' }}>{posting.dept_name || posting.dept_code}</span>
                        {' '}- {posting.location} - {posting.filled_slots}/{posting.max_slots} posti
                        {posting.creator_name && <span className="ml-2 text-[#4a6670]">di {posting.creator_name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => viewApplications(posting)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] text-[0.625rem] hover:bg-[#8b5cf6]/20"
                      data-testid={`view-apps-${posting.id}`}>
                      <Users size={12} /> {posting.total_applications || 0}
                    </button>
                    <button onClick={() => togglePostStatus(posting)} className="p-1.5 rounded hover:bg-white/5">
                      {posting.status === 'open' ? <PauseCircle size={14} className="text-yellow-400" /> : <PlayCircle size={14} className="text-[#adff2f]" />}
                    </button>
                    <button onClick={() => closePost(posting)} className="p-1.5 rounded hover:bg-white/5"><XCircle size={14} className="text-red-400" /></button>
                    <button onClick={() => deletePost(posting)} className="p-1.5 rounded hover:bg-white/5"><Trash2 size={14} className="text-red-400/50 hover:text-red-400" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== APPLICATIONS VIEW ==================== */}
      {view === 'applications' && selectedPosting && (
        <div className="space-y-3">
          <button onClick={() => { setView('postings'); setSelectedPosting(null); }}
            className="text-[#adff2f] text-xs hover:underline flex items-center gap-1" data-testid="back-to-postings">
            <ArrowLeft size={12} /> Torna ai bandi
          </button>
          <div className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3">
            <h2 className="text-sm font-bold text-white">{selectedPosting.title}</h2>
            <p className="text-[0.625rem] text-[#7f9aa3]">
              {selectedPosting.dept_name || selectedPosting.dept_code} - {applications.length} candidature
            </p>
          </div>
          {applications.length === 0 ? (
            <p className="text-[#4a6670] text-sm text-center py-8">Nessuna candidatura ricevuta</p>
          ) : applications.map(app => {
            const st = appStatusColors[app.status] || appStatusColors.pending;
            return (
              <div key={app.id} className="bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3" data-testid={`application-${app.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#adff2f]/10 flex items-center justify-center text-[#adff2f] text-xs font-bold">
                      {app.game_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{app.game_name}</p>
                      <p className="text-[0.5625rem] text-[#7f9aa3]">{app.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[0.625rem] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                    <button onClick={() => { setReviewModal(app); setReviewForm({ status: '', notes: '', interview_date: '' }); }}
                      className="px-2 py-1 rounded bg-[#adff2f]/10 text-[#adff2f] text-[0.625rem] hover:bg-[#adff2f]/20"
                      data-testid={`review-app-${app.id}`}>
                      Gestisci
                    </button>
                  </div>
                </div>
                <div className="mt-2 pl-11 text-xs text-[#c0cdd0] space-y-1">
                  <p><strong className="text-[#7f9aa3]">Motivazione:</strong> {app.motivation}</p>
                  {app.experience && <p><strong className="text-[#7f9aa3]">Esperienza:</strong> {app.experience}</p>}
                  {app.availability && <p><strong className="text-[#7f9aa3]">Disponibilita':</strong> {app.availability}</p>}
                  {app.reviewer_notes && <p className="text-[#adff2f]/70"><strong>Note staff:</strong> {app.reviewer_notes}</p>}
                  {app.interview_date && <p className="text-purple-400"><Calendar size={10} className="inline mr-1" />Colloquio: {app.interview_date}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== REVIEW MODAL ==================== */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="review-modal">
          <div className="bg-[#0a0e12] border border-[#adff2f]/20 rounded-lg p-4 w-96 space-y-3">
            <h3 className="text-sm font-bold text-white">Gestisci Candidatura - {reviewModal.game_name}</h3>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Stato</label>
              <select value={reviewForm.status} onChange={e => setReviewForm({...reviewForm, status: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none"
                data-testid="review-status-select">
                <option value="">Seleziona...</option>
                <option value="reviewing">In Revisione</option>
                <option value="interview">Colloquio</option>
                <option value="accepted">Accettato</option>
                <option value="rejected">Rifiutato</option>
              </select>
            </div>
            <div>
              <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Note</label>
              <textarea value={reviewForm.notes} onChange={e => setReviewForm({...reviewForm, notes: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white h-16 resize-none focus:border-[#adff2f]/30 outline-none" />
            </div>
            {reviewForm.status === 'interview' && (
              <div>
                <label className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">Data Colloquio</label>
                <input type="datetime-local" value={reviewForm.interview_date}
                  onChange={e => setReviewForm({...reviewForm, interview_date: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-[#060a0d] border border-[#1b2a30] rounded text-sm text-white focus:border-[#adff2f]/30 outline-none" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={reviewApplication}
                className="flex-1 px-3 py-2 bg-[#adff2f] text-[#060a0d] rounded text-xs font-bold hover:bg-[#c5ff5e]"
                data-testid="confirm-review-btn">CONFERMA</button>
              <button onClick={() => setReviewModal(null)}
                className="px-3 py-2 bg-[#1b2a30] text-[#7f9aa3] rounded text-xs hover:bg-[#243038]">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobsPage;
