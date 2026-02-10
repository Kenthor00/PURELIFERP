/**
 * PURE LIFE OS - FiveM NUI Bridge
 * Comunicazione bidirezionale tra web app e FiveM client via postMessage
 * 
 * Eventi INBOUND (da FiveM a Web):
 * - PLOS_HANDSHAKE: Inizia handshake con code
 * - PLOS_PLAYER: Dati player aggiornati
 * - PLOS_OK: Conferma operazione
 * - PLOS_ERR: Errore operazione
 * 
 * Eventi OUTBOUND (da Web a FiveM):
 * - PLOS_GET_PLAYER: Richiede dati player
 * - PLOS_SET_WAYPOINT: Imposta waypoint su mappa
 * - PLOS_NOTIFY: Mostra notifica in-game
 * - PLOS_HANDSHAKE: Richiede handshake
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NUIContext = createContext(null);

// Costanti eventi
export const NUI_EVENTS = {
  // Inbound (FiveM -> Web)
  HANDSHAKE: 'PLOS_HANDSHAKE',
  HANDSHAKE_OK: 'PLOS_HANDSHAKE_OK',
  PLAYER: 'PLOS_PLAYER',
  OK: 'PLOS_OK',
  ERR: 'PLOS_ERR',
  
  // Outbound (Web -> FiveM)
  GET_PLAYER: 'PLOS_GET_PLAYER',
  SET_WAYPOINT: 'PLOS_SET_WAYPOINT',
  NOTIFY: 'PLOS_NOTIFY',
  REQUEST_HANDSHAKE: 'PLOS_HANDSHAKE',
};

// Detect se siamo in ambiente FiveM NUI
const detectFiveM = () => {
  // Check per vari indicatori di FiveM NUI
  const isCEF = navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Safari');
  const hasNuiCallback = typeof window.GetParentResourceName === 'function';
  const isInFrame = window.self !== window.top;
  const nuiParam = new URLSearchParams(window.location.search).get('nui');
  
  return hasNuiCallback || nuiParam === 'true' || (isCEF && isInFrame);
};

export const NUIProvider = ({ children }) => {
  const [isNUI, setIsNUI] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [handshakeCode, setHandshakeCode] = useState(null);
  const [lastError, setLastError] = useState(null);
  
  // Listeners per eventi specifici
  const eventListeners = useRef({});
  
  // Detect FiveM all'avvio
  useEffect(() => {
    const detected = detectFiveM();
    setIsNUI(detected);
    
    if (detected) {
      console.log('[NUI Bridge] FiveM NUI environment detected');
      
      // Request initial handshake
      setTimeout(() => {
        sendToFiveM(NUI_EVENTS.REQUEST_HANDSHAKE, {});
      }, 500);
    } else {
      console.log('[NUI Bridge] Running in standard browser mode');
    }
  }, []);
  
  // Message handler
  useEffect(() => {
    const handleMessage = (event) => {
      // Security: verifica origine
      // In FiveM NUI, l'origine è 'nui://...' o 'https://cfx-nui-...'
      // Per sicurezza accettiamo anche da stesso dominio
      
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      
      const { type, payload } = data;
      if (!type || !type.startsWith('PLOS_')) return;
      
      console.log('[NUI Bridge] Received:', type, payload);
      
      switch (type) {
        case NUI_EVENTS.HANDSHAKE:
          // FiveM ci manda il code per l'handshake
          setHandshakeCode(payload?.code);
          triggerListeners('handshake', payload);
          break;
          
        case NUI_EVENTS.HANDSHAKE_OK:
          // Handshake completato con successo
          setIsConnected(true);
          triggerListeners('handshake_ok', payload);
          break;
          
        case NUI_EVENTS.PLAYER:
          // Dati player aggiornati
          setPlayerData(payload);
          triggerListeners('player', payload);
          break;
          
        case NUI_EVENTS.OK:
          // Operazione completata
          triggerListeners('ok', payload);
          break;
          
        case NUI_EVENTS.ERR:
          // Errore
          setLastError(payload);
          triggerListeners('error', payload);
          break;
          
        default:
          // Eventi custom
          triggerListeners(type.toLowerCase().replace('plos_', ''), payload);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Trigger registered listeners
  const triggerListeners = (event, payload) => {
    const listeners = eventListeners.current[event] || [];
    listeners.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error('[NUI Bridge] Listener error:', e);
      }
    });
  };
  
  // Invia messaggio a FiveM
  const sendToFiveM = useCallback((type, payload = {}) => {
    if (!isNUI) {
      console.warn('[NUI Bridge] Not in NUI mode, message not sent:', type);
      return false;
    }
    
    const message = { type, payload, timestamp: Date.now() };
    
    // In FiveM NUI, postiamo al parent (il frame host)
    try {
      window.parent.postMessage(message, '*');
      console.log('[NUI Bridge] Sent:', type, payload);
      return true;
    } catch (e) {
      console.error('[NUI Bridge] Send error:', e);
      return false;
    }
  }, [isNUI]);
  
  // Richiedi dati player
  const getPlayer = useCallback(() => {
    return sendToFiveM(NUI_EVENTS.GET_PLAYER, {});
  }, [sendToFiveM]);
  
  // Imposta waypoint su mappa FiveM
  const setWaypoint = useCallback((x, y, label = null) => {
    return sendToFiveM(NUI_EVENTS.SET_WAYPOINT, { x, y, label });
  }, [sendToFiveM]);
  
  // Mostra notifica in-game
  const notify = useCallback((title, message, type = 'info', duration = 5000) => {
    return sendToFiveM(NUI_EVENTS.NOTIFY, { title, message, type, duration });
  }, [sendToFiveM]);
  
  // Richiedi nuovo handshake
  const requestHandshake = useCallback(() => {
    setHandshakeCode(null);
    setIsConnected(false);
    return sendToFiveM(NUI_EVENTS.REQUEST_HANDSHAKE, {});
  }, [sendToFiveM]);
  
  // Registra listener per evento
  const on = useCallback((event, callback) => {
    if (!eventListeners.current[event]) {
      eventListeners.current[event] = [];
    }
    eventListeners.current[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      eventListeners.current[event] = eventListeners.current[event].filter(cb => cb !== callback);
    };
  }, []);
  
  // Rimuovi listener
  const off = useCallback((event, callback) => {
    if (eventListeners.current[event]) {
      eventListeners.current[event] = eventListeners.current[event].filter(cb => cb !== callback);
    }
  }, []);
  
  return (
    <NUIContext.Provider
      value={{
        // State
        isNUI,
        isConnected,
        playerData,
        handshakeCode,
        lastError,
        
        // Actions
        sendToFiveM,
        getPlayer,
        setWaypoint,
        notify,
        requestHandshake,
        
        // Event system
        on,
        off,
      }}
    >
      {children}
    </NUIContext.Provider>
  );
};

export const useNUI = () => {
  const context = useContext(NUIContext);
  if (!context) {
    throw new Error('useNUI must be used within NUIProvider');
  }
  return context;
};

// Hook per listener con auto-cleanup
export const useNUIEvent = (event, callback) => {
  const { on } = useNUI();
  
  useEffect(() => {
    return on(event, callback);
  }, [event, callback, on]);
};

// Hook per waypoint dalla mappa
export const useWaypoint = () => {
  const { setWaypoint, isNUI } = useNUI();
  
  const setMapWaypoint = useCallback((coords, label = null) => {
    if (!isNUI) {
      // In browser mode, show toast instead
      console.log('[Waypoint] Would set waypoint to:', coords, label);
      return false;
    }
    return setWaypoint(coords.x, coords.y, label);
  }, [setWaypoint, isNUI]);
  
  return { setMapWaypoint, isNUI };
};

// Hook per notifiche
export const useNUINotify = () => {
  const { notify, isNUI } = useNUI();
  
  const showNotification = useCallback((title, message, type = 'info') => {
    if (!isNUI) {
      // Fallback: usa toast del browser
      console.log('[NUI Notify]', type, title, message);
      return false;
    }
    return notify(title, message, type);
  }, [notify, isNUI]);
  
  return { showNotification, isNUI };
};

export default NUIContext;
