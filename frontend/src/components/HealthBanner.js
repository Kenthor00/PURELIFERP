import React, { useState } from 'react';
import { useHealth } from '../context/HealthContext';
import { AlertTriangle, Database, Server, RefreshCw, Wifi, Loader2, CheckCircle, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const HealthBanner = () => {
  const { health, loading, checkHealth, isDbAvailable, isBackendAvailable, needsSeed, seedStatus } = useHealth();
  const [seedKey, setSeedKey] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [showSeedForm, setShowSeedForm] = useState(false);

  const handleSeed = async () => {
    if (!seedKey.trim()) return;
    
    setSeeding(true);
    setSeedResult(null);
    
    try {
      const res = await axios.post(`${API_URL}/api/admin/seed`, {}, {
        headers: { 'X-SEED-KEY': seedKey }
      });
      setSeedResult({ success: true, message: 'Seed completato! Puoi ora fare login.' });
      checkHealth(); // Refresh health status
    } catch (error) {
      setSeedResult({ 
        success: false, 
        message: error.response?.data?.detail || 'Errore durante il seed' 
      });
    } finally {
      setSeeding(false);
    }
  };

  // Don't show if system is healthy and seeded
  if (loading || (isBackendAvailable && isDbAvailable && !needsSeed)) {
    return null;
  }

  // Show seed prompt if DB is ok but needs seed
  if (isBackendAvailable && isDbAvailable && needsSeed) {
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-50 bg-blue-900/95 border-b-2 border-blue-500 px-4 py-3"
        data-testid="seed-banner"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="text-blue-400" size={24} />
              <div>
                <p className="font-heading text-sm text-blue-200 tracking-wider">
                  DATABASE PRONTO - SEED RICHIESTO
                </p>
                <p className="text-xs text-blue-300 mt-1">
                  Il database è connesso ma vuoto. Esegui il seed per creare gli utenti demo.
                </p>
              </div>
            </div>
            
            {!showSeedForm ? (
              <button
                onClick={() => setShowSeedForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-heading"
              >
                ESEGUI SEED
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={seedKey}
                  onChange={(e) => setSeedKey(e.target.value)}
                  placeholder="SEED_KEY"
                  className="px-3 py-2 bg-black/50 border border-blue-500 text-white text-sm w-48"
                />
                <button
                  onClick={handleSeed}
                  disabled={seeding || !seedKey.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-heading flex items-center gap-2"
                >
                  {seeding ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  {seeding ? 'SEEDING...' : 'CONFERMA'}
                </button>
              </div>
            )}
          </div>
          
          {seedResult && (
            <div className={`mt-2 p-2 text-sm ${seedResult.success ? 'bg-lime-500/20 text-lime-300' : 'bg-red-500/20 text-red-300'}`}>
              {seedResult.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error banner if DB or backend down
  // Ma NON bloccare tutto se solo il DB è down - mostra warning invece di errore critico
  const isCritical = !isBackendAvailable;
  const isWarning = isBackendAvailable && !isDbAvailable;
  
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 border-b-2 ${
        isCritical 
          ? 'bg-red-900/95 border-red-500' 
          : 'bg-orange-900/95 border-orange-500'
      }`}
      data-testid="health-banner"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`animate-pulse ${isCritical ? 'text-red-400' : 'text-orange-400'}`} size={24} />
            <div>
              <p className={`font-heading text-sm tracking-wider ${isCritical ? 'text-red-200' : 'text-orange-200'}`}>
                {isCritical ? 'SISTEMA NON DISPONIBILE' : 'SISTEMA IN MODALITÀ LIMITATA'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-xs">
                {!isBackendAvailable && (
                  <span className="flex items-center gap-1 text-red-300">
                    <Server size={12} />
                    Backend non disponibile
                  </span>
                )}
                {isWarning && (
                  <span className="flex items-center gap-1 text-orange-300">
                    <Database size={12} />
                    Database temporaneamente non raggiungibile
                  </span>
                )}
                {health.migrations?.status === 'missing' && (
                  <span className="flex items-center gap-1 text-yellow-300">
                    <Wifi size={12} />
                    Migrazioni mancanti
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isCritical ? (
              <span className="text-xs text-red-300 hidden sm:inline">
                Login disabilitato
              </span>
            ) : (
              <span className="text-xs text-orange-300 hidden sm:inline">
                Alcune funzioni limitate
              </span>
            )}
            <button
              onClick={checkHealth}
              className={`p-2 border transition-colors ${
                isCritical 
                  ? 'border-red-500 hover:bg-red-800' 
                  : 'border-orange-500 hover:bg-orange-800'
              }`}
              title="Riprova connessione"
            >
              <RefreshCw size={16} className={isCritical ? 'text-red-300' : 'text-orange-300'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthBanner;
