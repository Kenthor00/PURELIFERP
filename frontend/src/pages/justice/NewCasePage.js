/**
 * Justice - New Case/Practice Page
 * Creazione nuova pratica giudiziaria
 * Campo "avvocato" invece di "attore"
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Scale, FileText, ArrowLeft, User } from 'lucide-react';

const NewCasePage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    case_type: 'CIVIL',
    lawyer_name: '',      // Avvocato (sostituisce attore)
    defendant_name: '',   // Convenuto/Imputato
    description: ''
  });

  const caseTypes = [
    { value: 'CIVIL', label: 'Causa Civile' },
    { value: 'CRIMINAL', label: 'Causa Penale' },
    { value: 'ADMINISTRATIVE', label: 'Pratica Amministrativa' },
    { value: 'APPEAL', label: 'Appello' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/justice/cases', {
        title: formData.title,
        case_type: formData.case_type,
        plaintiff_name: formData.lawyer_name, // Mappiamo a plaintiff per compatibilità
        defendant_name: formData.defendant_name,
        description: formData.description
      });
      toast.success('Pratica creata con successo');
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
          <Scale className="text-purple-500" />
          NUOVA PRATICA
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">TITOLO *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              placeholder="Titolo della pratica"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">TIPO PRATICA *</label>
            <select
              value={formData.case_type}
              onChange={(e) => setFormData({...formData, case_type: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              required
            >
              {caseTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1 flex items-center gap-1">
                <User size={14} />
                AVVOCATO
              </label>
              <input
                type="text"
                value={formData.lawyer_name}
                onChange={(e) => setFormData({...formData, lawyer_name: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                placeholder="Nome avvocato assegnato"
              />
            </div>
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">CONVENUTO/IMPUTATO</label>
              <input
                type="text"
                value={formData.defendant_name}
                onChange={(e) => setFormData({...formData, defendant_name: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                placeholder="Nome convenuto"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">DESCRIZIONE</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              rows={4}
              placeholder="Descrizione della pratica..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/justice')}
              className="flex-1 px-4 py-2 bg-plos-surface border border-plos-border rounded-lg hover:border-plos-text-muted transition-colors"
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
                  <FileText size={18} />
                  CREA PRATICA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCasePage;
