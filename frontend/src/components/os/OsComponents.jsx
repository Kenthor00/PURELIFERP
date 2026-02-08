/**
 * PURE LIFE OS 3.0 - WOW Design System Components
 * Componenti riutilizzabili per UI premium consistente
 */
import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

/**
 * OS Stat Card - Card statistiche premium
 */
export const OsStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color = 'plos-primary',
  onClick,
  trend,
  subtitle
}) => {
  const colorMap = {
    'blue': { bg: 'from-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'rgba(59,130,246,0.1)' },
    'orange': { bg: 'from-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'rgba(249,115,22,0.1)' },
    'red': { bg: 'from-red-500/10', border: 'border-red-500/30', text: 'text-red-400', glow: 'rgba(239,68,68,0.1)' },
    'green': { bg: 'from-green-500/10', border: 'border-green-500/30', text: 'text-green-400', glow: 'rgba(34,197,94,0.1)' },
    'purple': { bg: 'from-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'rgba(168,85,247,0.1)' },
    'cyan': { bg: 'from-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.1)' },
    'plos-primary': { bg: 'from-plos-primary/10', border: 'border-plos-primary/30', text: 'text-plos-primary', glow: 'rgba(0,255,156,0.1)' },
  };
  
  const c = colorMap[color] || colorMap['plos-primary'];

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-gradient-to-br ${c.bg} to-plos-bg/50 border ${c.border} rounded-lg p-5 ${onClick ? 'cursor-pointer' : ''} group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
      style={{ '--stat-glow': c.glow }}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${c.text} opacity-60`} 
           style={{ background: `linear-gradient(90deg, transparent, currentColor, transparent)` }} />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at top, var(--stat-glow) 0%, transparent 70%)` }} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-plos-text-muted text-[10px] tracking-[0.15em] font-heading mb-2 uppercase">
            {label}
          </p>
          <p className={`font-heading text-3xl lg:text-4xl font-bold tracking-tight ${c.text}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-plos-text-muted text-xs mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`mt-2 text-xs flex items-center gap-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span className={trend < 0 ? 'rotate-180' : ''}>↑</span>
              <span>{Math.abs(trend)}% oggi</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-black/40 border ${c.border} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={22} className={c.text} />
          </div>
        )}
      </div>
      
      {onClick && (
        <div className="mt-4 pt-3 border-t border-plos-border/30 flex items-center gap-1 text-plos-text-muted text-xs group-hover:text-plos-primary transition-colors">
          <span className="tracking-wider">APRI DETTAGLI</span>
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );
};

/**
 * OS Section Header - Header sezione con titolo e azione
 */
export const OsSectionHeader = ({ icon: Icon, title, action, actionLabel, color = 'plos-primary' }) => {
  const colorMap = {
    'blue': 'bg-blue-500/20 text-blue-400',
    'orange': 'bg-orange-500/20 text-orange-400',
    'red': 'bg-red-500/20 text-red-400',
    'green': 'bg-green-500/20 text-green-400',
    'purple': 'bg-purple-500/20 text-purple-400',
    'plos-primary': 'bg-plos-primary/20 text-plos-primary',
  };
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-plos-border/50" 
         style={{ background: `linear-gradient(to right, ${color === 'blue' ? 'rgba(59,130,246,0.05)' : color === 'orange' ? 'rgba(249,115,22,0.05)' : color === 'red' ? 'rgba(239,68,68,0.05)' : color === 'green' ? 'rgba(34,197,94,0.05)' : 'rgba(0,255,156,0.05)'}, transparent)` }}>
      <h2 className="font-heading text-sm tracking-wider flex items-center gap-2">
        {Icon && (
          <div className={`p-1.5 rounded ${colorMap[color] || colorMap['plos-primary']}`}>
            <Icon size={14} />
          </div>
        )}
        {title}
      </h2>
      {action && (
        <button onClick={action} className="text-plos-primary text-[10px] tracking-wider hover:underline flex items-center gap-1">
          {actionLabel || 'VEDI TUTTI'} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
};

/**
 * OS Panel - Pannello contenitore con gradient
 */
export const OsPanel = ({ children, className = '' }) => (
  <div className={`bg-gradient-to-br from-plos-surface to-plos-bg border border-plos-border rounded-lg overflow-hidden ${className}`}>
    {children}
  </div>
);

/**
 * OS List Row - Riga lista premium con hover
 */
export const OsListRow = ({ children, onClick, index = 0 }) => (
  <div
    onClick={onClick}
    className={`p-4 hover:bg-white/[0.02] ${onClick ? 'cursor-pointer' : ''} transition-all duration-200 group border-b border-plos-border/20 last:border-0`}
    style={{ animationDelay: `${index * 50}ms` }}
  >
    {children}
  </div>
);

/**
 * OS Badge - Badge status
 */
export const OsBadge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-plos-surface text-plos-text-secondary border-plos-border',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    primary: 'bg-plos-primary/20 text-plos-primary border-plos-primary/30',
  };
  
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
};

/**
 * OS Empty State - Stato vuoto elegante
 */
export const OsEmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <div className="p-8 text-center">
    {Icon && <Icon size={40} className="mx-auto mb-4 text-plos-text-muted/30" />}
    <p className="text-plos-text-secondary font-medium">{title}</p>
    {description && <p className="text-plos-text-muted text-sm mt-1">{description}</p>}
    {action && (
      <button onClick={action} className="mt-4 text-sm text-plos-primary hover:underline flex items-center gap-1 mx-auto">
        + {actionLabel || 'Crea nuovo'}
      </button>
    )}
  </div>
);

