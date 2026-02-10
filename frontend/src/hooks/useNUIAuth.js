/**
 * PURE LIFE OS - NUI Authentication Hook
 * Gestisce l'autenticazione automatica via FiveM handshake
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNUI, useNUIEvent } from './NUIContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const useNUIAuth = () => {
  const { user, token, loading: authLoading } = useAuth();
  const { isNUI, handshakeCode, isConnected, on, notify } = useNUI();
  
  const [nuiAuthState, setNuiAuthState] = useState({
    loading: false,
    error: null,
    authenticated: false,
  });
  
  // Gestisce l'handshake quando riceviamo il code da FiveM
  const performHandshake = useCallback(async (code) => {
    if (!code) return;
    
    setNuiAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Chiama endpoint backend per validare code con FiveM
      const response = await axios.post(`${API_URL}/api/nui/handshake`, {
        code: code
      });
      
      if (response.data.success) {
        // Salva token
        localStorage.setItem('plos_token', response.data.access_token);
        localStorage.setItem('plos_refresh_token', response.data.refresh_token);
        
        // Aggiorna state
        setNuiAuthState({
          loading: false,
          error: null,
          authenticated: true,
        });
        
        // Notifica FiveM del successo
        notify('PURE LIFE OS', 'Connessione stabilita!', 'success');
        
        // Reload per attivare il nuovo token
        window.location.reload();
        
        return response.data;
      } else {
        throw new Error('Handshake failed');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Errore autenticazione';
      
      setNuiAuthState({
        loading: false,
        error: errorMsg,
        authenticated: false,
      });
      
      // Notifica errore a FiveM
      notify('PURE LIFE OS', `Errore: ${errorMsg}`, 'error');
      
      console.error('[NUI Auth] Handshake error:', error);
      return null;
    }
  }, [notify]);
  
  // Auto-handshake quando riceviamo code
  useEffect(() => {
    if (isNUI && handshakeCode && !token && !nuiAuthState.loading) {
      console.log('[NUI Auth] Received handshake code, authenticating...');
      performHandshake(handshakeCode);
    }
  }, [isNUI, handshakeCode, token, nuiAuthState.loading, performHandshake]);
  
  // Listener per evento handshake
  useNUIEvent('handshake', (payload) => {
    if (payload?.code) {
      performHandshake(payload.code);
    }
  });
  
  // Token refresh per NUI (token short-lived)
  useEffect(() => {
    if (!isNUI || !token) return;
    
    // Refresh 2 minuti prima della scadenza (token dura ~12 min)
    const refreshInterval = setInterval(async () => {
      const refreshToken = localStorage.getItem('plos_refresh_token');
      if (!refreshToken) return;
      
      try {
        const response = await axios.post(`${API_URL}/api/nui/refresh`, null, {
          params: { refresh_token: refreshToken }
        });
        
        localStorage.setItem('plos_token', response.data.access_token);
        localStorage.setItem('plos_refresh_token', response.data.refresh_token);
        
        console.log('[NUI Auth] Token refreshed');
      } catch (error) {
        console.error('[NUI Auth] Refresh failed:', error);
        // Token scaduto - richiedi nuovo handshake
        localStorage.removeItem('plos_token');
        localStorage.removeItem('plos_refresh_token');
        window.location.reload();
      }
    }, 10 * 60 * 1000); // Refresh ogni 10 minuti
    
    return () => clearInterval(refreshInterval);
  }, [isNUI, token]);
  
  return {
    isNUI,
    isAuthenticated: !!token || nuiAuthState.authenticated,
    loading: authLoading || nuiAuthState.loading,
    error: nuiAuthState.error,
    performHandshake,
  };
};

export default useNUIAuth;
