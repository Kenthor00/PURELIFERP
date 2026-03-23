/**
 * PURE LIFE OS - Agenda Page
 * Calendario appuntamenti con vista settimana/mese
 * Reminder system + Discord webhook
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNUI, useWaypoint } from '../context/NUIContext';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronLeft, ChevronRight,
  X, Save, Bell, Users, FileText, Navigation, Check, Trash2
} from 'lucide-react';

const APPOINTMENT_TYPES = [
  { value: 'meeting', label: 'Riunione', color: '#3B82F6' },
  { value: 'hearing', label: 'Udienza', color: '#8B5CF6' },
  { value: 'medical', label: 'Visita Medica', color: '#EF4444' },
  { value: 'interview', label: 'Colloquio', color: '#F59E0B' },
  { value: 'training', label: 'Formazione', color: '#10B981' },
  { value: 'inspection', label: 'Ispezione', color: '#06B6D4' },
  { value: 'other', label: 'Altro', color: '#6B7280' },
];

const STATUS_COLORS = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  confirmed: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTHS_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const AgendaPage = () => {
  const { api, user } = useAuth();
  const { isNUI } = useNUI();
  const { setMapWaypoint } = useWaypoint();
  
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    appointment_type: 'meeting',
    scheduled_at: '',
    scheduled_time: '',
    duration_minutes: 60,
    location: '',
    location_coords_x: null,
    location_coords_y: null,
    participant_ids: [],
    reminder_settings: { t_24h: true, t_1h: true, t_15m: true },
    discord_webhook_url: '',
    notes: '',
    is_private: false,
    color: null
  });
  const [saving, setSaving] = useState(false);

  // Fetch appointments
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let endpoint = '/appointments';
      
      if (viewMode === 'week') {
        endpoint = '/appointments/week';
      } else {
        endpoint = `/appointments/calendar/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`;
      }
      
      const res = await api.get(endpoint);
      
      if (viewMode === 'week') {
        // Flatten week data
        const weekData = res.data.days || {};
        const flatAppointments = Object.entries(weekData).flatMap(([date, apts]) => 
          apts.map(apt => ({ ...apt, date }))
        );
        setAppointments(flatAppointments);
      } else {
        // Flatten month data
        const monthData = res.data.days || {};
        const flatAppointments = Object.entries(monthData).flatMap(([date, apts]) => 
          apts.map(apt => ({ ...apt, date }))
        );
        setAppointments(flatAppointments);
      }
    } catch (error) {
      console.error('Errore fetch appointments:', error);
      toast.error('Errore nel caricamento appuntamenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [viewMode, currentDate]);

  // Navigation
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week days for header
  const getWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start from Monday
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [currentDate]);

  // Modal handlers
  const openNewModal = (date = null) => {
    const now = date || new Date();
    setFormData({
      title: '',
      description: '',
      appointment_type: 'meeting',
      scheduled_at: now.toISOString().split('T')[0],
      scheduled_time: '10:00',
      duration_minutes: 60,
      location: '',
      location_coords_x: null,
      location_coords_y: null,
      participant_ids: [],
      reminder_settings: { t_24h: true, t_1h: true, t_15m: true },
      discord_webhook_url: '',
      notes: '',
      is_private: false,
      color: null
    });
    setEditingAppointment(null);
    setShowModal(true);
  };

  const openEditModal = (apt) => {
    const scheduledAt = new Date(apt.scheduled_at);
    setFormData({
      title: apt.title,
      description: apt.description || '',
      appointment_type: apt.appointment_type || 'meeting',
      scheduled_at: scheduledAt.toISOString().split('T')[0],
      scheduled_time: scheduledAt.toTimeString().slice(0, 5),
      duration_minutes: apt.duration_minutes || 60,
      location: apt.location || '',
      location_coords_x: apt.location_coords_x,
      location_coords_y: apt.location_coords_y,
      participant_ids: apt.participant_ids || [],
      reminder_settings: apt.reminder_settings || { t_24h: true, t_1h: true, t_15m: true },
      discord_webhook_url: apt.discord_webhook_url || '',
      notes: apt.notes || '',
      is_private: apt.is_private || false,
      color: apt.color
    });
    setEditingAppointment(apt);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.scheduled_at || !formData.scheduled_time) {
      toast.error('Compila titolo, data e ora');
      return;
    }

    setSaving(true);
    try {
      const scheduledAt = `${formData.scheduled_at}T${formData.scheduled_time}:00Z`;
      
      const payload = {
        title: formData.title,
        description: formData.description || null,
        appointment_type: formData.appointment_type,
        scheduled_at: scheduledAt,
        duration_minutes: formData.duration_minutes,
        location: formData.location || null,
        location_coords_x: formData.location_coords_x,
        location_coords_y: formData.location_coords_y,
        participant_ids: formData.participant_ids.length > 0 ? formData.participant_ids : null,
        reminder_settings: formData.reminder_settings,
        discord_webhook_url: formData.discord_webhook_url || null,
        notes: formData.notes || null,
        is_private: formData.is_private,
        color: formData.color
      };

      if (editingAppointment) {
        await api.put(`/appointments/${editingAppointment.id}`, payload);
        toast.success('Appuntamento aggiornato');
      } else {
        await api.post('/appointments', payload);
        toast.success('Appuntamento creato');
      }

      setShowModal(false);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (aptId) => {
    if (!window.confirm('Sei sicuro di voler cancellare questo appuntamento?')) return;
    
    try {
      await api.delete(`/appointments/${aptId}`);
      toast.success('Appuntamento cancellato');
      setShowModal(false);
      fetchAppointments();
    } catch (error) {
      toast.error('Errore nella cancellazione');
    }
  };

  // Set waypoint in FiveM
  const handleSetWaypoint = (apt) => {
    if (apt.location_coords_x && apt.location_coords_y) {
      setMapWaypoint({ x: apt.location_coords_x, y: apt.location_coords_y }, apt.location);
      toast.success('Waypoint impostato sulla mappa');
    } else {
      toast.info('Coordinate non disponibili per questo appuntamento');
    }
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateStr);
  };

  // Get type color
  const getTypeColor = (type) => {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.color || '#6B7280';
  };

  return (
    <div className="space-y-6" data-testid="agenda-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <CalendarIcon className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              AGENDA <span className="text-purple-400">APPUNTAMENTI</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              {MONTHS_IT[currentDate.getMonth()]} {currentDate.getFullYear()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-plos-surface border border-plos-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-heading ${viewMode === 'week' ? 'bg-plos-primary/20 text-plos-primary' : 'text-plos-text-secondary'}`}
            >
              SETTIMANA
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-heading ${viewMode === 'month' ? 'bg-plos-primary/20 text-plos-primary' : 'text-plos-text-secondary'}`}
            >
              MESE
            </button>
          </div>

          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm"
            data-testid="new-appointment-btn"
          >
            <Plus size={18} />
            NUOVO
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevious} className="p-2 hover:bg-plos-surface rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToToday} className="px-3 py-1.5 bg-plos-surface border border-plos-border rounded-lg text-sm">
            Oggi
          </button>
          <button onClick={goToNext} className="p-2 hover:bg-plos-surface rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <span className="text-plos-text-secondary text-sm">
          {appointments.length} appuntamenti
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-plos-surface border border-plos-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-plos-text-muted">Caricamento...</div>
        ) : viewMode === 'week' ? (
          /* Week View */
          <div className="grid grid-cols-7">
            {/* Header */}
            {getWeekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={i} className={`p-3 text-center border-b border-r border-plos-border/30 ${isToday ? 'bg-plos-primary/10' : ''}`}>
                  <div className="text-xs text-plos-text-muted">{DAYS_IT[i]}</div>
                  <div className={`text-lg font-heading ${isToday ? 'text-plos-primary' : ''}`}>{day.getDate()}</div>
                </div>
              );
            })}
            
            {/* Day columns */}
            {getWeekDays.map((day, i) => {
              const dayApts = getAppointmentsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={`col-${i}`} 
                  className={`min-h-[200px] border-r border-plos-border/30 p-2 ${isToday ? 'bg-plos-primary/5' : ''}`}
                  onClick={() => openNewModal(day)}
                >
                  {dayApts.map(apt => (
                    <div
                      key={apt.id}
                      onClick={(e) => { e.stopPropagation(); openEditModal(apt); }}
                      className="mb-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${getTypeColor(apt.appointment_type)}20`, borderLeft: `3px solid ${getTypeColor(apt.appointment_type)}` }}
                    >
                      <p className="text-xs font-medium truncate">{apt.title}</p>
                      <p className="text-[10px] text-plos-text-muted">
                        {new Date(apt.scheduled_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* Month View */
          <div className="grid grid-cols-7 gap-px bg-plos-border/30">
            {/* Header */}
            {DAYS_IT.map(day => (
              <div key={day} className="bg-plos-surface p-2 text-center text-xs text-plos-text-muted font-heading">
                {day}
              </div>
            ))}
            
            {/* Days */}
            {Array.from({ length: 42 }, (_, i) => {
              const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
              const dayNum = i - startOffset + 1;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const dayApts = getAppointmentsForDate(date);
              
              return (
                <div
                  key={i}
                  onClick={() => isCurrentMonth && openNewModal(date)}
                  className={`bg-plos-surface min-h-[80px] p-1 cursor-pointer hover:bg-plos-primary/5 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`text-xs mb-1 ${isToday ? 'w-6 h-6 rounded-full bg-plos-primary text-white flex items-center justify-center' : 'text-plos-text-secondary'}`}>
                    {date.getDate()}
                  </div>
                  {dayApts.slice(0, 2).map(apt => (
                    <div
                      key={apt.id}
                      onClick={(e) => { e.stopPropagation(); openEditModal(apt); }}
                      className="text-[10px] truncate p-0.5 rounded mb-0.5"
                      style={{ backgroundColor: `${getTypeColor(apt.appointment_type)}30`, color: getTypeColor(apt.appointment_type) }}
                    >
                      {apt.title}
                    </div>
                  ))}
                  {dayApts.length > 2 && (
                    <div className="text-[10px] text-plos-text-muted">+{dayApts.length - 2}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-plos-surface border border-plos-border rounded-xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-bold">
                {editingAppointment ? 'MODIFICA APPUNTAMENTO' : 'NUOVO APPUNTAMENTO'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1">
                <X size={20} className="text-plos-text-muted" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Title */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">TITOLO *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                  placeholder="Titolo appuntamento"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">TIPO</label>
                <select
                  value={formData.appointment_type}
                  onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                >
                  {APPOINTMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-plos-text-muted mb-1">DATA *</label>
                  <input
                    type="date"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-plos-text-muted mb-1">ORA *</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">DURATA (minuti)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">LUOGO</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                  placeholder="Es: Aula 1 - Tribunale"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">DESCRIZIONE</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white"
                  rows={2}
                />
              </div>

              {/* Discord Webhook */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-1 flex items-center gap-1">
                  <Bell size={12} /> DISCORD WEBHOOK (per reminder)
                </label>
                <input
                  type="url"
                  value={formData.discord_webhook_url}
                  onChange={(e) => setFormData({ ...formData, discord_webhook_url: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>

              {/* Reminder Settings */}
              <div>
                <label className="block text-xs text-plos-text-muted mb-2">REMINDER</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 't_24h', label: '24 ore prima' },
                    { key: 't_1h', label: '1 ora prima' },
                    { key: 't_15m', label: '15 min prima' },
                  ].map(r => (
                    <label key={r.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.reminder_settings[r.key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          reminder_settings: { ...formData.reminder_settings, [r.key]: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Private Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Appuntamento privato</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {editingAppointment && (
                <button
                  onClick={() => handleDelete(editingAppointment.id)}
                  className="p-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 rounded-lg text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              )}
              
              {editingAppointment && isNUI && editingAppointment.location_coords_x && (
                <button
                  onClick={() => handleSetWaypoint(editingAppointment)}
                  className="p-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 rounded-lg text-blue-400"
                  title="Imposta waypoint"
                >
                  <Navigation size={18} />
                </button>
              )}
              
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-plos-primary/20 border border-plos-primary/50 hover:bg-plos-primary/30 rounded-lg text-plos-primary font-heading flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {saving ? 'SALVATAGGIO...' : 'SALVA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaPage;
