import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const HealthContext = createContext(null);

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth deve essere usato dentro HealthProvider');
  }
  return context;
};

export const HealthProvider = ({ children }) => {
  const [health, setHealth] = useState({
    status: 'loading',
    backend: 'unknown',
    db: { status: 'unknown', error: null },
    migrations: { status: 'unknown', error: null },
    sse: { status: 'unknown', connected_clients: 0 },
    timestamp: null
  });
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
      setHealth(res.data);
      setLastCheck(new Date());
    } catch (error) {
      setHealth({
        status: 'error',
        backend: 'down',
        db: { status: 'unknown', error: 'Backend non raggiungibile' },
        migrations: { status: 'unknown', error: null },
        sse: { status: 'unknown', connected_clients: 0 },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check health immediately
    checkHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, [checkHealth]);

  const isDbAvailable = health.db?.status === 'ok';
  const isMigrationsOk = health.migrations?.status === 'ok';
  const isBackendAvailable = health.backend === 'ok';
  const isSystemHealthy = health.status === 'ok';

  return (
    <HealthContext.Provider
      value={{
        health,
        loading,
        lastCheck,
        checkHealth,
        isDbAvailable,
        isMigrationsOk,
        isBackendAvailable,
        isSystemHealthy
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export default HealthContext;
