import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import { CommandPalette, useCommandPalette } from './CommandPalette';
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
  MessageSquare,
  Scale,
  Building2,
  Newspaper,
  Circle,
  Command,
} from 'lucide-react';

// Mapping stati presenza
const PRESENCE_CONFIG = {
  online: { color: 'text-green-500', bg: 'bg-green-500', label: 'ONLINE' },
  in_service: { color: 'text-blue-500', bg: 'bg-blue-500', label: 'IN SERVIZIO' },
  busy: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'OCCUPATO' },
  offline: { color: 'text-gray-500', bg: 'bg-gray-500', label: 'OFFLINE' }
};

const getNavItems = (role) => {
  const items = [];
  
  // Role-specific items
  if (['police', 'dispatch', 'admin'].includes(role)) {
    items.push(
      { path: '/lspd', icon: Shield, label: 'LSPD', color: 'text-blue-500' },
    );
  }
  
  if (['ems', 'dispatch', 'admin'].includes(role)) {
    items.push(
      { path: '/ems', icon: Heart, label: 'EMS', color: 'text-red-500' },
    );
  }
  
  if (['police', 'ems', 'dispatch', 'admin'].includes(role)) {
    items.push(
      { path: '/dispatch', icon: Radio, label: 'Dispatch', color: 'text-plos-primary' },
    );
  }
  
  if (['government', 'judge', 'lawyer', 'prosecutor', 'admin'].includes(role)) {
    items.push(
      { path: '/justice', icon: Scale, label: 'Giustizia', color: 'text-purple-500' },
    );
  }
  
  if (['weazel', 'admin'].includes(role)) {
    items.push(
      { path: '/city/news', icon: Newspaper, label: 'Weazel News', color: 'text-yellow-500' },
    );
  }
  
  // Common items
  items.push(
    { path: '/chat', icon: MessageSquare, label: 'Chat', color: 'text-plos-primary' },
  );
  
  return items;
};

export const Layout = ({ children }) => {
  const { user, logout, presence } = useAuth();
  const { play, enabled: soundEnabled, toggle: toggleSound } = useSound();
  const { connected } = useSSE();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role || 'citizen';
  const items = getNavItems(role);

  const handleNavClick = (path) => {
    play('click');
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    play('click');
    await logout();
    navigate('/login');
  };

  const getRoleColor = () => {
    switch (role) {
      case 'police': return 'text-blue-500';
      case 'ems': return 'text-red-500';
      case 'dispatch': return 'text-plos-primary';
      case 'government': return 'text-yellow-500';
      case 'judge': return 'text-purple-500';
      case 'lawyer': return 'text-purple-400';
      case 'prosecutor': return 'text-purple-400';
      case 'weazel': return 'text-yellow-500';
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
            <div className="w-8 h-8 bg-plos-primary/20 border border-plos-primary flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="PL" 
                className="w-full h-full object-contain"
                onError={(e) => { 
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-plos-primary font-heading font-bold text-sm">PL</span>';
                }}
              />
            </div>
            <span className="font-heading text-lg tracking-wider hidden sm:block">
              PURE LIFE <span className="text-plos-primary">OS</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* City Hub Link */}
          <button
            onClick={() => {
              play('click');
              navigate('/city');
            }}
            className="text-plos-text-secondary hover:text-plos-primary transition-colors hidden sm:flex items-center gap-1 text-sm"
          >
            <Building2 size={16} />
            <span>City</span>
          </button>

          {/* User Presence Status */}
          <div className="flex items-center gap-2 text-sm">
            <Circle size={8} className={`fill-current ${(PRESENCE_CONFIG[presence] || PRESENCE_CONFIG.offline).color}`} />
            <span className={`mono text-xs ${(PRESENCE_CONFIG[presence] || PRESENCE_CONFIG.offline).color}`}>
              {(PRESENCE_CONFIG[presence] || PRESENCE_CONFIG.offline).label}
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

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-colors text-sm font-heading"
            data-testid="logout-btn"
            title="Esci dal sistema"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">ESCI</span>
          </button>
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
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <item.icon size={20} className={item.color} />
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
