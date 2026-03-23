import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFiveMBridge } from '../../hooks/useFiveMBridge';
import axios from 'axios';
import { AlertTriangle, FileText, ShoppingBag, MessageSquare, Receipt, Scale, Ticket, Newspaper, Calendar, Megaphone, Briefcase, Link2, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
  <button
    onClick={onClick}
    className="group relative bg-[#0a0e12] border border-[#1b2a30] rounded-lg p-3 hover:border-[#adff2f]/20 transition-all text-left w-full overflow-hidden"
    data-testid={`stat-${label.toLowerCase().replace(/\s/g,'-')}`}
  >
    {/* Glow on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{background: `radial-gradient(circle at 50% 50%, ${color}08, transparent 70%)`}} />
    <div className="relative flex items-center gap-3">
      <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{background: `${color}15`, border: `1px solid ${color}25`}}>
        <Icon size={17} style={{color}} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">{label}</p>
      </div>
    </div>
    {sub && <p className="relative text-[0.5625rem] text-[#4a6670] mt-2 pl-12">{sub}</p>}
  </button>
);

const QuickLink = ({ icon: Icon, label, path, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-[#0a0e12] border border-[#1b2a30] hover:border-[#adff2f]/20 transition-all w-full"
      data-testid={`quick-${label.toLowerCase().replace(/\s/g,'-')}`}
    >
      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{background: `${color}15`}}>
        <Icon size={14} style={{color}} />
      </div>
      <span className="text-[0.6875rem] text-[#c0cdd0] group-hover:text-white transition-colors">{label}</span>
      <ChevronRight size={12} className="ml-auto text-[#4a6670] group-hover:text-[#adff2f] transition-colors" />
    </button>
  );
};

const CitizenDashboard = () => {
  const { user, token } = useAuth();
  const { isInFiveM, linkStatus, autoLink } = useFiveMBridge();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fivemLinked, setFivemLinked] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, fivemRes] = await Promise.all([
          axios.get(`${API}/api/citizen/dashboard`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/auth/fivem-status`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: { linked: false } }))
        ]);
        setData(dashRes.data);
        setFivemLinked(fivemRes.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchDashboard();
  }, [token]);

  useEffect(() => {
    if (isInFiveM && token && user?.id && !fivemLinked?.linked) {
      autoLink(user.id, token);
    }
  }, [isInFiveM, token, user, fivemLinked, autoLink]);

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-3">
      <Loader2 className="w-5 h-5 text-[#adff2f] animate-spin" />
      <span className="text-[#7f9aa3] text-sm">Caricamento pannello...</span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl" data-testid="citizen-dashboard">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">
            Benvenuto, <span className="text-[#adff2f]">{data?.game_name || user?.game_name || 'Cittadino'}</span>
          </h1>
          <p className="text-[0.6875rem] text-[#7f9aa3] mt-0.5">Il tuo riepilogo personale</p>
        </div>
        {/* Connection badge */}
        {fivemLinked?.linked ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#adff2f]/10 border border-[#adff2f]/20" data-testid="fivem-linked">
            <div className="w-1.5 h-1.5 rounded-full bg-[#adff2f] shadow-[0_0_4px_#adff2f]" />
            <span className="text-[0.5625rem] text-[#adff2f] font-bold tracking-wider">IN-GAME</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20" data-testid="fivem-not-linked">
            <Link2 size={10} className="text-yellow-400" />
            <span className="text-[0.5625rem] text-yellow-400/80 tracking-wider">NON COLLEGATO</span>
          </div>
        )}
      </div>

      {/* FiveM Link Banner - only if not linked */}
      {linkStatus === 'linking' && (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center gap-2" data-testid="fivem-linking">
          <Loader2 className="text-blue-400 flex-shrink-0 animate-spin" size={14} />
          <p className="text-blue-400 text-xs">Collegamento account FiveM...</p>
        </div>
      )}
      {!fivemLinked?.linked && linkStatus !== 'linking' && (
        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2 flex items-center gap-2">
          <Link2 className="text-yellow-400/70 flex-shrink-0" size={14} />
          <p className="text-yellow-300/60 text-xs">Accedi dal tablet in-game per collegare il personaggio e ricevere notifiche.</p>
        </div>
      )}

      {/* Warrant Alert */}
      {data?.warrants?.active_count > 0 && (
        <div className="bg-red-500/8 border border-red-500/30 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
          <div>
            <p className="text-red-400 font-bold text-xs">{data.warrants.active_count} MANDATO/I ATTIVO/I</p>
            <p className="text-red-300/50 text-[0.625rem]">Consulta la sezione mandati.</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2.5">
        <StatCard icon={Receipt} label="Multe" value={data?.fines?.pending_count || 0} sub={data?.fines?.pending_total > 0 ? `$${data.fines.pending_total.toLocaleString()} da pagare` : null} color="#f59e0b" onClick={() => navigate('/citizen/fines')} />
        <StatCard icon={Scale} label="Mandati" value={data?.warrants?.active_count || 0} color="#ef4444" onClick={() => navigate('/citizen/warrants')} />
        <StatCard icon={Ticket} label="Ticket" value={data?.tickets?.open_count || 0} sub="Aperti" color="#8b5cf6" onClick={() => navigate('/citizen/tickets')} />
        <StatCard icon={FileText} label="Documenti" value={data?.documents?.count || 0} color="#a78bfa" onClick={() => navigate('/documents')} />
        <StatCard icon={ShoppingBag} label="Annunci" value={data?.marketplace?.active_count || 0} color="#f59e0b" onClick={() => navigate('/marketplace')} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-[0.625rem] font-bold text-[#adff2f]/40 mb-2 uppercase tracking-[0.2em]">Servizi Rapidi</h2>
        <div className="grid grid-cols-4 gap-2">
          <QuickLink icon={Receipt} label="Multe" path="/citizen/fines" color="#f59e0b" />
          <QuickLink icon={Scale} label="Mandati" path="/citizen/warrants" color="#ef4444" />
          <QuickLink icon={Ticket} label="Assistenza" path="/citizen/tickets" color="#8b5cf6" />
          <QuickLink icon={Newspaper} label="News" path="/citizen/news" color="#eab308" />
          <QuickLink icon={Briefcase} label="Lavoro" path="/city/recruitment" color="#22d3ee" />
          <QuickLink icon={Calendar} label="Appuntamenti" path="/city/appointments" color="#10b981" />
          <QuickLink icon={Megaphone} label="Annunci" path="/city/announcements" color="#06b6d4" />
          <QuickLink icon={MessageSquare} label="Chat" path="/chat" color="#06b6d4" />
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
