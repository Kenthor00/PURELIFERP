/**
 * PURE LIFE OS 3.0 - Connection Status Component
 * Mostra stato connessione real-time (WebSocket/SSE)
 */

import React from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export const ConnectionStatus = ({ status = 'disconnected', showLabel = true, size = 'default' }) => {
  const sizes = {
    small: { dot: 'w-2 h-2', text: 'text-xs', icon: 12 },
    default: { dot: 'w-2.5 h-2.5', text: 'text-sm', icon: 14 },
    large: { dot: 'w-3 h-3', text: 'text-base', icon: 16 }
  };

  const s = sizes[size] || sizes.default;

  const configs = {
    connected: {
      color: 'bg-lime-500',
      borderColor: 'border-lime-500/30',
      textColor: 'text-lime-500',
      bgColor: 'bg-lime-500/10',
      label: 'CONNESSO',
      icon: Wifi
    },
    degraded: {
      color: 'bg-orange-500',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      label: 'DEGRADATO',
      icon: AlertTriangle
    },
    connecting: {
      color: 'bg-blue-500 animate-pulse',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'CONNESSIONE...',
      icon: Wifi
    },
    disconnected: {
      color: 'bg-red-500',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'OFFLINE',
      icon: WifiOff
    }
  };

  const config = configs[status] || configs.disconnected;
  const Icon = config.icon;

  if (!showLabel) {
    return (
      <div 
        className={`${s.dot} rounded-full ${config.color} ${status === 'connected' ? 'status-indicator' : ''}`}
        title={config.label}
      />
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} border ${config.borderColor}`}
    >
      <div className={`${s.dot} rounded-full ${config.color}`} />
      <Icon size={s.icon} className={config.textColor} />
      <span className={`${s.text} font-medium ${config.textColor} font-mono tracking-wider`}>
        {config.label}
      </span>
    </div>
  );
};

/**
 * Mini connection indicator per TopBar
 */
export const ConnectionDot = ({ status = 'disconnected' }) => {
  const colors = {
    connected: 'bg-lime-500',
    degraded: 'bg-orange-500 animate-pulse',
    connecting: 'bg-blue-500 animate-pulse',
    disconnected: 'bg-red-500'
  };

  return (
    <span 
      className={`w-2 h-2 rounded-full ${colors[status] || colors.disconnected} inline-block`}
      title={status.toUpperCase()}
    />
  );
};

export default ConnectionStatus;
