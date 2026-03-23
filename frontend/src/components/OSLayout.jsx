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
  
  // Citizen: Lavoro (Job Board)
  if (isCitizen) {
    modules.push({
      id: 'citizen-jobs',
      path: '/citizen/jobs',
      icon: Briefcase,
      label: 'LAVORO',
      sublabel: 'Bandi & Candidature',
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
  if (hasRole('admin', 'government', 'gov')) {
    modules.push({
      id: 'admin-jobs',
      path: '/admin/jobs',
      icon: Briefcase,
      label: 'BANDI',
      sublabel: 'Gestione Lavori',
      color: '#22d3ee',
    });
  }
  
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#060a0d]">
      {/* System Bar - Top */}
      <SystemBar 
        alertLevel={alertLevel} 
        serverOnline={connected}
      />
      
      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Always expanded for laptop */}
        <aside className="w-56 flex-shrink-0 bg-[#0a0e12] border-r border-[#adff2f]/8 flex flex-col">
          {/* User Info */}
          <div className="px-3 py-2.5 border-b border-[#adff2f]/8">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-md bg-[#adff2f]/10 flex items-center justify-center border border-[#adff2f]/20">
                <span className="text-xs font-bold text-[#adff2f]">
                  {user?.game_name?.[0] || user?.name?.[0] || '?'}
                </span>
              </div>
              
              {/* Info - Always visible on laptop */}
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] font-bold text-[#e6f1f2] truncate leading-tight">
                  {user?.game_name || user?.name || 'Utente'}
                </p>
                <p className="text-[0.5625rem] text-[#adff2f]/50 uppercase tracking-[0.15em] leading-tight">
                  {user?.sector || 'CIVIL'}
                </p>
              </div>
              
              {/* Status Dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                presence === 'online' ? 'bg-[#adff2f] shadow-[0_0_6px_#adff2f]' : 
                presence === 'in_service' ? 'bg-[#ffc857]' : 'bg-[#4a6670]'
              }`} />
            </div>
          </div>
          
          {/* Navigation Modules */}
          <nav className="flex-1 py-1.5 overflow-y-auto scrollbar-thin">
            <div className="space-y-0.5 px-2">
              {modules.map((module, index) => {
                const Icon = module.icon;
                const isActive = location.pathname.startsWith(module.path);
                
                return (
                  <NavLink
                    key={module.id}
                    to={module.path}
                    className={`
                      group flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-200 relative
                      ${isActive 
                        ? 'bg-[#adff2f]/8' 
                        : 'hover:bg-white/3 border border-transparent'
                      }
                    `}
                    style={isActive ? {
                      border: `1px solid ${module.color}25`,
                      boxShadow: `inset 0 0 20px ${module.color}08, 0 0 8px ${module.color}06`
                    } : undefined}
                  >
                    {/* Active bar */}
                    {isActive && (
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ backgroundColor: module.color, boxShadow: `0 0 8px ${module.color}` }}
                      />
                    )}
                    
                    {/* Icon */}
                    <div 
                      className={`
                        w-7 h-7 rounded flex items-center justify-center transition-all flex-shrink-0
                        ${isActive ? '' : 'bg-[#1b2a30]/40 group-hover:bg-[#1b2a30]/60'}
                      `}
                      style={isActive ? { 
                        backgroundColor: `${module.color}15`,
                      } : undefined}
                    >
                      <Icon 
                        size={15} 
                        style={{ color: isActive ? module.color : '#7f9aa3' }}
                        className="transition-colors"
                      />
                    </div>
                    
                    {/* Label - Always visible */}
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-[0.625rem] font-bold tracking-[0.1em] transition-colors leading-tight"
                        style={{ color: isActive ? module.color : '#c0cdd0' }}
                      >
                        {module.label}
                      </p>
                      <p className="text-[0.5rem] text-[#4a6670] tracking-wide leading-tight">
                        {module.sublabel}
                      </p>
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </nav>
          
          {/* Bottom Actions */}
          <div className="border-t border-[#adff2f]/8 p-1.5 space-y-0.5">
            {/* Command Palette */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[#7f9aa3] hover:bg-white/3 transition-colors"
            >
              <Command size={14} />
              <span className="text-[0.625rem] tracking-wider">COMANDI</span>
              <kbd className="ml-auto text-[0.5rem] px-1 py-0.5 bg-[#1b2a30] rounded border border-[#243038] font-mono">
                Ctrl+K
              </kbd>
            </button>
            
            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[#7f9aa3] hover:bg-white/3 transition-colors"
            >
              <Settings size={14} />
              <span className="text-[0.625rem] tracking-wider">IMPOSTAZIONI</span>
            </button>
            
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[#ff3b3b]/70 hover:bg-[#ff3b3b]/8 hover:text-[#ff3b3b] transition-colors"
            >
              <LogOut size={14} />
              <span className="text-[0.625rem] tracking-wider">ESCI</span>
            </button>
          </div>
        </aside>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#060a0d]">
          <div className="p-4 min-h-full">
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
