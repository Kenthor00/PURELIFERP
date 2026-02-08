/**
 * PURE LIFE OS - Debug Panel
 * Pannello diagnostica per sviluppo/admin
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { Bug, X, AlertTriangle, CheckCircle, Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';

// Store per errori globali
let globalErrors = [];
let globalApiCalls = [];

// Funzione per registrare errori (usabile ovunque)
export const logError = (error, context = '') => {
  const errorEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    message: error?.message || String(error),
    context,
    stack: error?.stack,
  };
  globalErrors = [errorEntry, ...globalErrors].slice(0, 20);
  window.dispatchEvent(new CustomEvent('plos-error', { detail: errorEntry }));
};

// Funzione per registrare chiamate API
export const logApiCall = (endpoint, method, status, responseTime, error = null) => {
  const apiEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    status,
    responseTime,
    error: error?.message || null,
    isError: status >= 400 || !!error,
  };
  globalApiCalls = [apiEntry, ...globalApiCalls].slice(0, 30);
  window.dispatchEvent(new CustomEvent('plos-api', { detail: apiEntry }));
};

const DebugPanel = () => {
  const { user, token } = useAuth();
  const { connected, lastEventTime } = useSSE();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('errors');
  const [errors, setErrors] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);

  // Solo per admin/dev
  const isAdmin = user?.sector === 'ADMIN';
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    const handleError = (e) => {
      setErrors(prev => [e.detail, ...prev].slice(0, 20));
    };
    const handleApi = (e) => {
      setApiCalls(prev => [e.detail, ...prev].slice(0, 30));
    };

    window.addEventListener('plos-error', handleError);
    window.addEventListener('plos-api', handleApi);

    // Carica errori esistenti
    setErrors(globalErrors);
    setApiCalls(globalApiCalls);

    return () => {
      window.removeEventListener('plos-error', handleError);
      window.removeEventListener('plos-api', handleApi);
    };
  }, []);

  if (!isAdmin && !isDev) return null;

  const tokenExpiry = token ? JSON.parse(atob(token.split('.')[1]))?.exp : null;
  const tokenValid = tokenExpiry ? (tokenExpiry * 1000) > Date.now() : false;
  const timeToExpiry = tokenExpiry ? Math.round((tokenExpiry * 1000 - Date.now()) / 60000) : 0;

  const failedApiCount = apiCalls.filter(a => a.isError).length;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-lg transition-all ${
          failedApiCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-plos-surface border border-plos-border'
        }`}
        title="Debug Panel"
      >
        <Bug size={20} className={failedApiCount > 0 ? 'text-white' : 'text-plos-primary'} />
        {failedApiCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
            {failedApiCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 max-h-[70vh] bg-plos-surface border border-plos-border rounded-lg shadow-2xl z-[9999] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-plos-border bg-plos-bg">
            <div className="flex items-center gap-2">
              <Bug size={18} className="text-plos-primary" />
              <span className="font-heading text-sm">DIAGNOSTICA</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-plos-surface rounded">
              <X size={16} />
            </button>
          </div>

          {/* Status Bar */}
          <div className="p-3 border-b border-plos-border bg-black/30 grid grid-cols-3 gap-2 text-xs">
            {/* SSE Status */}
            <div className="flex items-center gap-1">
              {connected ? (
                <Wifi size={12} className="text-green-500" />
              ) : (
                <WifiOff size={12} className="text-red-500" />
              )}
              <span className={connected ? 'text-green-400' : 'text-red-400'}>
                SSE {connected ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Token Status */}
            <div className="flex items-center gap-1">
              {tokenValid ? (
                <CheckCircle size={12} className="text-green-500" />
              ) : (
                <AlertTriangle size={12} className="text-red-500" />
              )}
              <span className={tokenValid ? 'text-green-400' : 'text-red-400'}>
                Token {tokenValid ? `${timeToExpiry}m` : 'EXP'}
              </span>
            </div>

            {/* Last Event */}
            <div className="flex items-center gap-1 text-plos-text-muted">
              <Clock size={12} />
              <span>{lastEventTime ? new Date(lastEventTime).toLocaleTimeString('it-IT') : '--:--'}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-plos-border">
            <button
              onClick={() => setActiveTab('errors')}
              className={`flex-1 p-2 text-xs font-heading ${activeTab === 'errors' ? 'bg-plos-primary/20 text-plos-primary' : 'text-plos-text-muted'}`}
            >
              ERRORI ({errors.length})
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 p-2 text-xs font-heading ${activeTab === 'api' ? 'bg-plos-primary/20 text-plos-primary' : 'text-plos-text-muted'}`}
            >
              API ({apiCalls.length})
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[40vh]">
            {activeTab === 'errors' && (
              <div className="divide-y divide-plos-border">
                {errors.length === 0 ? (
                  <div className="p-4 text-center text-plos-text-muted text-sm">
                    Nessun errore registrato
                  </div>
                ) : (
                  errors.map(err => (
                    <div key={err.id} className="p-2 text-xs hover:bg-black/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-red-400 font-medium truncate">{err.message}</div>
                          {err.context && <div className="text-plos-text-muted">{err.context}</div>}
                          <div className="text-plos-text-muted mt-1">
                            {new Date(err.timestamp).toLocaleTimeString('it-IT')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'api' && (
              <div className="divide-y divide-plos-border">
                {apiCalls.length === 0 ? (
                  <div className="p-4 text-center text-plos-text-muted text-sm">
                    Nessuna chiamata API registrata
                  </div>
                ) : (
                  apiCalls.map(api => (
                    <div key={api.id} className={`p-2 text-xs hover:bg-black/20 ${api.isError ? 'bg-red-500/10' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          api.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                          api.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                          api.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                          api.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : ''
                        }`}>
                          {api.method}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          api.status < 300 ? 'bg-green-500/20 text-green-400' :
                          api.status < 400 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {api.status}
                        </span>
                        <span className="text-plos-text-muted">{api.responseTime}ms</span>
                      </div>
                      <div className="mt-1 text-plos-text-secondary truncate">{api.endpoint}</div>
                      {api.error && <div className="mt-1 text-red-400">{api.error}</div>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-plos-border flex gap-2">
            <button
              onClick={() => { setErrors([]); globalErrors = []; }}
              className="flex-1 text-xs py-1.5 bg-plos-surface hover:bg-plos-surface-highlight rounded"
            >
              Clear Errors
            </button>
            <button
              onClick={() => { setApiCalls([]); globalApiCalls = []; }}
              className="flex-1 text-xs py-1.5 bg-plos-surface hover:bg-plos-surface-highlight rounded"
            >
              Clear API
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugPanel;
