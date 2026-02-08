/**
 * PURE LIFE OS 3.0 - Skeleton Loaders Premium
 * Componenti per loading states ultra-fluidi
 */

import React from 'react';

// Base Skeleton con animazione shimmer
export const Skeleton = ({ className = '', variant = 'default' }) => {
  const baseClass = 'animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]';
  
  const variants = {
    default: 'rounded',
    circle: 'rounded-full',
    card: 'rounded-lg',
  };

  return (
    <div 
      className={`${baseClass} ${variants[variant]} ${className}`}
      style={{ 
        animation: 'shimmer 2s infinite linear',
        backgroundSize: '200% 100%'
      }}
    />
  );
};

// Skeleton per statistiche dashboard
export const StatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="card-tactical p-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

// Skeleton per lista elementi
export const ListSkeleton = ({ rows = 5, showAvatar = false }) => (
  <div className="space-y-3">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="card-tactical p-4 flex items-center gap-4">
        {showAvatar && <Skeleton className="h-10 w-10" variant="circle" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

// Skeleton per card dettaglio
export const DetailSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12" variant="circle" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-24 w-full" variant="card" />
      <Skeleton className="h-24 w-full" variant="card" />
    </div>
    <Skeleton className="h-40 w-full" variant="card" />
  </div>
);

// Skeleton per tabella
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="overflow-hidden rounded-lg border border-slate-700">
    {/* Header */}
    <div className="bg-slate-800/50 p-3 flex gap-4">
      {[...Array(cols)].map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="p-3 flex gap-4 border-t border-slate-700/50">
        {[...Array(cols)].map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Skeleton per chat messages
export const ChatSkeleton = ({ messages = 6 }) => (
  <div className="space-y-4">
    {[...Array(messages)].map((_, i) => (
      <div 
        key={i} 
        className={`flex gap-3 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}
      >
        <Skeleton className="h-8 w-8 flex-shrink-0" variant="circle" />
        <div className={`space-y-1 ${i % 3 === 0 ? 'items-end' : ''}`}>
          <Skeleton className="h-3 w-20" />
          <Skeleton 
            className="h-16 rounded-lg" 
            style={{ width: `${Math.random() * 100 + 100}px` }}
          />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton per form
export const FormSkeleton = ({ fields = 4 }) => (
  <div className="space-y-4">
    {[...Array(fields)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" variant="card" />
      </div>
    ))}
    <Skeleton className="h-10 w-32 mt-6" variant="card" />
  </div>
);

// Skeleton per dashboard completa
export const DashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" variant="card" />
    </div>
    
    {/* Stats */}
    <StatsSkeleton count={4} />
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-tactical p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <ListSkeleton rows={4} />
      </div>
      <div className="card-tactical p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <ListSkeleton rows={4} showAvatar />
      </div>
    </div>
  </div>
);

// Skeleton per pagina intera
export const PageSkeleton = ({ title = true }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
    {title && (
      <div className="mb-6">
        <Skeleton className="h-8 w-64" />
      </div>
    )}
    <DashboardSkeleton />
  </div>
);

// CSS per animazione shimmer (da aggiungere al CSS globale)
export const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

export default Skeleton;
