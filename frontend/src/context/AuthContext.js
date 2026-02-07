import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('plos_token'));
  const [loading, setLoading] = useState(true);

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
            error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(error.config);
          } catch (refreshError) {
            logout();
          }
        } else {
          logout();
        }
      }
      return Promise.reject(error);
    }
  );

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (error) {
      console.error('Errore fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
      await axios.put(`${API_URL}/api/chat/presence`, 
        { status: 'online' },
        { headers: { Authorization: `Bearer ${res.data.access_token}` } }
      );
    } catch (e) {
      console.log('Presence update skipped:', e.message);
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

  const logout = () => {
    localStorage.removeItem('plos_token');
    localStorage.removeItem('plos_refresh_token');
    setToken(null);
    setUser(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        fivemLogin,
        logout,
        refreshUser,
        updateSettings,
        api,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
