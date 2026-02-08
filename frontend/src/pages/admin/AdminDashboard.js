/**
 * PURE LIFE OS 3.0 - Admin Dashboard
 * WOW PASS Applied
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OsStatCard, OsPanel, OsSectionHeader, OsListRow, OsBadge, OsEmptyState, OsSkeleton, OsQuickAction, OsPageHeader } from '../../components/os/OsComponents';
import {
  Shield,
  Users,
  FileText,
  Activity,
  Clock,
  Settings,
  Database,
  BarChart3,
  ChevronRight,
  UserCheck,
  LogIn,
  AlertTriangle,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch admin stats
      const [statsRes, auditRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { totalUsers: 0, activeUsers: 0, todayLogins: 0, pendingActions: 0 } })),
        api.get('/admin/audit?limit=10').catch(() => ({ data: [] })),
      ]);
      
      setStats(statsRes.data);
      setRecentAudit(Array.isArray(auditRes.data) ? auditRes.data : []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ totalUsers: 0, activeUsers: 0, todayLogins: 0, pendingActions: 0 });
    } finally {
      setLoading(false);
    }
  };

  const sectorStats = [
    { name: 'LSPD', count: stats?.lspd_users || 0, color: 'blue' },
    { name: 'EMS', count: stats?.ems_users || 0, color: 'red' },
    { name: 'GOV', count: stats?.gov_users || 0, color: 'purple' },
    { name: 'NEWS', count: stats?.news_users || 0, color: 'green' },
    { name: 'DISPATCH', count: stats?.dispatch_users || 0, color: 'orange' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <OsPageHeader icon={Shield} title="ADMIN DASHBOARD" subtitle="Pannello di Controllo Sistema" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-plos-surface rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-plos-bg rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-plos-bg rounded w-1/3"></div>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <OsPanel><OsSkeleton rows={5} /></OsPanel>
          <OsPanel><OsSkeleton rows={5} /></OsPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <OsPageHeader 
          icon={Shield} 
          title={<>ADMIN <span className="text-plos-primary">DASHBOARD</span></>}
          subtitle={`Benvenuto, ${user?.game_name || user?.email}`}
        />
        <div className="flex items-center gap-2 px-4 py-2 bg-plos-primary/10 border border-plos-primary/30 rounded-lg">
          <div className="w-2 h-2 bg-plos-primary rounded-full animate-pulse"></div>
          <span className="text-plos-primary text-sm font-heading tracking-wider">SUPER ADMIN</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OsStatCard
          icon={Users}
          label="UTENTI TOTALI"
          value={stats?.totalUsers || stats?.total_users || 0}
          color="blue"
          onClick={() => navigate('/admin/users')}
        />
        <OsStatCard
          icon={UserCheck}
          label="UTENTI ATTIVI"
          value={stats?.activeUsers || stats?.active_users || 0}
          color="green"
        />
        <OsStatCard
          icon={LogIn}
          label="LOGIN OGGI"
          value={stats?.todayLogins || stats?.today_logins || 0}
          color="purple"
        />
        <OsStatCard
          icon={AlertTriangle}
          label="AZIONI PENDENTI"
          value={stats?.pendingActions || stats?.pending_actions || 0}
          color="orange"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <OsPanel>
          <OsSectionHeader 
            icon={Settings} 
            title="AZIONI RAPIDE" 
            color="plos-primary"
          />
          
          <div className="p-4 grid grid-cols-2 gap-3">
            <OsQuickAction
              icon={Users}
              title="Gestione Utenti"
              subtitle="Crea e modifica utenti"
              color="blue"
              onClick={() => navigate('/admin/users')}
            />
            <OsQuickAction
              icon={FileText}
              title="Audit Log"
              subtitle="Monitora attività"
              color="purple"
              onClick={() => navigate('/admin/audit')}
            />
            <OsQuickAction
              icon={Database}
              title="Cache"
              subtitle="Statistiche cache"
              color="green"
              onClick={() => navigate('/admin/cache')}
            />
            <OsQuickAction
              icon={BarChart3}
              title="Performance"
              subtitle="Metriche sistema"
              color="orange"
              onClick={() => navigate('/admin/performance')}
            />
          </div>
        </OsPanel>

        {/* Sector Stats */}
        <OsPanel>
          <OsSectionHeader 
            icon={BarChart3} 
            title="UTENTI PER SETTORE" 
            color="blue"
          />
          
          <div className="p-4 space-y-3">
            {sectorStats.map((sector) => (
              <div key={sector.name} className="flex items-center gap-3">
                <OsBadge variant={sector.color === 'blue' ? 'info' : sector.color === 'red' ? 'danger' : sector.color === 'purple' ? 'purple' : sector.color === 'green' ? 'success' : 'warning'}>
                  {sector.name}
                </OsBadge>
                <div className="flex-1 h-2 bg-plos-bg rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      sector.color === 'blue' ? 'bg-blue-500' :
                      sector.color === 'red' ? 'bg-red-500' :
                      sector.color === 'purple' ? 'bg-purple-500' :
                      sector.color === 'green' ? 'bg-green-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min(sector.count * 10, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-plos-text-secondary w-8 text-right">{sector.count}</span>
              </div>
            ))}
          </div>
        </OsPanel>
      </div>

      {/* Recent Audit Log */}
      <OsPanel>
        <OsSectionHeader 
          icon={Clock} 
          title="ATTIVITÀ RECENTE" 
          color="purple"
          action={() => navigate('/admin/audit')}
          actionLabel="AUDIT COMPLETO"
        />
        
        <div className="divide-y divide-plos-border/20">
          {recentAudit.length === 0 ? (
            <OsEmptyState 
              icon={Activity}
              title="Nessuna attività registrata"
              description="Le azioni degli utenti appariranno qui"
            />
          ) : (
            recentAudit.slice(0, 8).map((log, i) => (
              <OsListRow key={log.id || i} index={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <OsBadge variant={log.action?.includes('create') ? 'success' : log.action?.includes('delete') ? 'danger' : 'info'}>
                        {log.action?.toUpperCase() || 'ACTION'}
                      </OsBadge>
                      <span className="text-sm font-medium truncate">{log.description || log.action}</span>
                    </div>
                    <p className="text-xs text-plos-text-muted mt-1">
                      {log.user_email || 'Sistema'} • {log.entity_type || 'N/A'}
                    </p>
                  </div>
                  <p className="mono text-[10px] text-plos-text-muted whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString('it-IT') : '--:--'}
                  </p>
                </div>
              </OsListRow>
            ))
          )}
        </div>
      </OsPanel>
    </div>
  );
};

export default AdminDashboard;
