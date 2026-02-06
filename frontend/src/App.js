import React, { useEffect, createContext, useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SSEProvider } from './context/SSEContext';
import { SoundProvider } from './context/SoundContext';
import { HealthProvider } from './context/HealthContext';
import { Toaster } from 'sonner';
import axios from 'axios';

import Layout from './components/Layout';
import HealthBanner from './components/HealthBanner';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import SetGameNamePage from './pages/SetGameNamePage';
import FiveMAuthPage from './pages/FiveMAuthPage';

// LSPD
import LSPDDashboard from './pages/lspd/LSPDDashboard';
import CasesListPage from './pages/lspd/CasesListPage';
import CaseDetailPage from './pages/lspd/CaseDetailPage';
import NewCasePage from './pages/lspd/NewCasePage';

// EMS
import EMSDashboard from './pages/ems/EMSDashboard';
import PatientsListPage from './pages/ems/PatientsListPage';
import NewPatientPage from './pages/ems/NewPatientPage';

// Core
import DispatchPage from './pages/DispatchPage';
import TimelinePage from './pages/TimelinePage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import JusticePage from './pages/JusticePage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuditDashboard from './pages/admin/AuditDashboard';

// Sector Management (for sector chiefs)
import SectorManagement from './pages/SectorManagement';

// Public
import CityHubPage from './pages/public/CityHubPage';
import NewsPage from './pages/public/NewsPage';

// City Hub v2
import RecruitmentPage from './pages/cityhub/RecruitmentPage';
import AppointmentsPage from './pages/cityhub/AppointmentsPage';
import AnnouncementsPage from './pages/cityhub/AnnouncementsPage';
import AdvertisingPage from './pages/cityhub/AdvertisingPage';

// Fase 4 - News Editor & Service Chat
import NewsEditorPage from './pages/news/NewsEditorPage';
import ServiceChatPage from './pages/ServiceChatPage';

import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ==========================================
// Phone WebView Context
// ==========================================
const PhoneContext = createContext({ isPhoneMode: false, reducedMotion: false });

export const usePhone = () => useContext(PhoneContext);

const PhoneProvider = ({ children }) => {
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone') === '1';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInIframe = window.self !== window.top;
    
    const phoneMode = phoneParam || (isMobileUA && isInIframe);
    setIsPhoneMode(phoneMode);
    setReducedMotion(phoneMode);

    if (phoneMode) {
      document.body.classList.add('phone-webview');
      document.body.classList.add('reduced-motion');
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setReducedMotion(true);
      document.body.classList.add('reduced-motion');
    }

    return () => {
      document.body.classList.remove('phone-webview', 'reduced-motion');
    };
  }, []);

  return (
    <PhoneContext.Provider value={{ isPhoneMode, reducedMotion }}>
      {children}
    </PhoneContext.Provider>
  );
};

// ==========================================
// SSO Handler Component
// ==========================================
const SSOHandler = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const ssoToken = searchParams.get('sso');
    
    if (ssoToken && !processing) {
      setProcessing(true);
      
      // Exchange SSO token for JWT
      axios.post(`${API_URL}/api/fivem/sso/exchange`, null, {
        params: { sso_token: ssoToken }
      })
        .then(response => {
          const { access_token, refresh_token, role, user_id, name } = response.data;
          
          // Store tokens
          localStorage.setItem('plos_token', access_token);
          localStorage.setItem('plos_refresh_token', refresh_token);
          localStorage.setItem('plos_user', JSON.stringify({
            id: user_id,
            name,
            role
          }));
          
          // Remove sso param from URL
          searchParams.delete('sso');
          setSearchParams(searchParams);
          
          // Reload to apply auth state
          window.location.reload();
        })
        .catch(error => {
          console.error('SSO exchange failed:', error);
          // Remove invalid sso param
          searchParams.delete('sso');
          setSearchParams(searchParams);
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  }, [searchParams, setSearchParams, login, processing, navigate]);

  return null;
};

// ==========================================
// Deep Link Handler Component
// ==========================================
const DeepLinkHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const open = searchParams.get('open');
    const id = searchParams.get('id');

    if (!open) return;

    // Public routes (no auth required)
    const publicRoutes = ['city', 'news', 'event'];
    
    // If it's a public route, navigate regardless of auth
    if (publicRoutes.includes(open)) {
      let path = '/';
      switch (open) {
        case 'city':
          path = '/city';
          break;
        case 'news':
          path = id ? `/city/news/${id}` : '/city/news';
          break;
        case 'event':
          path = id ? `/city/events/${id}` : '/city/events';
          break;
        default:
          break;
      }
      if (path !== '/') {
        navigate(path, { replace: true });
      }
      return;
    }

    // Protected routes (auth required)
    if (isAuthenticated) {
      let path = '/';
      switch (open) {
        case 'lspd':
          path = '/lspd';
          break;
        case 'ems':
          path = '/ems';
          break;
        case 'dispatch':
          path = '/dispatch';
          break;
        case 'timeline':
          path = '/timeline';
          break;
        case 'case':
          path = id ? `/lspd/cases/${id}` : '/lspd/cases';
          break;
        case 'patient':
          path = id ? `/ems/patients/${id}` : '/ems/patients';
          break;
        case 'chat':
          path = '/chat';
          break;
        case 'justice':
          path = '/justice';
          break;
        default:
          break;
      }
      if (path !== '/') {
        navigate(path, { replace: true });
      }
    }
  }, [searchParams, isAuthenticated, navigate]);

  return null;
};

