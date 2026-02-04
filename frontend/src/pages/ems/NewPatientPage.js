import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { Users, ArrowLeft, Save, Loader2 } from 'lucide-react';

export const NewPatientPage = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    date_of_birth: '',
    blood_type: '',
    allergies: '',
    medical_history: '',
    phone_number: '',
    emergency_contact: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      play('error');
      return;
    }
    
    try {
      setLoading(true);
      play('click');
      
      const payload = {
        ...form,
        date_of_birth: form.date_of_birth ? new Date(form.date_of_birth).toISOString() : null,
      };
      
      const res = await api.post('/ems/patients', payload);
      play('success');
      navigate(`/ems/patients/${res.data.id}`);
    } catch (error) {
      play('error');
      console.error('Errore creazione paziente:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="new-patient-page">
      {/* Header */}
      <div>
        <button
          onClick={() => {
            play('click');
            navigate('/ems/patients');
          }}
          className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Torna ai pazienti</span>
        </button>
        
        <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <Users className="text-red-500" />
          NUOVO PAZIENTE
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-tactical p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              NOME COMPLETO *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-tactical w-full"
              placeholder="Nome e cognome"
              required
              data-testid="patient-name-input"
            />
          </div>
          
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              IDENTIFICATIVO
            </label>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              className="input-tactical w-full"
              placeholder="ID FiveM / Codice Fiscale"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              DATA DI NASCITA
            </label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              className="input-tactical w-full"
            />
          </div>
          
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              GRUPPO SANGUIGNO
            </label>
            <select
              value={form.blood_type}
              onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
              className="input-tactical w-full"
            >
              <option value="">Seleziona...</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="0+">0+</option>
              <option value="0-">0-</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
            ALLERGIE
          </label>
          <textarea
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            className="input-tactical w-full min-h-[80px]"
            placeholder="Elenco allergie conosciute"
          />
        </div>

        <div>
          <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
            STORIA CLINICA
          </label>
          <textarea
            value={form.medical_history}
            onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
            className="input-tactical w-full min-h-[100px]"
            placeholder="Condizioni mediche pregresse, interventi, etc."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              TELEFONO
            </label>
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="input-tactical w-full"
              placeholder="+1 234 567 8900"
            />
          </div>
          
          <div>
            <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-2">
              CONTATTO EMERGENZA
            </label>
            <input
              type="text"
              value={form.emergency_contact}
              onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
              className="input-tactical w-full"
              placeholder="Nome e numero"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t border-plos-border">
          <button
            type="button"
            onClick={() => navigate('/ems/patients')}
            className="px-4 py-2 border border-plos-border text-plos-text-secondary hover:border-plos-text-secondary"
          >
            ANNULLA
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-tactical flex items-center gap-2"
            data-testid="submit-patient-btn"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                REGISTRAZIONE...
              </>
            ) : (
              <>
                <Save size={18} />
                REGISTRA PAZIENTE
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPatientPage;
