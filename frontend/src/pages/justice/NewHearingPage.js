/**
 * Justice - New Hearing Page
 * Creazione nuova udienza
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Calendar, Gavel, ArrowLeft } from 'lucide-react';

const NewHearingPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [formData, setFormData] = useState({
    case_id: '',
    scheduled_date: '',
    scheduled_time: '',
    courtroom: '',
    hearing_type: 'FIRST_HEARING',
    notes: ''
  });

  const hearingTypes = [
    { value: 'FIRST_HEARING', label: 'Prima Udienza' },
    { value: 'CONTINUATION', label: 'Continuazione' },
    { value: 'SENTENCE', label: 'Sentenza' },
    { value: 'APPEAL', label: 'Appello' }
  ];

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await api.get('/justice/cases');
      setCases(res.data);
    } catch (error) {
      console.error('Errore caricamento casi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const scheduledAt = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
      await api.post('/justice/hearings', {
        case_id: parseInt(formData.case_id),
        scheduled_at: scheduledAt,
        courtroom: formData.courtroom,
        hearing_type: formData.hearing_type,
        notes: formData.notes
      });
      toast.success('Udienza programmata con successo');
      navigate('/justice');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/justice')}
        className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-6"
      >
        <ArrowLeft size={18} />
        Torna a Governo & Giustizia
      </button>

      <div className="glass-card rounded-xl p-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2 mb-6">
          <Gavel className="text-purple-500" />
          NUOVA UDIENZA
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">PRATICA *</label>
            <select
              value={formData.case_id}
              onChange={(e) => setFormData({...formData, case_id: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
              required
            >
              <option value="">Seleziona pratica...</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">DATA *</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">ORA *</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">AULA</label>
              <input
                type="text"
                value={formData.courtroom}
                onChange={(e) => setFormData({...formData, courtroom: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
                placeholder="Es: Aula 1"
              />
            </div>
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">TIPO UDIENZA</label>
              <select
                value={formData.hearing_type}
                onChange={(e) => setFormData({...formData, hearing_type: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
              >
                {hearingTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">NOTE</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg"
              rows={3}
              placeholder="Note aggiuntive..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/justice')}
              className="flex-1 px-4 py-2 bg-plos-surface rounded-lg"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-tactical flex items-center justify-center gap-2"
            >
              {loading ? 'Creazione...' : (
                <>
                  <Calendar size={18} />
                  PROGRAMMA UDIENZA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewHearingPage;
