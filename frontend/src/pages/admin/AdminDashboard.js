/**
 * PURE LIFE OS - Admin Dashboard
 * Dashboard principale per gli amministratori
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('plos_token');
      // For now, we'll show placeholder stats until the endpoint is ready
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        todayLogins: 0,
        pendingActions: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'Gestione Utenti',
      description: 'Crea, modifica e gestisci gli utenti del sistema',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      link: '/admin/users',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Audit Log',
      description: 'Visualizza e monitora tutte le azioni nel sistema',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      link: '/admin/audit',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const sectorStats = [
    { name: 'LSPD', count: 0, color: 'bg-blue-500' },
    { name: 'EMS', count: 0, color: 'bg-red-500' },
    { name: 'GOV', count: 0, color: 'bg-yellow-500' },
    { name: 'NEWS', count: 0, color: 'bg-green-500' },
    { name: 'DISPATCH', count: 0, color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-8 p-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-wider">
            ADMIN DASHBOARD
          </h1>
          <p className="text-plos-text-secondary mt-1">
            Benvenuto, {user?.game_name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-plos-accent/20 rounded-lg">
          <div className="w-2 h-2 bg-plos-accent rounded-full animate-pulse"></div>
          <span className="text-plos-accent text-sm font-medium">SUPER ADMIN</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-sm">Utenti Totali</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.totalUsers || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-sm">Utenti Attivi</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.activeUsers || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-sm">Login Oggi</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.todayLogins || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-plos-text-secondary text-sm">Azioni Pendenti</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.pendingActions || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-heading font-semibold text-white mb-4">
          Azioni Rapide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.link}
              className="glass-card rounded-xl p-6 hover:border-plos-primary/50 transition-all duration-300 group"
              data-testid={`admin-menu-${item.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-plos-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-plos-text-secondary text-sm mt-1">
                    {item.description}
                  </p>
                </div>
                <svg className="w-5 h-5 text-plos-text-secondary group-hover:text-plos-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sector Distribution */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-heading font-semibold text-white mb-4">
          Distribuzione per Settore
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {sectorStats.map((sector, index) => (
            <div key={index} className="text-center">
              <div className={`w-12 h-12 mx-auto rounded-lg ${sector.color} flex items-center justify-center text-white font-bold mb-2`}>
                {sector.count}
              </div>
              <p className="text-plos-text-secondary text-sm">{sector.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-heading font-semibold text-white mb-4">
          Informazioni Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between p-3 bg-plos-surface/50 rounded-lg">
            <span className="text-plos-text-secondary">Versione</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between p-3 bg-plos-surface/50 rounded-lg">
            <span className="text-plos-text-secondary">Database</span>
            <span className="text-green-400">Connesso</span>
          </div>
          <div className="flex justify-between p-3 bg-plos-surface/50 rounded-lg">
            <span className="text-plos-text-secondary">Ambiente</span>
            <span className="text-plos-accent">Preview</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
