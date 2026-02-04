import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSound } from '../../context/SoundContext';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, ChevronRight, Clock, Droplet } from 'lucide-react';

export const PatientsListPage = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const res = await api.get(`/ems/patients?${params.toString()}`);
      setPatients(res.data);
    } catch (error) {
      console.error('Errore fetch pazienti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  return (
    <div className="space-y-6" data-testid="patients-list-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Users className="text-red-500" />
            GESTIONE PAZIENTI
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            {patients.length} pazienti registrati
          </p>
        </div>
        
        <button
          onClick={() => {
            play('click');
            navigate('/ems/patients/new');
          }}
          className="btn-tactical flex items-center gap-2"
          data-testid="new-patient-btn"
        >
          <Plus size={18} />
          NUOVO PAZIENTE
        </button>
      </div>

      {/* Search */}
      <div className="card-tactical p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, numero paziente, identificativo..."
              className="input-tactical w-full pl-10"
              data-testid="search-input"
            />
          </div>
          <button type="submit" className="btn-tactical">
            CERCA
          </button>
        </form>
      </div>

      {/* Patients List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
        ) : patients.length === 0 ? (
          <div className="card-tactical p-8 text-center">
            <Users className="mx-auto mb-4 text-plos-text-muted" size={48} />
            <p className="text-plos-text-secondary">Nessun paziente trovato</p>
            <button
              onClick={() => navigate('/ems/patients/new')}
              className="btn-tactical mt-4"
            >
              Registra il primo paziente
            </button>
          </div>
        ) : (
          patients.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                play('click');
                navigate(`/ems/patients/${p.id}`);
              }}
              className="card-tactical p-4 cursor-pointer group"
              data-testid={`patient-item-${p.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="mono text-xs text-red-500">{p.patient_number}</span>
                    {p.blood_type && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <Droplet size={12} />
                        {p.blood_type}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-lg">{p.name}</h3>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-plos-text-muted">
                    {p.phone_number && (
                      <span>Tel: <span className="text-plos-text-secondary">{p.phone_number}</span></span>
                    )}
                    {p.allergies && (
                      <span className="text-orange-500">Allergie presenti</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(p.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
                
                <ChevronRight className="text-plos-text-muted group-hover:text-plos-primary transition-colors" size={24} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientsListPage;
