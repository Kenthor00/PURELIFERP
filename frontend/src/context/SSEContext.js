import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const SSEContext = createContext(null);

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE deve essere usato dentro SSEProvider');
  }
  return context;
};

export const SSEProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(null);
  const eventSourceRef = useRef(null);
  const listenersRef = useRef({});
  const reconnectTimeoutRef = useRef(null);

  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current[eventType]) {
      listenersRef.current[eventType] = [];
    }
    listenersRef.current[eventType].push(callback);

    return () => {
      listenersRef.current[eventType] = listenersRef.current[eventType].filter(
        (cb) => cb !== callback
      );
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || eventSourceRef.current) return;

    const API_URL = process.env.REACT_APP_BACKEND_URL;
    const sseUrl = `${API_URL}/api/sse/events?token=${token}`;
    
    console.log('SSE: Tentativo connessione a', sseUrl);
    
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = (e) => {
      console.log('SSE: Connessione aperta', e);
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev.slice(0, 99)]);
        setLastEventTime(Date.now());
        // Quando riceviamo messaggi, siamo sicuramente connessi
        setConnected(true);

        const listeners = listenersRef.current[data.type] || [];
        listeners.forEach((callback) => callback(data));

        const allListeners = listenersRef.current['*'] || [];
        allListeners.forEach((callback) => callback(data));
      } catch (error) {
        // Heartbeat messages might not be JSON
        if (event.data && event.data.trim()) {
          console.log('SSE: Heartbeat o messaggio non-JSON ricevuto');
        }
        // Siamo comunque connessi se riceviamo dati
        setConnected(true);
      }
    };

    eventSource.onerror = (e) => {
      console.log('SSE: Errore connessione', e, 'readyState:', eventSource.readyState);
      
      // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
      if (eventSource.readyState === EventSource.CLOSED) {
        setConnected(false);
        eventSource.close();
        eventSourceRef.current = null;
        
        // Schedule reconnect after 3 seconds (ridotto per riconnessione più rapida)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          if (token) {
            connect();
          }
        }, 3000);
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        // Se sta ancora tentando di connettersi, non mostrare offline
        // L'errore potrebbe essere temporaneo (es. QUIC fallback)
        console.log('SSE: Connessione in corso, attendo...');
      }
    };

    eventSourceRef.current = eventSource;
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [isAuthenticated, connect, disconnect]);

  return (
    <SSEContext.Provider
      value={{
        events,
        connected,
        lastEventTime,
        subscribe,
        connect,
        disconnect,
      }}
    >
      {children}
    </SSEContext.Provider>
  );
};

export default SSEContext;
