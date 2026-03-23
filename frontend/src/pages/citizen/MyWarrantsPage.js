import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Scale, AlertTriangle, Shield, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MyWarrantsPage = () => {
  const { token } = useAuth();
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/api/citizen/warrants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setWarrants(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetch();
  }, [token]);

  const active = warrants.filter(w => w.is_active);

  return (
    <div className="space-y-4 max-w-4xl" data-testid="my-warrants-page">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Scale size={22} /> I Miei Mandati</h1>
        <p className="text-xs text-plos-text-secondary mt-1">Controlla se hai mandati attivi</p>
      </div>

      {active.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
          <div>
            <p className="text-red-400 font-bold text-sm">{active.length} mandato/i attivo/i</p>
            <p className="text-red-300/60 text-xs">Contatta le autorita' competenti per risolvere la situazione.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-plos-text-secondary">Caricamento...</div>
      ) : warrants.length === 0 ? (
        <div className="text-center py-16 text-plos-text-muted">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nessun mandato trovato - Sei in regola!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {warrants.map(w => (
            <div key={w.id} className={`bg-plos-bg-secondary border rounded-lg p-4 ${w.is_active ? 'border-red-500/40' : 'border-plos-border'}`} data-testid={`warrant-${w.warrant_number}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-plos-text-muted">{w.warrant_number}</span>
                    {w.is_active ? (
                      <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> ATTIVO</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full flex items-center gap-1"><Clock size={10} /> {w.status}</span>
                    )}
                  </div>
                  <p className="text-sm text-white mt-1">{w.reason}</p>
                  <p className="text-[10px] text-plos-text-muted mt-1">Emesso da: {w.officer_name} - {w.created_at?.split('T')[0]}</p>
                  {w.expires_at && <p className="text-[10px] text-plos-text-muted">Scade: {w.expires_at.split('T')[0]}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyWarrantsPage;
