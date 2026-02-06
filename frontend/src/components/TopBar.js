import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Home, RefreshCw } from 'lucide-react';

/**
 * TopBar Globale - Sempre visibile
 * Funziona anche in iframe/lb-phone
 */
export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const handleBack = () => {
    // Prova history.back, con fallback a home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleHome();
    }
  };

  const handleHome = () => {
    if (!isAuthenticated) {
      navigate('/city');
      return;
    }

    // Dashboard in base al settore
    const sector = user?.sector?.toUpperCase();
    switch (sector) {
      case 'LSPD':
        navigate('/lspd');
        break;
      case 'EMS':
        navigate('/ems');
        break;
      case 'DISPATCH':
        navigate('/dispatch');
        break;
      case 'GOV':
        navigate('/justice');
        break;
      case 'NEWS':
        navigate('/city/news');
        break;
      case 'ADMIN':
        navigate('/admin');
        break;
      default:
        navigate('/city');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Non mostrare su login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-40 bg-plos-surface/95 backdrop-blur-sm border-b border-plos-border h-12"
      data-testid="top-bar"
    >
      <div className="h-full max-w-7xl mx-auto px-2 flex items-center justify-between">
        {/* Left: Back + Home */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-3 py-2 text-plos-text-secondary hover:text-plos-primary hover:bg-plos-primary/10 transition-colors"
            data-testid="topbar-back"
          >
            <ChevronLeft size={18} />
            <span className="text-xs font-heading hidden sm:inline">INDIETRO</span>
          </button>
          
          <button
            onClick={handleHome}
            className="flex items-center gap-1 px-3 py-2 text-plos-text-secondary hover:text-plos-primary hover:bg-plos-primary/10 transition-colors"
            data-testid="topbar-home"
          >
            <Home size={18} />
            <span className="text-xs font-heading hidden sm:inline">HOME</span>
          </button>
        </div>

        {/* Center: Current location indicator */}
        <div className="flex-1 text-center">
          <span className="text-xs text-plos-text-muted mono">
            {getLocationLabel(location.pathname)}
          </span>
        </div>

        {/* Right: Refresh + User info */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-plos-text-secondary mr-2">
              <span className="text-plos-primary font-medium">
                {user.game_name || user.name}
              </span>
              <span className="text-plos-text-muted">|</span>
              <span>{user.grade}</span>
            </div>
          )}
          
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-3 py-2 text-plos-text-secondary hover:text-plos-primary hover:bg-plos-primary/10 transition-colors"
            data-testid="topbar-refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Restituisce label per il percorso corrente
 */
function getLocationLabel(pathname) {
  const routes = {
    '/': 'Home',
    '/login': 'Login',
    '/city': 'City Hub',
    '/city/news': 'Weazel News',
    '/lspd': 'LSPD',
    '/lspd/cases': 'Casi LSPD',
    '/ems': 'EMS',
    '/ems/patients': 'Pazienti',
    '/dispatch': 'Dispatch',
    '/justice': 'Giustizia',
    '/chat': 'Chat',
    '/timeline': 'Timeline',
    '/settings': 'Impostazioni',
    '/admin': 'Amministrazione',
    '/admin/users': 'Gestione Utenti',
    '/admin/audit': 'Audit Log',
  };

  // Match esatto o parziale
  for (const [path, label] of Object.entries(routes)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return label;
    }
  }

  return 'PURE LIFE OS';
}

export default TopBar;
