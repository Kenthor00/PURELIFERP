/**
 * PURE LIFE OS 3.7 - System Bar
 * Barra di sistema governativa - LIME GREEN
 * Ottimizzata per laptop in-game FiveM
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Shield, AlertTriangle, Activity } from 'lucide-react';

export const SystemBar = ({ alertLevel = 'normale', serverOnline = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('it-IT', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short'
    }).toUpperCase();
  };

  const alertConfig = {
    normale: { 
      color: 'text-[#adff2f]', 
      bg: 'bg-[#adff2f]/10', 
      border: 'border-[#adff2f]/30',
      label: 'NORMALE',
      icon: Activity
    },
    elevato: { 
      color: 'text-[#ffc857]', 
      bg: 'bg-[#ffc857]/10', 
      border: 'border-[#ffc857]/30',
      label: 'ELEVATO',
      icon: AlertTriangle
    },
    critico: { 
      color: 'text-[#ff3b3b]', 
      bg: 'bg-[#ff3b3b]/10', 
      border: 'border-[#ff3b3b]/30',
      label: 'CRITICO',
      icon: AlertTriangle
    },
  };

  const alert = alertConfig[alertLevel] || alertConfig.normale;
  const AlertIcon = alert.icon;

  return (
    <div className="h-9 bg-[#060a0d] border-b border-[#adff2f]/10 flex items-center justify-between px-4 select-none flex-shrink-0">
      {/* Left - System Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#adff2f]" />
          <span className="text-[0.625rem] font-bold tracking-[0.2em] text-[#adff2f]/70">
            PURE LIFE OS
          </span>
          <span className="text-[0.5625rem] text-[#4a6670] tracking-wider font-mono">
            v3.7
          </span>
        </div>
        
        <div className="w-px h-3 bg-[#1b2a30]" />
        
        {/* System Status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-[#adff2f] shadow-[0_0_6px_#adff2f]' : 'bg-[#ff3b3b]'}`} />
          <span className="text-[0.5625rem] text-[#7f9aa3] tracking-wider font-mono">
            {serverOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center - Clock */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="text-[0.5625rem] text-[#4a6670] tracking-wider font-mono">
          {formatDate(currentTime)}
        </span>
        <span className="text-xs font-mono font-bold text-[#adff2f]/80 tracking-[0.15em]">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Right - Alert Level */}
      <div className="flex items-center gap-3">
        {serverOnline ? (
          <Wifi className="w-3 h-3 text-[#adff2f]/60" />
        ) : (
          <WifiOff className="w-3 h-3 text-[#ff3b3b]" />
        )}

        <div className="w-px h-3 bg-[#1b2a30]" />

        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${alert.bg} border ${alert.border}`}>
          <AlertIcon className={`w-2.5 h-2.5 ${alert.color} ${alertLevel === 'critico' ? 'animate-pulse' : ''}`} />
          <span className={`text-[0.5625rem] font-bold tracking-[0.1em] ${alert.color}`}>
            {alert.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemBar;
