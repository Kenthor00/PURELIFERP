/**
 * PURE LIFE OS 3.0 - System Bar
 * Barra di sistema governativa in alto - NON una navbar
 * Stile: Intestazione di sistema operativo
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Shield, AlertTriangle, Activity } from 'lucide-react';

export const SystemBar = ({ alertLevel = 'normale', serverOnline = true }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
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
    <div className="h-10 bg-[#0a0f12] border-b border-[#1b2a30] flex items-center justify-between px-4 select-none flex-shrink-0">
      {/* Left - System Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#adff2f]" />
          <span className="text-[0.6875rem] font-bold tracking-[0.15em] text-[#7f9aa3]">
            PURE LIFE OS
          </span>
          <span className="text-[0.625rem] text-[#4a6670] tracking-wider">
            v3.0
          </span>
        </div>
        
        {/* Separator */}
        <div className="w-px h-4 bg-[#1b2a30]" />
        
        {/* System Status */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-[#adff2f]' : 'bg-[#ff3b3b]'}`} />
          <span className="text-[0.625rem] text-[#7f9aa3] tracking-wider">
            {serverOnline ? 'SISTEMA ATTIVO' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center - Clock */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
        <span className="text-[0.625rem] text-[#4a6670] tracking-wider">
          {formatDate(currentTime)}
        </span>
        <span className="text-sm font-mono font-bold text-[#e6f1f2] tracking-wider">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Right - Alert Level + Server Status */}
      <div className="flex items-center gap-4">
        {/* Server Connection */}
        <div className="flex items-center gap-2">
          {serverOnline ? (
            <Wifi className="w-3.5 h-3.5 text-[#adff2f]" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[#ff3b3b]" />
          )}
          <span className="text-[0.625rem] text-[#7f9aa3] tracking-wider hidden sm:inline">
            SERVER
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-[#1b2a30]" />

        {/* City Alert Level */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded ${alert.bg} border ${alert.border}`}>
          <AlertIcon className={`w-3 h-3 ${alert.color} ${alertLevel === 'critico' ? 'animate-pulse' : ''}`} />
          <span className={`text-[0.625rem] font-bold tracking-[0.1em] ${alert.color}`}>
            ALLERTA: {alert.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemBar;
