import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Receipt, CheckCircle, Clock, DollarSign } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MyFinesPage = () => {
  const { token } = useAuth();
  const [fines, setFines] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  const fetchFines = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axios.get(`${API}/api/citizen/fines${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFines(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchFines(); }, [token, filter]);

  const handlePay = async (fineId) => {
    setPaying(fineId);
    try {
      await axios.post(`${API}/api/citizen/fines/${fineId}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFines();
    } catch (err) {
      alert(err.response?.data?.detail || 'Errore nel pagamento');
    } finally {
      setPaying(null);
    }
  };

  const totalDebt = fines.filter(f => !f.is_paid).reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto" data-testid="my-fines-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Receipt size={22} /> Le Mie Multe</h1>
          <p className="text-xs text-plos-text-secondary mt-1">Visualizza e paga le tue multe</p>
        </div>
        {totalDebt > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-right">
            <p className="text-lg font-bold text-red-400">${totalDebt.toLocaleString()}</p>
            <p className="text-[10px] text-red-300/60">Da pagare</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {['all', 'unpaid', 'paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded-md transition-all ${filter === f ? 'bg-plos-primary text-black font-bold' : 'bg-plos-bg-secondary text-plos-text-secondary border border-plos-border'}`}>
            {f === 'all' ? 'Tutte' : f === 'unpaid' ? 'Da Pagare' : 'Pagate'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-plos-text-secondary">Caricamento...</div>
      ) : fines.length === 0 ? (
        <div className="text-center py-16 text-plos-text-muted">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nessuna multa trovata</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fines.map(fine => (
            <div key={fine.id} className={`bg-plos-bg-secondary border rounded-lg p-4 ${fine.is_paid ? 'border-green-500/20' : 'border-amber-500/30'}`} data-testid={`fine-${fine.fine_number}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-plos-text-muted">{fine.fine_number}</span>
                    {fine.is_paid ? (
                      <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Pagata</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1"><Clock size={10} /> Da Pagare</span>
                    )}
                  </div>
                  <p className="text-sm text-white mt-1">{fine.reason}</p>
                  <p className="text-[10px] text-plos-text-muted mt-1">Emessa da: {fine.officer_name} - {fine.created_at?.split('T')[0]}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-white">${fine.amount.toLocaleString()}</p>
                  {!fine.is_paid && (
                    <button onClick={() => handlePay(fine.id)} disabled={paying === fine.id} className="mt-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md transition-all disabled:opacity-50 flex items-center gap-1" data-testid={`pay-fine-${fine.id}`}>
                      <DollarSign size={12} /> {paying === fine.id ? '...' : 'Paga'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFinesPage;
