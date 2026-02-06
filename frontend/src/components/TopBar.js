import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  ChevronLeft, 
  Home, 
  RefreshCw, 
  Bell, 
  Menu,
  X,
  UserPlus,
  Calendar,
  Megaphone,
  Tv,
  Building2,
  Shield,
  Ambulance,
  Radio,
  Newspaper,
  Users,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * TopBar Globale - Sistema Operativo Governativo
 * Con notifiche real-time e navigazione rapida
 */
export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, token } = useAuth();
  
  // State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Refs per click outside
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  // Fetch notifiche ogni 15 secondi
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, token]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.unread || 0);
    } catch (err) {
      console.error('Error fetching notifications count:', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/notifications/list?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notifId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setShowNotifications(false);
    
    // Naviga alla risorsa
    if (notif.entity_type && notif.entity_id) {
      switch (notif.entity_type) {
        case 'recruitment':
          navigate('/city/recruitment');
          break;
        case 'appointment':
          navigate('/city/appointments');
          break;
        case 'announcement':
          navigate('/city/announcements');
          break;
        case 'ad_slot':
          navigate('/city/advertising');
          break;
        default:
          break;
      }
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
    setShowMenu(false);
  };

  const handleBack = () => {
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

  const getNotificationIcon = (type) => {
    if (type.includes('recruitment')) return UserPlus;
    if (type.includes('appointment')) return Calendar;
    if (type.includes('announcement')) return Megaphone;
    if (type.includes('ad_slot')) return Tv;
    return Bell;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Ora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  // Menu rapido
  const menuItems = [
    { label: 'City Hub', path: '/city', icon: Building2, public: true },
    { label: 'Reclutamento', path: '/city/recruitment', icon: UserPlus },
    { label: 'Appuntamenti', path: '/city/appointments', icon: Calendar },
    { label: 'Annunci', path: '/city/announcements', icon: Megaphone, public: true },
    { label: 'Pubblicità', path: '/city/advertising', icon: Tv },
    { divider: true },
    { label: 'LSPD', path: '/lspd', icon: Shield, sectors: ['LSPD', 'ADMIN'] },
    { label: 'EMS', path: '/ems', icon: Ambulance, sectors: ['EMS', 'ADMIN'] },
    { label: 'Dispatch', path: '/dispatch', icon: Radio, sectors: ['DISPATCH', 'ADMIN'] },
    { label: 'News', path: '/city/news', icon: Newspaper, sectors: ['NEWS', 'ADMIN'] },
    { divider: true },
    { label: 'Admin', path: '/admin', icon: Users, sectors: ['ADMIN'] },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.divider) return true;
    if (item.public) return true;
    if (!isAuthenticated) return false;
    if (!item.sectors) return true;
    return item.sectors.includes(user?.sector?.toUpperCase());
  });

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

        {/* Right: Menu + Notifications + Refresh + User info */}
        <div className="flex items-center gap-1">
          {/* User info (desktop) */}
          {isAuthenticated && user && (
            <div className="hidden md:flex items-center gap-2 text-xs text-plos-text-secondary mr-2">
              <span className="text-plos-primary font-medium">
                {user.game_name || user.name}
              </span>
              <span className="text-plos-text-muted">|</span>
              <span>{user.grade}</span>
            </div>
          )}

          {/* Quick Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setShowMenu(!showMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1 px-3 py-2 text-plos-text-secondary hover:text-plos-primary hover:bg-plos-primary/10 transition-colors"
              data-testid="topbar-menu"
            >
              {showMenu ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Menu Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-plos-surface border border-plos-border shadow-xl z-50">
                <div className="py-1 max-h-80 overflow-y-auto">
                  {visibleMenuItems.map((item, idx) => 
                    item.divider ? (
                      <div key={idx} className="border-t border-plos-border my-1" />
                    ) : (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setShowMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-plos-primary/10 transition-colors ${
                          location.pathname === item.path ? 'bg-plos-primary/10 text-plos-primary' : 'text-plos-text'
                        }`}
                      >
                        <item.icon size={16} className="text-plos-text-muted" />
                        {item.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotifications}
                className="relative flex items-center gap-1 px-3 py-2 text-plos-text-secondary hover:text-plos-primary hover:bg-plos-primary/10 transition-colors"
                data-testid="topbar-notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-plos-surface border border-plos-border shadow-xl z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-plos-border">
                    <span className="font-heading text-sm">NOTIFICHE</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-plos-primary hover:underline"
                      >
                        Segna tutte lette
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-plos-text-muted text-sm">
                        Caricamento...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="mx-auto text-plos-text-muted mb-2" size={32} />
                        <p className="text-plos-text-muted text-sm">Nessuna notifica</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const Icon = getNotificationIcon(notif.notification_type);
                        return (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full flex items-start gap-3 p-3 text-left border-b border-plos-border hover:bg-plos-primary/5 transition-colors ${
                              !notif.is_read ? 'bg-plos-primary/10' : ''
                            }`}
                          >
                            <div className={`p-2 rounded ${!notif.is_read ? 'bg-plos-primary/20' : 'bg-plos-surface'}`}>
                              <Icon size={16} className={!notif.is_read ? 'text-plos-primary' : 'text-plos-text-muted'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!notif.is_read ? 'text-plos-text' : 'text-plos-text-secondary'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-plos-text-muted line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-plos-text-muted">
                                  {formatTime(notif.created_at)}
                                </span>
                                {notif.sender_game_name && (
                                  <span className="text-[10px] text-plos-text-muted">
                                    • {notif.sender_game_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!notif.is_read && (
                              <div className="w-2 h-2 bg-plos-primary rounded-full flex-shrink-0 mt-2" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Refresh */}
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
    '/set-game-name': 'Imposta Nome',
    '/city': 'City Hub',
    '/city/news': 'Weazel News',
    '/city/events': 'Eventi',
    '/city/recruitment': 'Reclutamento',
    '/city/appointments': 'Appuntamenti',
    '/city/announcements': 'Annunci',
    '/city/advertising': 'Pubblicità',
    '/lspd': 'LSPD',
    '/lspd/cases': 'Casi LSPD',
    '/lspd/warrants': 'Mandati',
    '/lspd/fines': 'Multe',
    '/ems': 'EMS',
    '/ems/patients': 'Pazienti',
    '/dispatch': 'Dispatch',
    '/justice': 'Governo & Giustizia',
    '/admin': 'Amministrazione',
    '/admin/users': 'Gestione Utenti',
    '/admin/audit': 'Audit Log',
    '/sector-management': 'Gestione Settore',
    '/chat': 'Service Chat',
  };
  
  // Match esatto o pattern parziale
  if (routes[pathname]) {
    return routes[pathname];
  }
  
  // Check patterns
  if (pathname.startsWith('/lspd/')) return 'LSPD';
  if (pathname.startsWith('/ems/')) return 'EMS';
  if (pathname.startsWith('/city/news/')) return 'Articolo';
  if (pathname.startsWith('/admin/')) return 'Admin';
  
  return 'PLOS';
}

export default TopBar;
