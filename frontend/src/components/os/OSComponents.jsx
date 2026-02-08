/**
 * PURE LIFE OS 3.0 - OS Components
 * Componenti Sistema Operativo Governativo
 */

import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

/**
 * OS Module Card - Card stile modulo di sistema
 */
export const OSModule = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  children, 
  color = '#00ff9c',
  className = '',
  onClick,
  loading = false
}) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component 
      className={`
        os-module w-full text-left os-animate-fade-in
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      style={{ '--module-color': color }}
    >
      {/* Header */}
      <div className="os-module-header">
        <div 
          className="os-module-icon"
          style={{ 
            borderColor: `${color}30`,
            background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`
          }}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" style={{ color }} />
          ) : (
            <Icon size={20} style={{ color }} />
          )}
        </div>
        
        <div className="os-module-divider" />
        
        <div className="flex-1">
          <h3 className="os-module-title">{title}</h3>
          {subtitle && <p className="os-module-subtitle">{subtitle}</p>}
        </div>
        
        {onClick && (
          <ChevronRight size={18} className="text-[#4a6670] group-hover:text-[#00ff9c] transition-colors" />
        )}
      </div>
      
      {/* Content */}
      {children && (
        <div className="os-module-content">
          {children}
        </div>
      )}
    </Component>
  );
};

/**
 * OS Stat Card - Card per statistiche
 */
export const OSStat = ({ 
  label, 
  value, 
  change, 
  color = '#00ff9c',
  icon: Icon,
  className = '' 
}) => {
  return (
    <div 
      className={`os-stat os-animate-fade-in ${className}`}
      style={{ '--stat-color': color }}
    >
      <div className="flex items-center justify-between">
        <span className="os-stat-label">{label}</span>
        {Icon && <Icon size={14} style={{ color }} className="opacity-50" />}
      </div>
      <span className="os-stat-value" style={{ color }}>{value}</span>
      {change && (
        <span className={`os-stat-change ${change > 0 ? 'text-[#00ff9c]' : change < 0 ? 'text-[#ff3b3b]' : ''}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
  );
};

/**
 * OS Stats Grid - Griglia di statistiche
 */
export const OSStatsGrid = ({ children, columns = 4, className = '' }) => {
  return (
    <div 
      className={`grid gap-3 os-stagger ${className}`}
      style={{ 
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
      }}
    >
      {children}
    </div>
  );
};

/**
 * OS List Item - Elemento lista sistema
 */
export const OSListItem = ({
  icon: Icon,
  title,
  subtitle,
  meta,
  status,
  statusColor,
  onClick,
  actions,
  className = ''
}) => {
  return (
    <div 
      className={`
        flex items-center gap-4 p-4 bg-[#0f1519] border border-[#1b2a30] rounded-md
        transition-all duration-200 hover:border-[#243038] hover:bg-[#141c22]
        os-animate-fade-in group
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Icon */}
      {Icon && (
        <div className="w-10 h-10 rounded-md bg-[#1b2a30] flex items-center justify-center border border-[#243038]">
          <Icon size={18} className="text-[#7f9aa3]" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#e6f1f2] truncate">{title}</p>
        {subtitle && <p className="text-xs text-[#7f9aa3] truncate">{subtitle}</p>}
      </div>
      
      {/* Meta */}
      {meta && (
        <div className="text-right">
          <p className="text-xs text-[#4a6670]">{meta}</p>
        </div>
      )}
      
      {/* Status */}
      {status && (
        <div 
          className="px-2 py-1 rounded text-[0.625rem] font-bold tracking-wider border"
          style={{
            backgroundColor: `${statusColor}10`,
            borderColor: `${statusColor}30`,
            color: statusColor
          }}
        >
          {status}
        </div>
      )}
      
      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
      
      {/* Arrow */}
      {onClick && (
        <ChevronRight size={18} className="text-[#4a6670] group-hover:text-[#00ff9c] transition-colors" />
      )}
    </div>
  );
};

/**
 * OS Section Header
 */
export const OSSectionHeader = ({ 
  icon: Icon, 
  title, 
  action, 
  color = '#00ff9c',
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div 
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: `${color}10` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
        )}
        <h2 className="text-sm font-bold tracking-wider text-[#e6f1f2] uppercase">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
};

/**
 * OS Empty State
 */
export const OSEmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-lg bg-[#1b2a30] flex items-center justify-center mb-4 border border-[#243038]">
          <Icon size={28} className="text-[#4a6670]" />
        </div>
      )}
      <h3 className="text-sm font-bold text-[#7f9aa3] tracking-wider mb-1">{title}</h3>
      {description && <p className="text-xs text-[#4a6670] mb-4">{description}</p>}
      {action}
    </div>
  );
};

/**
 * OS Loading Skeleton
 */
export const OSSkeleton = ({ className = '', variant = 'default' }) => {
  const variants = {
    default: 'h-4 rounded',
    stat: 'h-20 rounded-md',
    card: 'h-32 rounded-md',
    list: 'h-16 rounded-md',
  };

  return (
    <div 
      className={`
        animate-pulse bg-gradient-to-r from-[#1b2a30] via-[#243038] to-[#1b2a30]
        bg-[length:200%_100%]
        ${variants[variant]}
        ${className}
      `}
      style={{ animation: 'shimmer 2s infinite linear' }}
    />
  );
};

/**
 * OS Stats Skeleton
 */
export const OSStatsSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-4 bg-[#0f1519] border border-[#1b2a30] rounded-md">
          <OSSkeleton className="w-16 h-2 mb-3" />
          <OSSkeleton className="w-12 h-6" />
        </div>
      ))}
    </div>
  );
};

/**
 * OS List Skeleton
 */
export const OSListSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[#0f1519] border border-[#1b2a30] rounded-md">
          <OSSkeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <OSSkeleton className="w-3/4 h-3" />
            <OSSkeleton className="w-1/2 h-2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  OSModule,
  OSStat,
  OSStatsGrid,
  OSListItem,
  OSSectionHeader,
  OSEmptyState,
  OSSkeleton,
  OSStatsSkeleton,
  OSListSkeleton,
};
