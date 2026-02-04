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
  const eventSourceRef = useRef(null);
  const listenersRef = useRef({});

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

  const connect = useCallback(() => {
    if (!token || eventSourceRef.current) return;

    const API_URL = process.env.REACT_APP_BACKEND_URL;
    
    // SSE with authorization via query param (workaround for EventSource)
    const eventSource = new EventSource(
      `${API_URL}/api/sse/events?token=${token}`
    );

    eventSource.onopen = () => {
      setConnected(true);
      console.log('SSE Connesso');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev.slice(0, 99)]);

        const listeners = listenersRef.current[data.type] || [];
        listeners.forEach((callback) => callback(data));

        const allListeners = listenersRef.current['*'] || [];
        allListeners.forEach((callback) => callback(data));
      } catch (error) {
        console.error('Errore parsing SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Reconnect after 5s
      setTimeout(() => {
        if (token) connect();
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [token]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

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
