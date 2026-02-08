/**
 * LSPD - New Warrant Page
 * Pagina dedicata per creare un nuovo mandato
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, User, FileText, AlertCircle, Calendar } from 'lucide-react';

const NewWarrantPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    suspect_name: '',
    suspect_identifier: '',
    reason: '',
    warrant_type: 'arrest',
    expires_at: '',
  });
  const [errors, setErrors] = useState({});

  const warrantTypes = [
    { value: 'arrest', label: 'Arresto' },
    { value: 'search', label: 'Perquisizione' },
    { value: 'seizure', label: 'Sequestro' },
    { value: 'surveillance', label: 'Sorveglianza' },
  ];

  const validate = () => {
    const newErrors = {};
    if (!form.suspect_name.trim()) newErrors.suspect_name = 'Nome sospetto richiesto';
    if (!form.suspect_identifier.trim()) newErrors.suspect_identifier = 'ID sospetto richiesto';
    if (!form.reason.trim()) newErrors.reason = 'Motivazione richiesta';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null
      };
      await api.post('/lspd/warrants', payload);
      toast.success('Mandato creato con successo');
      navigate('/lspd/warrants');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione del mandato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" data-testid="new-warrant-page">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-plos-text-muted hover:text-plos-primary transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Indietro</span>
        </button>
        
        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 border border-orange-500/50 rounded">
            <AlertTriangle className="text-orange-500" size={24} />
          </div>
          NUOVO MANDATO
        </h1>
        <p className="text-plos-text-secondary text-sm mt-2">
          Emetti un nuovo mandato di ricerca o arresto
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-tactical p-6 space-y-4">
          {/* Suspect Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <User size={14} />
              NOME SOSPETTO *
            </label>
            <input
              type="text"
              value={form.suspect_name}
              onChange={(e) => setForm({ ...form, suspect_name: e.target.value })}
              className={`w-full bg-plos-bg border ${errors.suspect_name ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors`}
              placeholder="Nome e cognome del sospetto"
              data-testid="warrant-suspect-name"
            />
            {errors.suspect_name && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.suspect_name}
              </p>
            )}
          </div>

          {/* Suspect ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <FileText size={14} />
              ID SOSPETTO *
            </label>
            <input
              type="text"
              value={form.suspect_identifier}
              onChange={(e) => setForm({ ...form, suspect_identifier: e.target.value })}
              className={`w-full bg-plos-bg border ${errors.suspect_identifier ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors`}
              placeholder="Codice identificativo"
              data-testid="warrant-suspect-id"
            />
            {errors.suspect_identifier && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.suspect_identifier}
              </p>
            )}
          </div>

          {/* Warrant Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <AlertTriangle size={14} />
              TIPO MANDATO
            </label>
            <select
              value={form.warrant_type}
              onChange={(e) => setForm({ ...form, warrant_type: e.target.value })}
              className="w-full bg-plos-bg border border-plos-border rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors"
              data-testid="warrant-type"
            >
              {warrantTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <FileText size={14} />
              MOTIVAZIONE *
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              className={`w-full bg-plos-bg border ${errors.reason ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors resize-none`}
              placeholder="Descrivi le ragioni del mandato"
              data-testid="warrant-reason"
            />
            {errors.reason && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.reason}
              </p>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <Calendar size={14} />
              SCADENZA (opzionale)
            </label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full bg-plos-bg border border-plos-border rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors"
              data-testid="warrant-expires"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-plos-border hover:border-plos-text-muted transition-colors font-heading"
          >
            ANNULLA
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-heading flex items-center justify-center gap-2"
            data-testid="warrant-submit"
          >
            {loading ? (
              <span className="animate-pulse">ELABORAZIONE...</span>
            ) : (
              <>
                <AlertTriangle size={18} />
                CREA MANDATO
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewWarrantPage;
