/**
 * PURE LIFE OS 3.0 - Command Palette
 * Azioni rapide con Ctrl+K - Stile macOS Spotlight / VS Code
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Command, FileText, Users, Shield, Heart, Radio, Gavel,
  Newspaper, MessageSquare, Bell, Settings, Home, LogOut,
  Plus, Trash2, Eye, Edit, Calendar, AlertTriangle, BarChart3,
  X, ArrowRight, Clock, Star
} from 'lucide-react';

// Azioni disponibili per tipo utente
const COMMAND_ACTIONS = [
  // Navigazione
  { id: 'home', label: 'Vai alla Home', keywords: ['home', 'dashboard', 'principale'], icon: Home, action: 'navigate', path: '/', category: 'Navigazione' },
  { id: 'lspd', label: 'LSPD Dashboard', keywords: ['lspd', 'polizia', 'police'], icon: Shield, action: 'navigate', path: '/lspd', category: 'Navigazione', roles: ['LSPD', 'ADMIN', 'DISPATCH'] },
  { id: 'ems', label: 'EMS Dashboard', keywords: ['ems', 'medico', 'ospedale'], icon: Heart, action: 'navigate', path: '/ems', category: 'Navigazione', roles: ['EMS', 'ADMIN', 'DISPATCH'] },
  { id: 'dispatch', label: 'Centro Dispatch', keywords: ['dispatch', 'chiamate', 'emergenze'], icon: Radio, action: 'navigate', path: '/dispatch', category: 'Navigazione', roles: ['DISPATCH', 'ADMIN', 'LSPD', 'EMS'] },
  { id: 'justice', label: 'Governo & Giustizia', keywords: ['giustizia', 'tribunale', 'governo'], icon: Gavel, action: 'navigate', path: '/justice', category: 'Navigazione', roles: ['GOVERNMENT', 'ADMIN'] },
  { id: 'news', label: 'Weazel News', keywords: ['news', 'notizie', 'articoli'], icon: Newspaper, action: 'navigate', path: '/news/editor', category: 'Navigazione', roles: ['NEWS', 'ADMIN'] },
  { id: 'chat', label: 'Service Chat', keywords: ['chat', 'messaggi'], icon: MessageSquare, action: 'navigate', path: '/chat', category: 'Navigazione' },
  { id: 'city', label: 'City Hub', keywords: ['city', 'città', 'pubblico'], icon: Home, action: 'navigate', path: '/city', category: 'Navigazione' },
  
  // Admin
  { id: 'users', label: 'Gestione Utenti', keywords: ['utenti', 'users', 'gestione'], icon: Users, action: 'navigate', path: '/admin/users', category: 'Admin', roles: ['ADMIN'] },
  { id: 'audit', label: 'Audit Log', keywords: ['audit', 'log', 'storia'], icon: Clock, action: 'navigate', path: '/admin/audit', category: 'Admin', roles: ['ADMIN'] },
  { id: 'settings', label: 'Impostazioni', keywords: ['settings', 'impostazioni'], icon: Settings, action: 'navigate', path: '/settings', category: 'Admin', roles: ['ADMIN'] },
  
  // Azioni rapide LSPD
  { id: 'new-case', label: 'Nuovo Caso LSPD', keywords: ['nuovo', 'caso', 'crea'], icon: Plus, action: 'navigate', path: '/lspd/cases/new', category: 'Azioni LSPD', roles: ['LSPD', 'ADMIN'] },
  { id: 'new-warrant', label: 'Nuovo Mandato', keywords: ['mandato', 'nuovo'], icon: Plus, action: 'navigate', path: '/lspd/warrants', category: 'Azioni LSPD', roles: ['LSPD', 'ADMIN'] },
  { id: 'new-fine', label: 'Nuova Multa', keywords: ['multa', 'nuova'], icon: Plus, action: 'navigate', path: '/lspd/fines', category: 'Azioni LSPD', roles: ['LSPD', 'ADMIN'] },
  
  // Azioni rapide EMS
  { id: 'new-patient', label: 'Nuovo Paziente', keywords: ['paziente', 'nuovo'], icon: Plus, action: 'navigate', path: '/ems', category: 'Azioni EMS', roles: ['EMS', 'ADMIN'] },
  { id: 'new-report', label: 'Nuovo Referto', keywords: ['referto', 'nuovo'], icon: Plus, action: 'navigate', path: '/ems/reports', category: 'Azioni EMS', roles: ['EMS', 'ADMIN'] },
  
  // Azioni rapide Dispatch
  { id: 'new-call', label: 'Nuova Chiamata', keywords: ['chiamata', 'emergenza', 'nuova'], icon: AlertTriangle, action: 'navigate', path: '/dispatch', category: 'Azioni Dispatch', roles: ['DISPATCH', 'ADMIN'] },
  
  // Azioni rapide Justice
  { id: 'new-legal', label: 'Nuova Pratica Legale', keywords: ['pratica', 'legale', 'nuova'], icon: Plus, action: 'navigate', path: '/justice/cases/new', category: 'Azioni Justice', roles: ['GOVERNMENT', 'ADMIN'] },
  
  // Sistema
  { id: 'logout', label: 'Esci / Logout', keywords: ['logout', 'esci', 'disconnetti'], icon: LogOut, action: 'logout', category: 'Sistema' },
  { id: 'notifications', label: 'Notifiche', keywords: ['notifiche', 'alerts'], icon: Bell, action: 'navigate', path: '/notifications', category: 'Sistema' },
];

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Filtra azioni basate su ruolo utente
  const availableActions = useMemo(() => {
    if (!user) return COMMAND_ACTIONS.filter(a => !a.roles);
    
    return COMMAND_ACTIONS.filter(action => {
      if (!action.roles) return true;
      return action.roles.includes(user.sector) || action.roles.includes('ADMIN') && user.sector === 'ADMIN';
    });
  }, [user]);

  // Filtra azioni basate su query
  const filteredActions = useMemo(() => {
    if (!query.trim()) {
      // Mostra recenti + più usate
      const recent = recentCommands.slice(0, 3);
      const others = availableActions.filter(a => !recent.find(r => r.id === a.id)).slice(0, 7);
      return [...recent, ...others];
    }

    const lowerQuery = query.toLowerCase();
    return availableActions.filter(action => 
      action.label.toLowerCase().includes(lowerQuery) ||
      action.keywords.some(k => k.includes(lowerQuery))
    ).slice(0, 10);
  }, [query, availableActions, recentCommands]);

  // Raggruppa per categoria
  const groupedActions = useMemo(() => {
    const groups = {};
    filteredActions.forEach(action => {
      const cat = action.category || 'Altro';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(action);
    });
    return groups;
  }, [filteredActions]);

  // Esegui azione
  const executeAction = useCallback((action) => {
    // Salva nei recenti
    setRecentCommands(prev => {
      const filtered = prev.filter(r => r.id !== action.id);
      return [action, ...filtered].slice(0, 5);
    });

    if (action.action === 'navigate') {
      navigate(action.path);
    } else if (action.action === 'logout') {
      logout();
    } else if (action.action === 'custom' && action.handler) {
      action.handler();
    }

    onClose();
    setQuery('');
    setSelectedIndex(0);
  }, [navigate, logout, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            executeAction(filteredActions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredActions, executeAction, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <Command size={18} className="text-plos-primary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Cerca azioni, pagine, comandi..."
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-slate-500"
          />
          <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded border border-slate-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {Object.entries(groupedActions).map(([category, actions]) => (
            <div key={category} className="mb-3">
              <div className="px-3 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {category}
              </div>
              {actions.map((action, idx) => {
                const globalIndex = filteredActions.indexOf(action);
                const Icon = action.icon;
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <button
                    key={action.id}
                    data-index={globalIndex}
                    onClick={() => executeAction(action)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected 
                        ? 'bg-plos-primary/20 text-white' 
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${isSelected ? 'bg-plos-primary/30' : 'bg-slate-800'}`}>
                      <Icon size={16} className={isSelected ? 'text-plos-primary' : 'text-slate-400'} />
                    </div>
                    <span className="flex-1 font-medium">{action.label}</span>
                    {isSelected && (
                      <ArrowRight size={14} className="text-plos-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredActions.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              <Search size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nessun risultato per "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↑↓</kbd> naviga
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↵</kbd> seleziona
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Command size={12} />
            <span>PURE LIFE OS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook per aprire Command Palette con Ctrl+K
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
};

export default CommandPalette;
