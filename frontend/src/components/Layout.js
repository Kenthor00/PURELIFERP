import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import {
  Shield,
  Heart,
  Radio,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
} from 'lucide-react';

const navItems = {
  police: [
    { path: '/lspd', icon: Shield, label: 'Dashboard' },
    { path: '/lspd/cases', icon: Shield, label: 'Casi' },
    { path: '/lspd/warrants', icon: Shield, label: 'Mandati' },
    { path: '/lspd/fines', icon: Shield, label: 'Multe' },
  ],
  ems: [
    { path: '/ems', icon: Heart, label: 'Dashboard' },
    { path: '/ems/patients', icon: Heart, label: 'Pazienti' },
    { path: '/ems/reports', icon: Heart, label: 'Referti' },
  ],
  dispatch: [
    { path: '/dispatch', icon: Radio, label: 'Centro Comando' },
  ],
  admin: [
    { path: '/lspd', icon: Shield, label: 'LSPD' },
    { path: '/ems', icon: Heart, label: 'EMS' },
    { path: '/dispatch', icon: Radio, label: 'Dispatch' },
  ],
};

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { play, enabled: soundEnabled, toggle: toggleSound } = useSound();
  const { connected } = useSSE();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || 'police';
  const items = navItems[role] || navItems.police;

  const handleNavClick = (path) => {
    play('click');
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    play('click');
    logout();
    navigate('/login');
  };

  const getRoleColor = () => {
    switch (role) {
      case 'police': return 'text-blue-500';
      case 'ems': return 'text-red-500';
      case 'dispatch': return 'text-plos-primary';
      default: return 'text-plos-primary';
    }
  };

  return (
    <div className="h-screen flex flex-col tactical-bg">
      {/* Top Header */}
      <header className="h-14 bg-plos-surface border-b border-plos-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              play('click');
              setSidebarOpen(!sidebarOpen);
            }}
            className="lg:hidden text-plos-text-secondary hover:text-plos-primary transition-colors"
            data-testid="sidebar-toggle"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-plos-primary/20 border border-plos-primary flex items-center justify-center">
              <span className="text-plos-primary font-heading font-bold text-sm">PL</span>
            </div>
            <span className="font-heading text-lg tracking-wider hidden sm:block">
              PURE LIFE <span className="text-plos-primary">OS</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {connected ? (
              <Wifi size={16} className="text-plos-primary" />
            ) : (
              <WifiOff size={16} className="text-plos-alert" />
            )}
            <span className={`mono text-xs ${connected ? 'text-plos-primary' : 'text-plos-alert'}`}>
              {connected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => toggleSound()}
            className="text-plos-text-secondary hover:text-plos-primary transition-colors"
            data-testid="sound-toggle"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* User Info */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className={`text-xs mono uppercase ${getRoleColor()}`}>{role}</p>
            </div>
            <div className={`w-8 h-8 border ${getRoleColor().replace('text-', 'border-')} flex items-center justify-center`}>
              <span className={`font-heading font-bold ${getRoleColor()}`}>
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            sidebar w-60 flex flex-col
            fixed lg:relative inset-y-14 lg:inset-y-0 left-0 z-30
            transform lg:transform-none transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="flex-1 py-4 overflow-y-auto">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                className={({ isActive }) =>
                  `sidebar-item ${isActive && location.pathname === item.path ? 'active' : ''}`
                }
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon size={20} />
                <span className="font-heading tracking-wide">{item.label}</span>
                <ChevronRight size={16} className="ml-auto opacity-50" />
              </NavLink>
            ))}

            <div className="my-4 mx-4 border-t border-plos-border" />

            <NavLink
              to="/timeline"
              onClick={() => handleNavClick('/timeline')}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
              data-testid="nav-timeline"
            >
              <Clock size={20} />
              <span className="font-heading tracking-wide">Timeline</span>
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => handleNavClick('/settings')}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
              data-testid="nav-settings"
            >
              <Settings size={20} />
              <span className="font-heading tracking-wide">Impostazioni</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-plos-border">
            <button
              onClick={handleLogout}
              className="sidebar-item w-full text-plos-alert hover:bg-plos-alert/10"
              data-testid="logout-btn"
            >
              <LogOut size={20} />
              <span className="font-heading tracking-wide">Esci</span>
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
