/**
 * PURE LIFE OS 3.0 - OS Layout
 * Layout Sistema Operativo Governativo
 * NON un sito web, ma un vero OS su tablet
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../context/SSEContext';
import { SystemBar } from './SystemBar';
import { CommandPalette, useCommandPalette } from './CommandPalette';
import {
  Shield,
  Heart,
  Radio,
  Scale,
  Newspaper,
  MessageSquare,
  Users,
  FileText,
  Activity,
  Settings,
  LogOut,
  Command,
  ChevronRight,
  Home,
  ShoppingBag,
  LayoutDashboard,
  Receipt,
  Ticket,
  BookOpen,
  Briefcase,
  CalendarDays,
} from 'lucide-react';

// Navigation modules
const getNavModules = (role) => {
  const modules = [];
  
  // Normalize role - sector values can be 'lspd', 'ems', etc.
  const normalizedRole = role?.toLowerCase();
  
  // Map to check if user is staff (not a citizen)
  const staffRoles = ['police', 'dispatch', 'admin', 'ems', 'government', 'judge', 'lawyer', 'prosecutor', 'weazel', 'news', 'lspd', 'gov'];
  const isCitizen = !staffRoles.includes(normalizedRole);
  
  // Helper: check if role matches any of the allowed values
  const hasRole = (...roles) => roles.includes(normalizedRole);
  
  // Citizen Dashboard - always first for citizens
  if (isCitizen) {
    modules.push({
      id: 'citizen-home',
      path: '/citizen/dashboard',
      icon: LayoutDashboard,
      label: 'PANNELLO',
      sublabel: 'La Tua Dashboard',
      color: '#adff2f',
    });
  }
  
  // City Pulse - Centro Controllo (admin, dispatch, gov)
  if (hasRole('admin', 'dispatch', 'government', 'gov')) {
    modules.push({
      id: 'pulse',
      path: '/pulse',
      icon: Activity,
      label: 'CITY PULSE',
      sublabel: 'Centro Controllo',
      color: '#adff2f',
    });
  }
  
  // LSPD
  if (hasRole('police', 'lspd', 'dispatch', 'admin')) {
    modules.push({
      id: 'lspd',
      path: '/lspd',
      icon: Shield,
      label: 'LSPD',
      sublabel: 'Polizia',
      color: '#3b82f6',
    });
  }
  
  // EMS
  if (hasRole('ems', 'dispatch', 'admin')) {
    modules.push({
      id: 'ems',
      path: '/ems',
      icon: Heart,
      label: 'EMS',
      sublabel: 'Emergenze Mediche',
      color: '#ef4444',
    });
  }
  
  // Dispatch
  if (hasRole('police', 'lspd', 'ems', 'dispatch', 'admin')) {
    modules.push({
      id: 'dispatch',
      path: '/dispatch',
      icon: Radio,
      label: 'DISPATCH',
      sublabel: 'Centrale Operativa',
      color: '#f97316',
    });
  }
  
  // Justice
  if (hasRole('government', 'gov', 'judge', 'lawyer', 'prosecutor', 'admin')) {
    modules.push({
      id: 'justice',
      path: '/justice',
      icon: Scale,
      label: 'GIUSTIZIA',
      sublabel: 'Tribunale',
      color: '#8b5cf6',
    });
  }
  
  // News
  if (hasRole('weazel', 'news', 'admin')) {
    modules.push({
      id: 'news',
      path: '/news/editor',
      icon: Newspaper,
      label: 'WEAZEL',
      sublabel: 'News Network',
      color: '#eab308',
    });
  }
  
  // Staff Ticket Management - only GOV and ADMIN
  if (hasRole('admin', 'government', 'gov')) {
    modules.push({
      id: 'staff-tickets',
      path: '/staff/tickets',
      icon: Ticket,
      label: 'TICKET',
      sublabel: 'Gestione Assistenza',
      color: '#c084fc',
    });
  }

  // Citizen: Multe
  if (isCitizen) {
    modules.push({
      id: 'citizen-fines',
      path: '/citizen/fines',
      icon: Receipt,
      label: 'MULTE',
      sublabel: 'Le Tue Sanzioni',
      color: '#f59e0b',
    });
  }
  
  // Citizen: Mandati
  if (isCitizen) {
    modules.push({
      id: 'citizen-warrants',
      path: '/citizen/warrants',
      icon: Scale,
      label: 'MANDATI',
      sublabel: 'Situazione Legale',
      color: '#ef4444',
    });
  }
  
  // Citizen: Ticket Assistenza
  if (isCitizen) {
    modules.push({
      id: 'citizen-tickets',
      path: '/citizen/tickets',
      icon: Ticket,
      label: 'ASSISTENZA',
      sublabel: 'Richieste & Ticket',
      color: '#8b5cf6',
    });
  }
  
  // Citizen: News
  if (isCitizen) {
    modules.push({
      id: 'citizen-news',
      path: '/citizen/news',
      icon: BookOpen,
      label: 'NEWS',
      sublabel: 'Weazel News',
      color: '#eab308',
    });
  }
  
  // Citizen: Lavoro (Candidature)
  if (isCitizen) {
    modules.push({
      id: 'citizen-recruitment',
      path: '/city/recruitment',
      icon: Briefcase,
      label: 'LAVORO',
      sublabel: 'Candidature & Bandi',
      color: '#22d3ee',
    });
  }
  
  // Citizen: Appuntamenti
  if (isCitizen) {
    modules.push({
      id: 'citizen-appointments',
      path: '/city/appointments',
      icon: CalendarDays,
      label: 'APPUNTAMENTI',
      sublabel: 'Prenotazioni',
      color: '#10b981',
    });
  }
  
  // Documents (always)
  modules.push({
    id: 'documents',
    path: '/documents',
    icon: FileText,
    label: 'DOCUMENTI',
    sublabel: 'Archivio',
    color: '#a78bfa',
  });
  
  // Chat (always)
  modules.push({
    id: 'chat',
    path: '/chat',
    icon: MessageSquare,
    label: 'CHAT',
    sublabel: 'Comunicazioni',
    color: '#06b6d4',
  });
  
  // Marketplace (always)
  modules.push({
    id: 'marketplace',
    path: '/marketplace',
    icon: ShoppingBag,
    label: 'MERCATO',
    sublabel: 'Annunci',
    color: '#f59e0b',
  });

  // City Hub (always) - Annunci, Bandi, Prenotazioni
  modules.push({
    id: 'cityhub',
    path: '/city/announcements',
    icon: Home,
    label: 'SERVIZI',
    sublabel: 'Bandi & Assistenza',
    color: '#22d3ee',
  });
  
  // Admin
  if (role === 'admin') {
    modules.push({
      id: 'admin',
      path: '/admin',
      icon: Users,
      label: 'ADMIN',
      sublabel: 'Gestione Sistema',
      color: '#adff2f',
    });
  }
  
  return modules;
};

export const OSLayout = ({ children }) => {
  const { user, logout, presence } = useAuth();
  const { connected } = useSSE();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isCommandPaletteOpen, setIsOpen: setCommandPaletteOpen } = useCommandPalette();
  
  const [alertLevel, setAlertLevel] = useState('normale');
  
  const role = user?.role || user?.sector?.toLowerCase() || 'citizen';
  const modules = useMemo(() => getNavModules(role), [role]);

  // Fetch alert level from dispatch stats
  useEffect(() => {
    const checkAlertLevel = async () => {
      // This would be fetched from API in real implementation
      // For now, simulate based on random or stored value
      const levels = ['normale', 'normale', 'normale', 'elevato', 'critico'];
      setAlertLevel(levels[Math.floor(Math.random() * levels.length)]);
    };
    
    checkAlertLevel();
    const interval = setInterval(checkAlertLevel, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0a0f12]">
      {/* System Bar - Top */}
      <SystemBar 
        alertLevel={alertLevel} 
        serverOnline={connected}
      />
      
      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Module Navigation */}
        <aside className="w-20 lg:w-64 flex-shrink-0 bg-[#0f1519] border-r border-[#1b2a30] flex flex-col">
          {/* User Info */}
          <div className="p-3 lg:p-4 border-b border-[#1b2a30]">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-lg bg-[#1b2a30] flex items-center justify-center border border-[#243038]">
                <span className="text-sm font-bold text-[#adff2f]">
                  {user?.game_name?.[0] || user?.name?.[0] || '?'}
                </span>
              </div>
              
              {/* Info - Hidden on mobile */}
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="text-xs font-bold text-[#e6f1f2] truncate">
                  {user?.game_name || user?.name || 'Utente'}
                </p>
                <p className="text-[0.625rem] text-[#7f9aa3] uppercase tracking-wider">
                  {user?.sector || 'CIVIL'}
                </p>
              </div>
              
              {/* Status Dot */}
              <div className={`w-2 h-2 rounded-full ${
                presence === 'online' ? 'bg-[#adff2f]' : 
                presence === 'in_service' ? 'bg-[#ffc857]' : 'bg-[#4a6670]'
              }`} />
            </div>
          </div>
          
          {/* Navigation Modules */}
          <nav className="flex-1 py-2 overflow-y-auto">
            <div className="space-y-1 px-2">
              {modules.map((module, index) => {
                const Icon = module.icon;
                const isActive = location.pathname.startsWith(module.path);
                
                return (
                  <NavLink
                    key={module.id}
                    to={module.path}
                    className={`
                      group flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200
                      ${isActive 
                        ? 'bg-[#1b2a30] border border-[#243038]' 
                        : 'hover:bg-[#1b2a30]/50 border border-transparent'
                      }
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Icon Container */}
                    <div 
                      className={`
                        w-9 h-9 rounded-md flex items-center justify-center transition-all
                        ${isActive 
                          ? 'bg-opacity-20' 
                          : 'bg-[#1b2a30] group-hover:bg-opacity-30'
                        }
                      `}
                      style={{ 
                        backgroundColor: isActive ? `${module.color}20` : undefined,
                        boxShadow: isActive ? `0 0 12px ${module.color}20` : undefined
                      }}
                    >
                      <Icon 
                        size={18} 
                        style={{ color: isActive ? module.color : '#7f9aa3' }}
                        className="transition-colors"
                      />
                    </div>
                    
                    {/* Label - Hidden on mobile */}
                    <div className="hidden lg:block flex-1 min-w-0">
                      <p 
                        className="text-[0.6875rem] font-bold tracking-wider transition-colors"
                        style={{ color: isActive ? module.color : '#e6f1f2' }}
                      >
                        {module.label}
                      </p>
                      <p className="text-[0.5625rem] text-[#4a6670] tracking-wide">
                        {module.sublabel}
                      </p>
                    </div>
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <div 
                        className="hidden lg:block w-1 h-8 rounded-full"
                        style={{ backgroundColor: module.color }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
          
          {/* Bottom Actions */}
          <div className="border-t border-[#1b2a30] p-2 space-y-1">
            {/* Command Palette */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[#7f9aa3] hover:bg-[#1b2a30]/50 transition-colors"
            >
              <Command size={16} />
              <span className="hidden lg:inline text-[0.6875rem] tracking-wider">COMANDI</span>
              <kbd className="hidden lg:inline ml-auto text-[0.5625rem] px-1.5 py-0.5 bg-[#1b2a30] rounded border border-[#243038]">
                ⌘K
              </kbd>
            </button>
            
            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[#7f9aa3] hover:bg-[#1b2a30]/50 transition-colors"
            >
              <Settings size={16} />
              <span className="hidden lg:inline text-[0.6875rem] tracking-wider">IMPOSTAZIONI</span>
            </button>
            
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[#ff3b3b] hover:bg-[#ff3b3b]/10 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden lg:inline text-[0.6875rem] tracking-wider">ESCI</span>
            </button>
          </div>
        </aside>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0f12]">
          <div className="p-4 lg:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  );
};

export default OSLayout;
