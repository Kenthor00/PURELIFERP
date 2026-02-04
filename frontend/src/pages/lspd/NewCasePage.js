import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { FileText, ArrowLeft, Save, Loader2 } from 'lucide-react';

export const NewCasePage = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'normale',
    suspect_name: '',
    suspect_identifier: '',
    location: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      play('error');
      return;
    }
    
    try {
      setLoading(true);
      play('click');
      
      const res = await api.post('/lspd/cases', form);
      play('success');
      navigate(`/lspd/cases/${res.data.id}`);
    } catch (error) {
      play('error');
      console.error('Errore creazione caso:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="new-case-page">
      {/* Header */}
      <div>
        <button
          onClick={() => {
            play('click');
            navigate('/lspd/cases');
          }}
          className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Torna ai casi</span>
        </button>
        
        <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <FileText className="text-blue-500" />
          NUOVO CASO
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-tactical p-6 space-y-6">
        <div>
          <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
            TITOLO *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-tactical w-full"
            placeholder="Titolo del caso"
            required
            data-testid="case-title-input"
          />
        </div>

        <div>
          <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
            DESCRIZIONE
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-tactical w-full min-h-[120px]"
            placeholder="Descrizione dettagliata del caso"
            data-testid="case-description-input"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              PRIORITÀ
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="input-tactical w-full"
              data-testid="case-priority-select"
            >
              <option value="normale">Normale</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              LUOGO
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input-tactical w-full"
              placeholder="Luogo del crimine"
              data-testid="case-location-input"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              NOME SOSPETTO
            </label>
            <input
              type="text"
              value={form.suspect_name}
              onChange={(e) => setForm({ ...form, suspect_name: e.target.value })}
              className="input-tactical w-full"
              placeholder="Nome del sospetto"
              data-testid="case-suspect-input"
            />
          </div>
          
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              ID SOSPETTO
            </label>
            <input
              type="text"
              value={form.suspect_identifier}
              onChange={(e) => setForm({ ...form, suspect_identifier: e.target.value })}
              className="input-tactical w-full"
              placeholder="Identificativo"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-plos-border">
          <button
            type="button"
            onClick={() => navigate('/lspd/cases')}
            className="px-4 py-2 border border-plos-border text-plos-text-secondary hover:border-plos-text-secondary"
          >
            ANNULLA
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-tactical flex items-center gap-2"
            data-testid="submit-case-btn"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                CREAZIONE...
              </>
            ) : (
              <>
                <Save size={18} />
                CREA CASO
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewCasePage;
