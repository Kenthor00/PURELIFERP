import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
};

// Funzione per pulire completamente lo storage
const clearAuthStorage = () => {
  localStorage.removeItem('plos_token');
  localStorage.removeItem('plos_refresh_token');
  localStorage.removeItem('plos_user'); // Legacy cleanup
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // NON inizializzare da localStorage
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState('offline');
  const validationRef = useRef(false); // Prevent double validation

  const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.request.use((config) => {
    const storedToken = localStorage.getItem('plos_token');
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const refreshToken = localStorage.getItem('plos_refresh_token');
        if (refreshToken && !error.config._retry) {
          error.config._retry = true;
          try {
            const res = await axios.post(`${API_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });
            localStorage.setItem('plos_token', res.data.access_token);
            localStorage.setItem('plos_refresh_token', res.data.refresh_token);
            setToken(res.data.access_token);
            error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(error.config);
          } catch (refreshError) {
            // Refresh failed - full logout
            console.warn('Token refresh failed, forcing logout');
            forceLogout();
          }
        } else {
          // No refresh token or already retried - logout
          console.warn('Unauthorized request, forcing logout');
          forceLogout();
        }
      }
      return Promise.reject(error);
    }
  );

  // Logout forzato senza chiamate API (per quando il token è invalido)
  const forceLogout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setPresence('offline');
    // Redirect to login if not already there
    if (window.location.pathname !== '/login' && window.location.pathname !== '/city') {
      window.location.href = '/login';
    }
  }, []);

  // Validazione token all'avvio - UNICA FONTE DI VERITÀ
  const validateAndFetchUser = useCallback(async () => {
    if (validationRef.current) return; // Prevent double execution
    validationRef.current = true;
    
    const storedToken = localStorage.getItem('plos_token');
    
    if (!storedToken) {
      // Nessun token - utente guest
      clearAuthStorage();
      setUser(null);
      setToken(null);
      setPresence('offline');
      setLoading(false);
      return;
    }

    try {
      // VALIDAZIONE CON /api/auth/me - unica fonte di verità
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      
      // Token valido - imposta utente con role mappato da sector
      const userData = {
        ...res.data,
        role: res.data.sector?.toLowerCase(), // Legacy compatibility
      };
      setUser(userData);
      setToken(storedToken);
      
      // Recupera presenza
      try {
        const presenceRes = await axios.get(`${API_URL}/api/chat/presence/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setPresence(presenceRes.data?.status || 'offline');
      } catch {
        setPresence('offline');
      }
      
    } catch (error) {
      console.warn('Token validation failed:', error.response?.status);
      
      // Se 401, prova refresh token
      if (error.response?.status === 401) {
        const refreshToken = localStorage.getItem('plos_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await axios.post(`${API_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });
            
            // Refresh riuscito
            localStorage.setItem('plos_token', refreshRes.data.access_token);
            localStorage.setItem('plos_refresh_token', refreshRes.data.refresh_token);
            
            // Ri-valida con nuovo token
            const userRes = await axios.get(`${API_URL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${refreshRes.data.access_token}` }
            });
            
            const refreshedUserData = {
              ...userRes.data,
              role: userRes.data.sector?.toLowerCase(), // Legacy compatibility
            };
            setUser(refreshedUserData);
            setToken(refreshRes.data.access_token);
            setPresence('offline');
            setLoading(false);
            return;
          } catch (refreshError) {
            console.warn('Refresh token failed');
          }
        }
      }
      
      // Token non valido - pulisci tutto
      clearAuthStorage();
      setUser(null);
      setToken(null);
      setPresence('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Esegui validazione all'avvio
  useEffect(() => {
    validateAndFetchUser();
  }, [validateAndFetchUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('plos_token', res.data.access_token);
    localStorage.setItem('plos_refresh_token', res.data.refresh_token);
    setToken(res.data.access_token);
    
    // Imposta user con tutti i dati dalla risposta
    const userData = {
      id: res.data.user_id,
      email: res.data.email,
      name: res.data.name,
      game_name: res.data.game_name,
      sector: res.data.sector,
      grade: res.data.grade,
      hierarchy_level: res.data.hierarchy_level,
      is_sector_chief: res.data.is_sector_chief,
      needs_game_name: res.data.needs_game_name,
      // Legacy compatibility
      role: res.data.sector?.toLowerCase(),
    };
    setUser(userData);
    
    // Aggiorna presenza a ONLINE dopo il login
    try {
      const presenceRes = await axios.put(`${API_URL}/api/chat/presence`, 
        { status: 'online' },
        { headers: { Authorization: `Bearer ${res.data.access_token}` } }
      );
      setPresence(presenceRes.data.status || 'online');
    } catch (e) {
      console.log('Presence update skipped:', e.message);
      setPresence('online'); // Imposta comunque online
    }
    
    return { ...res.data, ...userData };
  };

  const fivemLogin = async (params) => {
    const urlParams = new URLSearchParams(window.location.search);
    const identifier = urlParams.get('identifier') || params?.identifier;
    const job = urlParams.get('job') || params?.job;
    const name = urlParams.get('name') || params?.name;
    const phone = urlParams.get('phone') || params?.phone;
    const secret = urlParams.get('secret') || params?.secret;

    if (!identifier || !job || !name || !secret) {
      throw new Error('Parametri FiveM mancanti');
    }

    const res = await axios.post(
      `${API_URL}/api/auth/fivem/exchange`,
      {
        identifier,
        job,
        grade: parseInt(urlParams.get('grade') || '0'),
        name,
        phone_number: phone,
      },
      {
        headers: {
          'X-FIVEM-SECRET': secret,
        },
      }
    );

    localStorage.setItem('plos_token', res.data.access_token);
    setToken(res.data.access_token);
    
    return res.data;
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem('plos_token');
    
    // Aggiorna presenza a offline
    if (currentToken) {
      try {
        await axios.put(`${API_URL}/api/chat/presence`, 
          { status: 'offline' },
          { headers: { Authorization: `Bearer ${currentToken}` } }
        );
      } catch {}
      
      // Revoca/blacklist refresh token sul server (se implementato)
      try {
        const refreshToken = localStorage.getItem('plos_refresh_token');
        if (refreshToken) {
          await axios.post(`${API_URL}/api/auth/logout`, 
            { refresh_token: refreshToken },
            { headers: { Authorization: `Bearer ${currentToken}` } }
          );
        }
      } catch {}
    }
    
    // Pulisci tutto
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setPresence('offline');
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch (error) {
      console.error('Errore refresh user:', error);
      return null;
    }
  };

  const updateSettings = async (settings) => {
    const params = new URLSearchParams(settings).toString();
    const res = await api.put(`/auth/me/settings?${params}`);
    setUser(res.data);
    return res.data;
  };

  const updatePresence = async (newStatus) => {
    try {
      const res = await api.put('/chat/presence', { status: newStatus });
      setPresence(res.data.status);
      return res.data;
    } catch (error) {
      console.error('Errore aggiornamento presenza:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        presence,
        login,
        fivemLogin,
        logout,
        refreshUser,
        updateSettings,
        updatePresence,
        api,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
