/**
 * PURE LIFE OS 3.0 - WebSocket Hook
 * Real-time communication engine per frontend
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_RECONNECT_DELAY = 1000; // 1s initial
const WS_MAX_RECONNECT_DELAY = 30000; // 30s max
const WS_HEARTBEAT_INTERVAL = 25000; // 25s

/**
 * useWebSocket - Hook per connessione WebSocket
 * @param {string} token - JWT token per autenticazione
 * @param {Object} handlers - Oggetto con handler per eventi
 */
export const useWebSocket = (token, handlers = {}) => {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, degraded
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectDelayRef = useRef(WS_RECONNECT_DELAY);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const baseUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${wsHost}/api/ws/${token}`;
  }, [token]);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setStatus('connecting');
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        console.log('[WS] Connected');
        setStatus('connected');
        reconnectDelayRef.current = WS_RECONNECT_DELAY; // Reset delay on success

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS_HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Handle specific events
          switch (data.type) {
            case 'connected':
              handlers.onConnect?.(data.data);
              break;
            
            case 'pong':
              // Heartbeat response - connection healthy
              break;
            
            case 'chat_message':
              handlers.onChatMessage?.(data.data);
              break;
            
            case 'notification':
              handlers.onNotification?.(data.data);
              break;
            
            case 'presence_update':
            case 'user_online':
            case 'user_offline':
              handlers.onPresenceUpdate?.(data.data);
              if (data.type === 'user_online') {
                setOnlineUsers(prev => [...new Set([...prev, data.data.user_id])]);
              } else if (data.type === 'user_offline') {
                setOnlineUsers(prev => prev.filter(id => id !== data.data.user_id));
              }
              break;
            
            case 'system_alert':
              handlers.onSystemAlert?.(data.data);
              break;
            
            case 'broadcast':
              handlers.onBroadcast?.(data.data);
              break;
            
            case 'stats_update':
              handlers.onStatsUpdate?.(data.data);
              break;
            
            default:
              handlers.onMessage?.(data);
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason);
        setStatus('disconnected');
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Reconnect with exponential backoff
        if (event.code !== 1000 && event.code !== 4001) { // Not normal close or auth error
          setStatus('degraded');
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              WS_MAX_RECONNECT_DELAY
            );
            connect();
          }, reconnectDelayRef.current);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setStatus('degraded');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WS] Connection error:', error);
      setStatus('degraded');
    }
  }, [token, getWsUrl, handlers]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // Send message
  const send = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }, []);

  // Subscribe to channel
  const subscribe = useCallback((channel) => {
    return send('subscribe', { channel });
  }, [send]);

  // Unsubscribe from channel
  const unsubscribe = useCallback((channel) => {
    return send('unsubscribe', { channel });
  }, [send]);

  // Auto-connect when token available
  useEffect(() => {
    if (token) {
      connect();
    }
    return () => disconnect();
  }, [token, connect, disconnect]);

  return {
    status,
    lastMessage,
    onlineUsers,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isDegraded: status === 'degraded'
  };
};

/**
 * WebSocketProvider - Context per WebSocket
 */
import { createContext, useContext } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children, token, handlers }) => {
  const ws = useWebSocket(token, handlers);
  
  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWS = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWS must be used within WebSocketProvider');
  }
  return context;
};

export default useWebSocket;
