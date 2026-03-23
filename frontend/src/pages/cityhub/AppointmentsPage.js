import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  User,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AppointmentsPage = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('request');
  const [calendarView, setCalendarView] = useState('list'); // 'list' | 'week' | 'month'
  const [myRequests, setMyRequests] = useState([]);
  const [sectorAppointments, setSectorAppointments] = useState([]);
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    target_sector: '',
    subject: '',
    description: '',
    preferred_date: '',
    preferred_time: '',
    urgency: 'normal',
  });

  // Handle modal
  const [handleModal, setHandleModal] = useState(null);
  const [handleNotes, setHandleNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const userSector = user?.sector?.toUpperCase();
  const isAdmin = userSector === 'ADMIN';
  const canManage = isAdmin || ['LSPD', 'EMS', 'GOV', 'NEWS', 'DISPATCH'].includes(userSector);

  const sectors = [
    { value: 'LSPD', label: 'Los Santos Police Department' },
    { value: 'EMS', label: 'Emergency Medical Services' },
    { value: 'GOV', label: 'Governo' },
    { value: 'NEWS', label: 'Weazel News' },
    { value: 'DISPATCH', label: 'Dispatch Center' },
  ];

  useEffect(() => {
    if (activeTab === 'my-requests') {
      fetchMyRequests();
    } else if (activeTab === 'manage' && canManage) {
      fetchSectorAppointments();
      fetchStats();
    } else if (activeTab === 'calendar' && canManage) {
      fetchCalendar();
    }
  }, [activeTab]);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/appointments/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyRequests(res.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectorAppointments = async () => {
    setLoading(true);
    try {
      const sector = isAdmin ? 'LSPD' : userSector;
      const res = await axios.get(`${API_URL}/api/appointments/sector/${sector}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSectorAppointments(res.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const sector = isAdmin ? 'LSPD' : userSector;
      const res = await axios.get(`${API_URL}/api/appointments/calendar/${sector}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalendarAppointments(res.data || []);
    } catch (err) {
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/appointments/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.target_sector || !formData.subject || !formData.description) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/appointments/request`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Richiesta appuntamento inviata!');
      setFormData({
        target_sector: '',
        subject: '',
        description: '',
        preferred_date: '',
        preferred_time: '',
        urgency: 'normal',
      });
      setActiveTab('my-requests');
      fetchMyRequests();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'invio della richiesta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppointment = async (appointmentId, status) => {
    try {
      await axios.put(`${API_URL}/api/appointments/${appointmentId}/handle`, {
        status,
        notes: handleNotes,
        scheduled_date: scheduledDate || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Appuntamento ${status === 'accepted' ? 'accettato' : status === 'rejected' ? 'rifiutato' : 'completato'}`);
      setHandleModal(null);
      setHandleNotes('');
      setScheduledDate('');
      fetchSectorAppointments();
      fetchStats();
      if (activeTab === 'calendar') fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella gestione');
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await axios.post(`${API_URL}/api/appointments/${appointmentId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Appuntamento annullato');
      fetchMyRequests();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'annullamento');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'In Attesa' },
      accepted: { color: 'bg-lime-500/20 text-lime-400 border-lime-500/50', icon: CheckCircle, label: 'Accettato' },
      rejected: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle, label: 'Rifiutato' },
      completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: CheckCircle, label: 'Completato' },
      cancelled: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: XCircle, label: 'Annullato' },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border ${badge.color}`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'border-l-yellow-500 bg-yellow-500/5',
      accepted: 'border-l-lime-500 bg-lime-500/5',
      rejected: 'border-l-red-500 bg-red-500/5',
      completed: 'border-l-blue-500 bg-blue-500/5',
      cancelled: 'border-l-gray-500 bg-gray-500/5',
    };
    return colors[status] || colors.pending;
  };

  const getUrgencyBadge = (urgency) => {
    const badges = {
      low: 'text-lime-400 bg-lime-500/10',
      normal: 'text-yellow-400 bg-yellow-500/10',
      high: 'text-red-400 bg-red-500/10',
    };
    return <span className={`text-xs px-2 py-0.5 ${badges[urgency] || badges.normal}`}>{urgency?.toUpperCase()}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty slots for days before first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getAppointmentsForDay = (day) => {
    if (!day) return [];
    return calendarAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_date);
      return aptDate.toDateString() === day.toDateString();
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  return (
    <div className="min-h-screen tactical-bg p-6 pt-16" data-testid="appointments-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
            <Calendar className="text-plos-primary" size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">APPUNTAMENTI</h1>
            <p className="text-plos-text-secondary text-sm">Sistema di prenotazione appuntamenti governativi</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-plos-border pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('request')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'request'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-request"
          >
            <Send size={14} className="inline mr-2" />
            RICHIEDI
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`px-4 py-2 font-heading text-sm transition-colors ${
              activeTab === 'my-requests'
                ? 'bg-plos-primary text-black'
                : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
            }`}
            data-testid="tab-my-requests"
          >
            <FileText size={14} className="inline mr-2" />
            LE MIE RICHIESTE
          </button>
          {canManage && (
            <>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 font-heading text-sm transition-colors ${
                  activeTab === 'manage'
                    ? 'bg-plos-primary text-black'
                    : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
                }`}
                data-testid="tab-manage"
              >
                <Building2 size={14} className="inline mr-2" />
                GESTISCI
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 font-heading text-sm transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-plos-primary text-black'
                    : 'bg-plos-surface border border-plos-border hover:border-plos-primary'
                }`}
                data-testid="tab-calendar"
              >
                <CalendarDays size={14} className="inline mr-2" />
                CALENDARIO
              </button>
            </>
          )}
        </div>

        {/* Request Tab */}
        {activeTab === 'request' && (
          <div className="card-tactical p-6">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <Send className="text-plos-primary" size={18} />
              NUOVA RICHIESTA APPUNTAMENTO
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Dipartimento *
                  </label>
                  <select
                    value={formData.target_sector}
                    onChange={(e) => setFormData({ ...formData, target_sector: e.target.value })}
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="select-sector"
                  >
                    <option value="">Seleziona...</option>
                    {sectors.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Urgenza
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="select-urgency"
                  >
                    <option value="low">Bassa</option>
                    <option value="normal">Normale</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Oggetto *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Breve descrizione del motivo"
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                  data-testid="input-subject"
                />
              </div>

              <div>
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Descrizione dettagliata *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Spiega in dettaglio il motivo dell'appuntamento..."
                  className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none resize-none"
                  data-testid="input-description"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Data preferita
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-date"
                  />
                </div>

                <div>
                  <label className="block text-sm text-plos-text-secondary mb-2">
                    Fascia oraria preferita
                  </label>
                  <input
                    type="text"
                    value={formData.preferred_time}
                    onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })}
                    placeholder="Es: pomeriggio, sera, mattina"
                    className="w-full bg-plos-surface border border-plos-border p-3 focus:border-plos-primary outline-none"
                    data-testid="input-time"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-tactical w-full flex items-center justify-center gap-2"
                data-testid="btn-submit-appointment"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    INVIO IN CORSO...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    INVIA RICHIESTA
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
            ) : myRequests.length === 0 ? (
              <div className="card-tactical p-8 text-center">
                <Calendar className="mx-auto text-plos-text-muted mb-4" size={48} />
                <p className="text-plos-text-muted">Non hai richieste di appuntamento</p>
                <button onClick={() => setActiveTab('request')} className="btn-tactical mt-4">
                  Richiedi un appuntamento
                </button>
              </div>
            ) : (
              myRequests.map((apt) => (
                <div key={apt.id} className={`card-tactical p-4 border-l-4 ${getStatusColor(apt.status)}`} data-testid={`request-${apt.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-heading text-plos-primary">{apt.target_sector}</span>
                        {getStatusBadge(apt.status)}
                        {getUrgencyBadge(apt.urgency)}
                      </div>
                      <h3 className="font-medium mb-1">{apt.subject}</h3>
                      <p className="text-sm text-plos-text-secondary mb-2">{apt.description}</p>
                      {apt.scheduled_date && (
                        <p className="text-sm text-lime-400">
                          <CalendarDays size={14} className="inline mr-1" />
                          Confermato: {formatDate(apt.scheduled_date)}
                        </p>
                      )}
                      <p className="text-xs text-plos-text-muted mt-2">
                        Richiesto: {formatDate(apt.created_at)}
                      </p>
                    </div>
                    {(apt.status === 'pending' || apt.status === 'accepted') && (
                      <button
                        onClick={() => cancelAppointment(apt.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Annulla
                      </button>
                    )}
                  </div>
                  {apt.handler_notes && (
                    <div className="mt-3 p-3 bg-plos-surface/50 border-l-2 border-plos-primary">
                      <p className="text-xs text-plos-text-secondary">Note del gestore:</p>
                      <p className="text-sm">{apt.handler_notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && canManage && (
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-yellow-400">{stats.pending}</div>
                  <div className="text-xs text-plos-text-muted">In Attesa</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-lime-400">{stats.accepted}</div>
                  <div className="text-xs text-plos-text-muted">Accettati</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-blue-400">{stats.completed}</div>
                  <div className="text-xs text-plos-text-muted">Completati</div>
                </div>
                <div className="card-tactical p-4 text-center">
                  <div className="text-2xl font-heading text-red-400">{stats.rejected}</div>
                  <div className="text-xs text-plos-text-muted">Rifiutati</div>
                </div>
              </div>
            )}

            {/* Appointments List */}
            <div className="space-y-4">
              <h3 className="font-heading text-lg">RICHIESTE APPUNTAMENTI</h3>
              {loading ? (
                <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
              ) : sectorAppointments.length === 0 ? (
                <div className="card-tactical p-8 text-center">
                  <CheckCircle className="mx-auto text-lime-500 mb-4" size={48} />
                  <p className="text-plos-text-muted">Nessun appuntamento da gestire</p>
                </div>
              ) : (
                sectorAppointments.map((apt) => (
                  <div key={apt.id} className={`card-tactical p-4 border-l-4 ${getStatusColor(apt.status)}`} data-testid={`manage-apt-${apt.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User size={16} className="text-plos-primary" />
                          <span className="font-heading">{apt.requester_game_name}</span>
                          <span className="text-xs text-plos-text-muted">({apt.requester_sector})</span>
                          {getStatusBadge(apt.status)}
                          {getUrgencyBadge(apt.urgency)}
                        </div>
                        <h3 className="font-medium mb-1">{apt.subject}</h3>
                        <p className="text-sm text-plos-text-secondary mb-2">{apt.description}</p>
                        {apt.preferred_date && (
                          <p className="text-xs text-plos-text-muted">
                            Data preferita: {formatDate(apt.preferred_date)}
                            {apt.preferred_time && ` (${apt.preferred_time})`}
                          </p>
                        )}
                        <p className="text-xs text-plos-text-muted mt-1">
                          Richiesto: {formatDate(apt.created_at)}
                        </p>
                      </div>
                      {(apt.status === 'pending' || apt.status === 'accepted') && (
                        <div className="flex gap-2 ml-4">
                          {apt.status === 'pending' && (
                            <button
                              onClick={() => setHandleModal({ apt, action: 'accepted' })}
                              className="p-2 bg-lime-500/20 border border-lime-500/50 hover:bg-lime-500/30"
                              title="Accetta"
                            >
                              <CheckCircle size={16} className="text-lime-400" />
                            </button>
                          )}
                          {apt.status === 'accepted' && (
                            <button
                              onClick={() => setHandleModal({ apt, action: 'completed' })}
                              className="p-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30"
                              title="Completa"
                            >
                              <CheckCircle size={16} className="text-blue-400" />
                            </button>
                          )}
                          <button
                            onClick={() => setHandleModal({ apt, action: 'rejected' })}
                            className="p-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30"
                            title="Rifiuta"
                          >
                            <XCircle size={16} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && canManage && (
          <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarView('list')}
                  className={`p-2 ${calendarView === 'list' ? 'bg-plos-primary text-black' : 'border border-plos-border'}`}
                  title="Vista lista"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`p-2 ${calendarView === 'month' ? 'bg-plos-primary text-black' : 'border border-plos-border'}`}
                  title="Vista mensile"
                >
                  <Grid3X3 size={16} />
                </button>
              </div>
              
              {calendarView === 'month' && (
                <div className="flex items-center gap-4">
                  <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-plos-primary/10">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-heading text-lg">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-plos-primary/10">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* List View */}
            {calendarView === 'list' && (
              <div className="space-y-4">
                <h3 className="font-heading text-lg flex items-center gap-2">
                  <CalendarDays className="text-plos-primary" />
                  APPUNTAMENTI CONFERMATI
                </h3>
                {loading ? (
                  <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
                ) : calendarAppointments.length === 0 ? (
                  <div className="card-tactical p-8 text-center">
                    <Calendar className="mx-auto text-plos-text-muted mb-4" size={48} />
                    <p className="text-plos-text-muted">Nessun appuntamento in calendario</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {calendarAppointments.map((apt) => (
                      <div key={apt.id} className="card-tactical p-4 border-l-4 border-lime-500">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CalendarDays size={16} className="text-lime-400" />
                              <span className="font-heading text-lime-400">
                                {formatDate(apt.scheduled_date)}
                              </span>
                            </div>
                            <h3 className="font-medium">{apt.subject}</h3>
                            <p className="text-sm text-plos-text-secondary">
                              Con: {apt.requester_game_name} ({apt.requester_sector})
                            </p>
                          </div>
                          <button
                            onClick={() => setHandleModal({ apt, action: 'completed' })}
                            className="btn-tactical text-sm"
                          >
                            Completa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Month View */}
            {calendarView === 'month' && (
              <div className="card-tactical p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-xs text-plos-text-muted py-2 font-heading">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentDate).map((day, idx) => {
                    const dayAppointments = getAppointmentsForDay(day);
                    const isToday = day && day.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={idx} 
                        className={`min-h-[80px] p-1 border ${
                          day ? 'border-plos-border' : 'border-transparent'
                        } ${isToday ? 'bg-plos-primary/10' : ''}`}
                      >
                        {day && (
                          <>
                            <div className={`text-sm ${isToday ? 'text-plos-primary font-bold' : 'text-plos-text-muted'}`}>
                              {day.getDate()}
                            </div>
                            <div className="space-y-1 mt-1">
                              {dayAppointments.slice(0, 2).map(apt => (
                                <div 
                                  key={apt.id}
                                  className="text-[10px] p-1 bg-lime-500/20 text-lime-400 truncate"
                                  title={`${apt.subject} - ${apt.requester_game_name}`}
                                >
                                  {new Date(apt.scheduled_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ))}
                              {dayAppointments.length > 2 && (
                                <div className="text-[10px] text-plos-text-muted">
                                  +{dayAppointments.length - 2} altri
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handle Modal */}
      {handleModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border p-6 max-w-md w-full">
            <h3 className="font-heading text-lg mb-4">
              {handleModal.action === 'accepted' && 'ACCETTA APPUNTAMENTO'}
              {handleModal.action === 'rejected' && 'RIFIUTA APPUNTAMENTO'}
              {handleModal.action === 'completed' && 'COMPLETA APPUNTAMENTO'}
            </h3>
            <p className="text-sm text-plos-text-secondary mb-4">
              Richiesta di <strong>{handleModal.apt.requester_game_name}</strong>: {handleModal.apt.subject}
            </p>

            {handleModal.action === 'accepted' && (
              <div className="mb-4">
                <label className="block text-sm text-plos-text-secondary mb-2">
                  Data e ora appuntamento *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none"
                />
              </div>
            )}

            <textarea
              value={handleNotes}
              onChange={(e) => setHandleNotes(e.target.value)}
              rows={3}
              placeholder={handleModal.action === 'rejected' ? 'Motivo del rifiuto...' : 'Note (opzionale)...'}
              className="w-full bg-plos-background border border-plos-border p-3 focus:border-plos-primary outline-none resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setHandleModal(null);
                  setHandleNotes('');
                  setScheduledDate('');
                }}
                className="flex-1 px-4 py-2 border border-plos-border hover:border-plos-text-muted"
              >
                Annulla
              </button>
              <button
                onClick={() => handleAppointment(handleModal.apt.id, handleModal.action)}
                disabled={handleModal.action === 'accepted' && !scheduledDate}
                className={`flex-1 px-4 py-2 disabled:opacity-50 ${
                  handleModal.action === 'accepted' || handleModal.action === 'completed' ? 'bg-lime-600' : 'bg-red-600'
                }`}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
