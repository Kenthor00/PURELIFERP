import React from 'react';
import { useHealth } from '../context/HealthContext';
import { AlertTriangle, Database, Server, RefreshCw, Wifi } from 'lucide-react';

export const HealthBanner = () => {
  const { health, loading, checkHealth, isDbAvailable, isBackendAvailable } = useHealth();

  // Don't show anything if system is healthy
  if (loading || (isBackendAvailable && isDbAvailable)) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-red-900/95 border-b-2 border-red-500 px-4 py-3"
      data-testid="health-banner"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400 animate-pulse" size={24} />
            <div>
              <p className="font-heading text-sm text-red-200 tracking-wider">
                SISTEMA IN STATO DEGRADATO
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-xs">
                {!isBackendAvailable && (
                  <span className="flex items-center gap-1 text-red-300">
                    <Server size={12} />
                    Backend non disponibile
                  </span>
                )}
                {isBackendAvailable && !isDbAvailable && (
                  <span className="flex items-center gap-1 text-red-300">
                    <Database size={12} />
                    Database non raggiungibile
                    {health.db?.error && (
                      <span className="text-red-400 ml-1">({health.db.error})</span>
                    )}
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
            <span className="text-xs text-red-300 hidden sm:inline">
              Login disabilitato
            </span>
            <button
              onClick={checkHealth}
              className="p-2 border border-red-500 hover:bg-red-800 transition-colors"
              title="Riprova connessione"
            >
              <RefreshCw size={16} className="text-red-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthBanner;
