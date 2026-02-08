/**
 * LSPD - New Fine Page
 * Pagina dedicata per creare una nuova multa
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Receipt, ArrowLeft, DollarSign, User, FileText, AlertCircle } from 'lucide-react';

const NewFinePage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    citizen_name: '',
    citizen_identifier: '',
    reason: '',
    amount: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.citizen_name.trim()) newErrors.citizen_name = 'Nome cittadino richiesto';
    if (!form.citizen_identifier.trim()) newErrors.citizen_identifier = 'ID cittadino richiesto';
    if (!form.reason.trim()) newErrors.reason = 'Motivazione richiesta';
    if (!form.amount || parseFloat(form.amount) <= 0) newErrors.amount = 'Importo valido richiesto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/lspd/fines', {
        ...form,
        amount: parseFloat(form.amount)
      });
      toast.success('Multa emessa con successo');
      navigate('/lspd/fines');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione della multa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" data-testid="new-fine-page">
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
          <div className="p-2 bg-red-500/20 border border-red-500/50 rounded">
            <Receipt className="text-red-500" size={24} />
          </div>
          NUOVA MULTA
        </h1>
        <p className="text-plos-text-secondary text-sm mt-2">
          Emetti una nuova sanzione amministrativa
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-tactical p-6 space-y-4">
          {/* Citizen Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <User size={14} />
              NOME CITTADINO *
            </label>
            <input
              type="text"
              value={form.citizen_name}
              onChange={(e) => setForm({ ...form, citizen_name: e.target.value })}
              className={`w-full bg-plos-bg border ${errors.citizen_name ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors`}
              placeholder="Nome e cognome del cittadino"
              data-testid="fine-citizen-name"
            />
            {errors.citizen_name && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.citizen_name}
              </p>
            )}
          </div>

          {/* Citizen ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <FileText size={14} />
              ID CITTADINO *
            </label>
            <input
              type="text"
              value={form.citizen_identifier}
              onChange={(e) => setForm({ ...form, citizen_identifier: e.target.value })}
              className={`w-full bg-plos-bg border ${errors.citizen_identifier ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors`}
              placeholder="Codice identificativo"
              data-testid="fine-citizen-id"
            />
            {errors.citizen_identifier && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.citizen_identifier}
              </p>
            )}
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
              placeholder="Descrivi la violazione commessa"
              data-testid="fine-reason"
            />
            {errors.reason && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.reason}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm font-heading text-plos-text-secondary mb-2">
              <DollarSign size={14} />
              IMPORTO (€) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={`w-full bg-plos-bg border ${errors.amount ? 'border-red-500' : 'border-plos-border'} rounded px-4 py-3 focus:border-plos-primary focus:outline-none transition-colors`}
              placeholder="0.00"
              data-testid="fine-amount"
            />
            {errors.amount && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.amount}
              </p>
            )}
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
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-heading flex items-center justify-center gap-2"
            data-testid="fine-submit"
          >
            {loading ? (
              <span className="animate-pulse">ELABORAZIONE...</span>
            ) : (
              <>
                <Receipt size={18} />
                EMETTI MULTA
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewFinePage;
