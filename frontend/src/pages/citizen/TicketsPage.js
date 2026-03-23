import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Ticket, Plus, MessageSquare, Clock, CheckCircle, AlertTriangle, Send, ArrowLeft, User, Shield } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { value: 'generale', label: 'Generale' },
  { value: 'documenti', label: 'Documenti' },
  { value: 'multe', label: 'Multe & Sanzioni' },
  { value: 'lavoro', label: 'Lavoro' },
  { value: 'reclamo', label: 'Reclamo' },
  { value: 'altro', label: 'Altro' },
];

const STATUS_MAP = {
  open: { label: 'Aperto', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock },
  in_progress: { label: 'In Lavorazione', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: MessageSquare },
  resolved: { label: 'Risolto', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  closed: { label: 'Chiuso', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: CheckCircle },
};

const TicketsPage = ({ isStaff = false }) => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', category: 'generale', priority: 'normal' });

  const sector = user?.sector?.toUpperCase?.() || user?.sector || '';
  const effectiveStaff = isStaff || ['ADMIN', 'GOV', 'LSPD', 'EMS', 'DISPATCH'].includes(sector);

  const fetchTickets = async () => {
    try {
      const endpoint = effectiveStaff ? '/api/tickets/staff/all' : '/api/tickets/my';
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await axios.get(`${API}${endpoint}${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!effectiveStaff) return;
    try {
      const res = await axios.get(`${API}/api/tickets/staff/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch {}
  };

  useEffect(() => { if (token) { fetchTickets(); fetchStats(); } }, [token, statusFilter]);

  const openDetail = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketDetail(res.data);
      setSelectedTicket(ticketId);
    } catch (err) {
      alert('Errore nel caricamento del ticket');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/tickets/create`, newTicket, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreate(false);
      setNewTicket({ subject: '', message: '', category: 'generale', priority: 'normal' });
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/tickets/${selectedTicket}/reply`, { message: reply }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReply('');
      openDetail(selectedTicket);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/api/tickets/${ticketId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      openDetail(ticketId);
      fetchTickets();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore');
    }
  };

  // ============ DETAIL VIEW ============
  if (selectedTicket && ticketDetail) {
    const st = STATUS_MAP[ticketDetail.status] || STATUS_MAP.open;
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto" data-testid="ticket-detail">
        <button onClick={() => { setSelectedTicket(null); setTicketDetail(null); }} className="flex items-center gap-1 text-xs text-plos-text-secondary hover:text-white transition-colors">
          <ArrowLeft size={14} /> Torna alla lista
        </button>

        <div className="bg-plos-bg-secondary border border-plos-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-plos-text-muted">{ticketDetail.ticket_number}</span>
              <h2 className="text-lg font-bold text-white mt-1">{ticketDetail.subject}</h2>
              <p className="text-xs text-plos-text-secondary mt-1">
                Da: {ticketDetail.created_by_name} | Categoria: {ticketDetail.category} | {ticketDetail.created_at?.split('T')[0]}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-3 py-1 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
              {effectiveStaff && ticketDetail.status !== 'closed' && (
                <select value={ticketDetail.status} onChange={(e) => handleStatusChange(selectedTicket, e.target.value)} className="text-xs bg-plos-bg-primary border border-plos-border rounded px-2 py-1 text-white" data-testid="ticket-status-select">
                  <option value="open">Aperto</option>
                  <option value="in_progress">In Lavorazione</option>
                  <option value="resolved">Risolto</option>
                  <option value="closed">Chiuso</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {ticketDetail.messages?.map(msg => (
            <div key={msg.id} className={`rounded-lg p-3 ${msg.is_staff_reply ? 'bg-plos-primary/10 border border-plos-primary/30 ml-4' : 'bg-plos-bg-secondary border border-plos-border mr-4'}`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.is_staff_reply ? <Shield size={12} className="text-plos-primary" /> : <User size={12} className="text-plos-text-secondary" />}
                <span className="text-xs font-bold text-white">{msg.sender_name}</span>
                <span className="text-[10px] text-plos-text-muted">{msg.sender_sector}</span>
                <span className="text-[10px] text-plos-text-muted ml-auto">{msg.created_at?.replace('T', ' ').slice(0, 16)}</span>
              </div>
              <p className="text-sm text-plos-text-secondary whitespace-pre-wrap">{msg.message}</p>
            </div>
          ))}
        </div>

        {/* Reply */}
        {ticketDetail.status !== 'closed' && (
          <div className="flex gap-2">
            <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} placeholder="Scrivi una risposta..." className="flex-1 bg-plos-bg-secondary border border-plos-border rounded-lg px-4 py-2 text-sm text-white placeholder:text-plos-text-muted focus:border-plos-primary outline-none" data-testid="ticket-reply-input" />
            <button onClick={handleReply} disabled={sending || !reply.trim()} className="px-4 py-2 bg-plos-primary text-black rounded-lg text-sm font-bold hover:bg-plos-primary/80 disabled:opacity-50 flex items-center gap-1" data-testid="ticket-reply-send">
              <Send size={14} /> Invia
            </button>
          </div>
        )}
      </div>
    );
  }

  // ============ CREATE VIEW ============
  if (showCreate) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto" data-testid="ticket-create">
        <button onClick={() => setShowCreate(false)} className="flex items-center gap-1 text-xs text-plos-text-secondary hover:text-white transition-colors mb-4">
          <ArrowLeft size={14} /> Torna alla lista
        </button>
        <h2 className="text-lg font-bold text-white mb-4">Nuova Richiesta di Assistenza</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-plos-text-secondary block mb-1">Oggetto</label>
            <input value={newTicket.subject} onChange={e => setNewTicket({...newTicket, subject: e.target.value})} placeholder="Descrivi brevemente il problema" className="w-full bg-plos-bg-secondary border border-plos-border rounded-lg px-4 py-2 text-sm text-white focus:border-plos-primary outline-none" required data-testid="ticket-subject-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-plos-text-secondary block mb-1">Categoria</label>
              <select value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value})} className="w-full bg-plos-bg-secondary border border-plos-border rounded-lg px-4 py-2 text-sm text-white focus:border-plos-primary outline-none" data-testid="ticket-category-select">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-plos-text-secondary block mb-1">Priorita'</label>
              <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full bg-plos-bg-secondary border border-plos-border rounded-lg px-4 py-2 text-sm text-white focus:border-plos-primary outline-none" data-testid="ticket-priority-select">
                <option value="low">Bassa</option>
                <option value="normal">Normale</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-plos-text-secondary block mb-1">Messaggio</label>
            <textarea value={newTicket.message} onChange={e => setNewTicket({...newTicket, message: e.target.value})} placeholder="Descrivi il tuo problema in dettaglio..." rows={5} className="w-full bg-plos-bg-secondary border border-plos-border rounded-lg px-4 py-2 text-sm text-white focus:border-plos-primary outline-none resize-none" required data-testid="ticket-message-textarea" />
          </div>
          <button type="submit" disabled={sending} className="w-full py-2.5 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80 disabled:opacity-50" data-testid="ticket-submit-btn">
            {sending ? 'Invio...' : 'Invia Richiesta'}
          </button>
        </form>
      </div>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto" data-testid="tickets-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket size={22} /> {effectiveStaff ? 'Gestione Ticket' : 'Le Mie Richieste'}
          </h1>
          <p className="text-xs text-plos-text-secondary mt-1">
            {effectiveStaff ? 'Gestisci le richieste dei cittadini' : 'Assistenza e supporto'}
          </p>
        </div>
        {!effectiveStaff && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-plos-primary text-black text-xs font-bold rounded-lg hover:bg-plos-primary/80 flex items-center gap-1" data-testid="new-ticket-btn">
            <Plus size={14} /> Nuova Richiesta
          </button>
        )}
      </div>

      {/* Stats for staff */}
      {effectiveStaff && stats && (
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Aperti', value: stats.open, color: '#3b82f6' },
            { label: 'In Corso', value: stats.in_progress, color: '#f59e0b' },
            { label: 'Risolti', value: stats.resolved, color: '#22c55e' },
            { label: 'Chiusi', value: stats.closed, color: '#6b7280' },
            { label: 'Urgenti', value: stats.urgent, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="bg-plos-bg-secondary border border-plos-border rounded-lg p-2 text-center">
              <p className="text-lg font-bold" style={{color: s.color}}>{s.value}</p>
              <p className="text-[10px] text-plos-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={`px-3 py-1.5 text-xs rounded-md transition-all ${statusFilter === f ? 'bg-plos-primary text-black font-bold' : 'bg-plos-bg-secondary text-plos-text-secondary border border-plos-border'}`}>
            {f === '' ? 'Tutti' : (STATUS_MAP[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="text-center py-10 text-plos-text-secondary">Caricamento...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-plos-text-muted">
          <Ticket size={40} className="mx-auto mb-3 opacity-30" />
          <p>{effectiveStaff ? 'Nessun ticket trovato' : 'Non hai ancora aperto richieste'}</p>
          {!effectiveStaff && <button onClick={() => setShowCreate(true)} className="mt-3 text-plos-primary text-sm hover:underline">Apri la tua prima richiesta</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => {
            const st = STATUS_MAP[t.status] || STATUS_MAP.open;
            const StIcon = st.icon;
            return (
              <button key={t.id} onClick={() => openDetail(t.id)} className="w-full text-left bg-plos-bg-secondary border border-plos-border rounded-lg p-3 hover:border-plos-primary/50 transition-all" data-testid={`ticket-${t.ticket_number}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-plos-text-muted">{t.ticket_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex items-center gap-1`}><StIcon size={10} /> {st.label}</span>
                      {t.priority === 'urgent' && <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">URGENTE</span>}
                      {t.priority === 'high' && <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">ALTA</span>}
                    </div>
                    <p className="text-sm text-white mt-1 truncate">{t.subject}</p>
                    <p className="text-[10px] text-plos-text-muted mt-0.5">
                      {effectiveStaff ? `Da: ${t.creator_name}` : `Categoria: ${t.category}`}
                      {t.assigned_to_name && ` | Assegnato: ${t.assigned_to_name}`}
                    </p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="text-xs text-plos-text-muted">{t.message_count} msg</p>
                    {t.staff_replies > 0 && <p className="text-[10px] text-plos-primary">{t.staff_replies} risposta/e</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
