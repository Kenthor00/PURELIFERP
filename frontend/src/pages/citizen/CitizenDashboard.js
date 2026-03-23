import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFiveMBridge } from '../../hooks/useFiveMBridge';
import axios from 'axios';
import { AlertTriangle, FileText, ShoppingBag, MessageSquare, Receipt, Scale, Ticket, Newspaper, Calendar, Megaphone, Briefcase, Link2, CheckCircle2, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ icon: Icon, label, value, sub, color, onClick }) => (
  <button onClick={onClick} className="bg-plos-bg-secondary border border-plos-border rounded-lg p-4 hover:border-plos-primary/50 transition-all text-left w-full" data-testid={`stat-${label.toLowerCase().replace(/\s/g,'-')}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{background: `${color}20`}}>
        <Icon size={20} style={{color}} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-plos-text-secondary">{label}</p>
        {sub && <p className="text-[10px] text-plos-text-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  </button>
);

const QuickLink = ({ icon: Icon, label, path, color }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-plos-bg-secondary border border-plos-border hover:border-plos-primary/50 transition-all" data-testid={`quick-${label.toLowerCase().replace(/\s/g,'-')}`}>
      <Icon size={22} style={{color}} />
      <span className="text-[11px] text-plos-text-secondary">{label}</span>
    </button>
  );
};

const CitizenDashboard = () => {
  const { user, token } = useAuth();
  const { isInFiveM, linkStatus, fivemIdentifier, autoLink } = useFiveMBridge();
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

  // Auto-link FiveM se in-game
  useEffect(() => {
    if (isInFiveM && token && user?.id && !fivemLinked?.linked) {
      autoLink(user.id, token);
    }
  }, [isInFiveM, token, user, fivemLinked, autoLink]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-plos-text-secondary">Caricamento...</div></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" data-testid="citizen-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-white">Benvenuto, {data?.game_name || user?.game_name || 'Cittadino'}</h1>
        <p className="text-sm text-plos-text-secondary mt-1">Il tuo riepilogo personale</p>
      </div>

      {/* FiveM Link Status */}
      {fivemLinked?.linked ? (
        <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 flex items-center gap-3" data-testid="fivem-linked">
          <CheckCircle2 className="text-lime-400 flex-shrink-0" size={18} />
          <div className="flex-1">
            <p className="text-lime-400 font-medium text-sm">Account FiveM Collegato</p>
            <p className="text-lime-300/60 text-xs">Riceverai le notifiche sul telefono in-game ({fivemLinked.identifier_preview || 'collegato'})</p>
          </div>
        </div>
      ) : linkStatus === 'linking' ? (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center gap-3" data-testid="fivem-linking">
          <Loader2 className="text-blue-400 flex-shrink-0 animate-spin" size={18} />
          <p className="text-blue-400 text-sm">Collegamento account FiveM in corso...</p>
        </div>
      ) : isInFiveM && linkStatus === 'linked' ? (
        <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 flex items-center gap-3" data-testid="fivem-just-linked">
          <CheckCircle2 className="text-lime-400 flex-shrink-0" size={18} />
          <p className="text-lime-400 font-medium text-sm">Account collegato! Le notifiche arriveranno sul telefono.</p>
        </div>
      ) : !fivemLinked?.linked ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3" data-testid="fivem-not-linked">
          <Link2 className="text-yellow-400 flex-shrink-0" size={18} />
          <div className="flex-1">
            <p className="text-yellow-400 font-medium text-sm">Account FiveM non collegato</p>
            <p className="text-yellow-300/60 text-xs">Accedi dal tablet in-game per collegare automaticamente il tuo personaggio e ricevere le notifiche.</p>
          </div>
        </div>
      ) : null}

      {/* Alert mandati */}
      {data?.warrants?.active_count > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
          <div>
            <p className="text-red-400 font-bold text-sm">ATTENZIONE: {data.warrants.active_count} mandato/i attivo/i!</p>
            <p className="text-red-300/70 text-xs">Hai dei mandati di ricerca attivi. Consulta la sezione mandati.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Receipt} label="Multe" value={data?.fines?.pending_count || 0} sub={data?.fines?.pending_total > 0 ? `$${data.fines.pending_total.toLocaleString()} da pagare` : 'Nessuna multa'} color="#f59e0b" onClick={() => navigate('/citizen/fines')} />
        <StatCard icon={Scale} label="Mandati" value={data?.warrants?.active_count || 0} sub={data?.warrants?.active_count > 0 ? 'Attivi' : 'Nessun mandato'} color="#ef4444" onClick={() => navigate('/citizen/warrants')} />
        <StatCard icon={Ticket} label="Ticket" value={data?.tickets?.open_count || 0} sub="Richieste aperte" color="#8b5cf6" onClick={() => navigate('/citizen/tickets')} />
        <StatCard icon={FileText} label="Documenti" value={data?.documents?.count || 0} sub="Registrati" color="#a78bfa" onClick={() => navigate('/documents')} />
        <StatCard icon={ShoppingBag} label="Annunci" value={data?.marketplace?.active_count || 0} sub="Nel marketplace" color="#f59e0b" onClick={() => navigate('/marketplace')} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-bold text-plos-text-secondary mb-3 uppercase tracking-wider">Servizi Rapidi</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
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