// ==========================================
// Protected Route with game_name check
// ==========================================
const ProtectedRoute = ({ children, allowedSectors }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center">
        <div className="text-plos-primary animate-pulse font-heading text-xl tracking-wider">
          CARICAMENTO SISTEMA...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs to set game_name
  if (user?.needs_game_name) {
    return <Navigate to="/set-game-name" replace />;
  }

  // Check sector access
  const userSector = user?.sector?.toUpperCase();
  
  if (allowedSectors && !allowedSectors.includes(userSector) && userSector !== 'ADMIN') {
    // Redirect to appropriate dashboard based on sector
    switch (userSector) {
      case 'LSPD':
        return <Navigate to="/lspd" replace />;
      case 'EMS':
        return <Navigate to="/ems" replace />;
      case 'DISPATCH':
        return <Navigate to="/dispatch" replace />;
      case 'GOV':
        return <Navigate to="/justice" replace />;
      case 'NEWS':
        return <Navigate to="/city/news" replace />;
      default:
        return <Navigate to="/city" replace />;
    }
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/city';
    
    // Check game_name first
    if (user?.needs_game_name) return '/set-game-name';
    
    const sector = user?.sector?.toUpperCase();
    switch (sector) {
      case 'LSPD':
        return '/lspd';
      case 'EMS':
        return '/ems';
      case 'DISPATCH':
        return '/dispatch';
      case 'GOV':
        return '/justice';
      case 'NEWS':
      case 'WEAZEL':
        return '/city/news';
      case 'ADMIN':
        return '/admin';
      default:
        return '/city';
    }
  };

  return (
    <>
      <DeepLinkHandler />
      <Routes>
        {/* Public Routes - City Hub */}
        <Route path="/city" element={<CityHubPage />} />
        <Route path="/city/news" element={<NewsPage />} />
        <Route path="/city/news/:articleId" element={<NewsPage />} />
        <Route path="/city/events" element={<CityHubPage />} />
        <Route path="/city/events/:eventId" element={<CityHubPage />} />
        
        {/* City Hub v2 - Announcements are public, others require auth */}
        <Route path="/city/announcements" element={<AnnouncementsPage />} />
        <Route
          path="/city/recruitment"
          element={
            <ProtectedRoute>
              <RecruitmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/city/appointments"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/city/advertising"
          element={
            <ProtectedRoute>
              <AdvertisingPage />
            </ProtectedRoute>
          }
        />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/fivem" element={<FiveMAuthPage />} />

        {/* LSPD Routes */}
        <Route
          path="/lspd"
          element={
            <ProtectedRoute allowedRoles={['police', 'dispatch']}>
              <LSPDDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lspd/cases"
          element={
            <ProtectedRoute allowedRoles={['police', 'dispatch']}>
              <CasesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lspd/cases/new"
          element={
            <ProtectedRoute allowedRoles={['police']}>
              <NewCasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lspd/cases/:id"
          element={
            <ProtectedRoute allowedRoles={['police', 'dispatch']}>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lspd/warrants"
          element={
            <ProtectedRoute allowedRoles={['police', 'dispatch']}>
              <CasesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lspd/fines"
          element={
            <ProtectedRoute allowedRoles={['police', 'dispatch']}>
              <CasesListPage />
            </ProtectedRoute>
          }
        />

        {/* EMS Routes */}
        <Route
          path="/ems"
          element={
            <ProtectedRoute allowedRoles={['ems', 'dispatch']}>
              <EMSDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ems/patients"
          element={
            <ProtectedRoute allowedRoles={['ems', 'dispatch']}>
              <PatientsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ems/patients/new"
          element={
            <ProtectedRoute allowedRoles={['ems']}>
              <NewPatientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ems/patients/:id"
          element={
            <ProtectedRoute allowedRoles={['ems', 'dispatch']}>
              <PatientsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ems/reports"
          element={
            <ProtectedRoute allowedRoles={['ems']}>
              <PatientsListPage />
            </ProtectedRoute>
          }
        />

        {/* Dispatch Routes */}
        <Route
          path="/dispatch"
          element={
            <ProtectedRoute allowedRoles={['dispatch', 'police', 'ems']}>
              <DispatchPage />
            </ProtectedRoute>
          }
        />

        {/* Justice Routes */}
        <Route
          path="/justice"
          element={
            <ProtectedRoute allowedRoles={['government', 'judge', 'lawyer', 'prosecutor']}>
              <JusticePage />
            </ProtectedRoute>
          }
        />

        {/* Chat Routes */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedSectors={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedSectors={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedSectors={['ADMIN']}>
              <AuditDashboard />
            </ProtectedRoute>
          }
        />

        {/* Sector Chief Routes */}
        <Route
          path="/sector-management"
          element={
            <ProtectedRoute>
              <SectorManagement />
            </ProtectedRoute>
          }
        />

        {/* Common Routes */}
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <TimelinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Set Game Name (required for first login) */}
        <Route path="/set-game-name" element={<SetGameNamePage />} />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <PhoneProvider>
        <HealthProvider>
          <AuthProvider>
            <SoundProvider>
              <SSEProvider>
                <SSOHandler />
                <HealthBanner />
                <TopBar />
                <div className="pt-12"> {/* Padding for TopBar */}
                  <AppRoutes />
                </div>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: '#121212',
                      border: '1px solid #333333',
                      color: '#FFFFFF',
                      fontFamily: 'Inter, sans-serif',
                    },
                  }}
                />
              </SSEProvider>
            </SoundProvider>
          </AuthProvider>
        </HealthProvider>
      </PhoneProvider>
    </BrowserRouter>
  );
}

export default App;