/**
 * OS Skeleton - Skeleton loader
 */
export const OsSkeleton = ({ rows = 3, className = '' }) => (
  <div className={`space-y-3 p-4 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-plos-surface rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-plos-surface/50 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);

/**
 * OS Quick Action Card - Card azione rapida
 */
export const OsQuickAction = ({ icon: Icon, title, subtitle, onClick, color = 'plos-primary' }) => {
  const colorMap = {
    'blue': { bg: 'from-blue-500/10', border: 'border-blue-500/20 hover:border-blue-500/50', shadow: 'hover:shadow-blue-500/10', text: 'text-blue-400', circle: 'bg-blue-500/5' },
    'orange': { bg: 'from-orange-500/10', border: 'border-orange-500/20 hover:border-orange-500/50', shadow: 'hover:shadow-orange-500/10', text: 'text-orange-400', circle: 'bg-orange-500/5' },
    'red': { bg: 'from-red-500/10', border: 'border-red-500/20 hover:border-red-500/50', shadow: 'hover:shadow-red-500/10', text: 'text-red-400', circle: 'bg-red-500/5' },
    'green': { bg: 'from-green-500/10', border: 'border-green-500/20 hover:border-green-500/50', shadow: 'hover:shadow-green-500/10', text: 'text-green-400', circle: 'bg-green-500/5' },
    'plos-primary': { bg: 'from-plos-primary/10', border: 'border-plos-primary/20 hover:border-plos-primary/50', shadow: 'hover:shadow-plos-primary/10', text: 'text-plos-primary', circle: 'bg-plos-primary/5' },
  };
  
  const c = colorMap[color] || colorMap['plos-primary'];
  
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden p-5 bg-gradient-to-br ${c.bg} to-transparent border ${c.border} rounded-lg hover:shadow-lg ${c.shadow} transition-all duration-300 text-left w-full`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 ${c.circle} rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500`} />
      {Icon && <Icon className={`mb-3 ${c.text} group-hover:scale-110 transition-transform`} size={28} />}
      <p className="font-heading text-sm text-white">{title}</p>
      {subtitle && <p className="text-[10px] text-plos-text-muted mt-1">{subtitle}</p>}
    </button>
  );
};

/**
 * OS Page Header - Header pagina principale
 */
export const OsPageHeader = ({ icon: Icon, title, subtitle, action, actionLabel, actionIcon: ActionIcon }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2.5 bg-plos-primary/10 border border-plos-primary/30 rounded-lg">
          <Icon className="text-plos-primary" size={24} />
        </div>
      )}
      <div>
        <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-plos-text-muted text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {action && (
      <button
        onClick={action}
        className="flex items-center gap-2 px-4 py-2.5 bg-plos-primary/10 border border-plos-primary/50 hover:bg-plos-primary/20 rounded-lg text-plos-primary font-heading text-sm transition-all"
      >
        {ActionIcon && <ActionIcon size={18} />}
        {actionLabel}
      </button>
    )}
  </div>
);

/**
 * OS Loading Spinner
 */
export const OsSpinner = ({ size = 24, className = '' }) => (
  <Loader2 size={size} className={`animate-spin text-plos-primary ${className}`} />
);

export default {
  OsStatCard,
  OsSectionHeader,
  OsPanel,
  OsListRow,
  OsBadge,
  OsEmptyState,
  OsSkeleton,
  OsQuickAction,
  OsPageHeader,
  OsSpinner,
};
