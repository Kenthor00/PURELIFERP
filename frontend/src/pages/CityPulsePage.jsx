/**
 * PURE LIFE OS 3.0 - City Pulse Dashboard
 * Centro di controllo con heatmap attività e metriche live
 * FUNZIONALITÀ UNICA - Mai vista prima
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatsSkeleton, ListSkeleton } from '../components/ui/Skeleton';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Heart,
  Radio,
  Newspaper,
  Users,
  MapPin,
  Clock,
  Zap,
  Eye,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// Zone della città (simulazione GTA map)
const CITY_ZONES = [
  { id: 'vinewood', name: 'Vinewood', x: 60, y: 15 },
  { id: 'downtown', name: 'Downtown', x: 45, y: 45 },
  { id: 'pillbox', name: 'Pillbox Hill', x: 50, y: 55 },
  { id: 'vespucci', name: 'Vespucci', x: 25, y: 65 },
  { id: 'la_mesa', name: 'La Mesa', x: 70, y: 50 },
  { id: 'sandy', name: 'Sandy Shores', x: 75, y: 10 },
  { id: 'paleto', name: 'Paleto Bay', x: 15, y: 5 },
  { id: 'grapeseed', name: 'Grapeseed', x: 65, y: 8 },
  { id: 'del_perro', name: 'Del Perro', x: 20, y: 50 },
  { id: 'rockford', name: 'Rockford Hills', x: 35, y: 35 },
];

export const CityPulsePage = () => {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [zoneActivity, setZoneActivity] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch stats from all modules
      const [lspdRes, emsRes, dispatchRes, justiceRes] = await Promise.all([
        api.get('/lspd/stats').catch(() => ({ data: {} })),
        api.get('/ems/stats').catch(() => ({ data: {} })),
        api.get('/dispatch/stats').catch(() => ({ data: {} })),
        api.get('/justice/stats').catch(() => ({ data: {} })),
      ]);

      setStats({
        lspd: lspdRes.data,
        ems: emsRes.data,
        dispatch: dispatchRes.data,
        justice: justiceRes.data,
      });

      // Simulate zone activity based on stats
      const activity = {};
      CITY_ZONES.forEach(zone => {
        // Random activity level per zone (in real impl, this would come from FiveM)
        activity[zone.id] = {
          level: Math.floor(Math.random() * 100),
          incidents: Math.floor(Math.random() * 5),
          type: ['normale', 'elevata', 'critica'][Math.floor(Math.random() * 3)],
        };
      });
      setZoneActivity(activity);

      // Create activity feed
      const feed = [
        { id: 1, type: 'lspd', message: `${lspdRes.data.casi_aperti || 0} casi aperti`, time: 'Ora', icon: Shield },
        { id: 2, type: 'dispatch', message: `${dispatchRes.data.chiamate_in_attesa || 0} chiamate in attesa`, time: '2m fa', icon: Radio },
        { id: 3, type: 'ems', message: `${emsRes.data.referti_oggi || 0} interventi oggi`, time: '5m fa', icon: Heart },
        { id: 4, type: 'justice', message: `${justiceRes.data.udienze_programmate || 0} udienze programmate`, time: '10m fa', icon: Activity },
      ];
      setActivityFeed(feed);

    } catch (error) {
      console.error('Errore fetch city pulse:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh ogni 30 secondi
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcola livello di allerta città
  const cityAlertLevel = useMemo(() => {
    if (!stats) return 'normale';
    const p1Calls = stats.dispatch?.chiamate_p1 || 0;
    const openCases = stats.lspd?.casi_aperti || 0;
    
    if (p1Calls >= 3 || openCases >= 10) return 'critico';
    if (p1Calls >= 1 || openCases >= 5) return 'elevato';
    return 'normale';
  }, [stats]);

  const alertColors = {
    normale: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-500' },
    elevato: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-500' },
    critico: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-500', pulse: true },
  };

  const getZoneColor = (level) => {
    if (level > 70) return 'rgba(239, 68, 68, 0.7)'; // Red
    if (level > 40) return 'rgba(251, 146, 60, 0.6)'; // Orange
    return 'rgba(34, 197, 94, 0.4)'; // Green
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Activity className="text-plos-primary" />
          <h1 className="font-heading text-2xl tracking-wider">CITY PULSE</h1>
        </div>
        <StatsSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-tactical p-4 h-80">
            <ListSkeleton rows={5} />
          </div>
          <div className="card-tactical p-4 h-80">
            <ListSkeleton rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="city-pulse-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${alertColors[cityAlertLevel].bg} ${alertColors[cityAlertLevel].pulse ? 'animate-pulse' : ''}`}>
            <Activity className={alertColors[cityAlertLevel].text} size={24} />
          </div>
          <div>
            <h1 className="font-heading text-2xl tracking-wider">
              CITY <span className="text-plos-primary">PULSE</span>
            </h1>
            <p className="text-plos-text-secondary text-sm">
              Centro di Controllo Città
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alert Level Badge */}
          <div className={`px-4 py-2 rounded-lg ${alertColors[cityAlertLevel].bg} border ${alertColors[cityAlertLevel].border}`}>
            <span className={`font-heading text-sm tracking-wider ${alertColors[cityAlertLevel].text}`}>
              ALLERTA: {cityAlertLevel.toUpperCase()}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="Aggiorna dati"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="text-blue-500" size={20} />
            <span className="text-xs text-slate-500">LSPD</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.lspd?.casi_aperti || 0}</div>
          <div className="text-xs text-slate-400">Casi Aperti</div>
        </div>

        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-2">
            <Radio className="text-orange-500" size={20} />
            <span className="text-xs text-slate-500">DISPATCH</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.dispatch?.chiamate_in_attesa || 0}</div>
          <div className="text-xs text-slate-400">In Attesa</div>
        </div>

        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-2">
            <Heart className="text-red-500" size={20} />
            <span className="text-xs text-slate-500">EMS</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.ems?.referti_oggi || 0}</div>
          <div className="text-xs text-slate-400">Interventi Oggi</div>
        </div>

        <div className="card-tactical p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className={stats?.dispatch?.chiamate_p1 > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'} size={20} />
            <span className="text-xs text-slate-500">PRIORITÀ 1</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats?.dispatch?.chiamate_p1 || 0}</div>
          <div className="text-xs text-slate-400">Emergenze Critiche</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Heatmap */}
        <div className="card-tactical p-4">
          <h3 className="font-heading text-sm tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="text-plos-primary" size={16} />
            MAPPA ATTIVITÀ
          </h3>
          
          <div className="relative bg-slate-900/50 rounded-lg h-64 overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00C853" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Zone Markers */}
            {CITY_ZONES.map(zone => {
              const activity = zoneActivity[zone.id] || { level: 0 };
              return (
                <div
                  key={zone.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                  title={`${zone.name}: Attività ${activity.level}%`}
                >
                  {/* Glow Effect */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{
                      width: `${30 + activity.level / 3}px`,
                      height: `${30 + activity.level / 3}px`,
                      backgroundColor: getZoneColor(activity.level),
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  {/* Marker */}
                  <div
                    className="relative w-3 h-3 rounded-full border-2 border-white/50"
                    style={{ backgroundColor: getZoneColor(activity.level) }}
                  />
                  {/* Label on hover */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                    <div className="font-medium">{zone.name}</div>
                    <div className="text-slate-400">{activity.level}% attività</div>
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-2 right-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-400">Bassa</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-slate-400">Media</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-400">Alta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card-tactical p-4">
          <h3 className="font-heading text-sm tracking-wider mb-4 flex items-center gap-2">
            <Zap className="text-plos-primary" size={16} />
            FEED ATTIVITÀ
          </h3>
          
          <div className="space-y-3">
            {activityFeed.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-2 rounded-lg ${
                    item.type === 'lspd' ? 'bg-blue-500/20' :
                    item.type === 'ems' ? 'bg-red-500/20' :
                    item.type === 'dispatch' ? 'bg-orange-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <Icon size={16} className={
                      item.type === 'lspd' ? 'text-blue-500' :
                      item.type === 'ems' ? 'text-red-500' :
                      item.type === 'dispatch' ? 'text-orange-500' :
                      'text-purple-500'
                    } />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.message}</p>
                  </div>
                  <span className="text-xs text-slate-500">{item.time}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-plos-primary">
                {stats?.lspd?.mandati_attivi || 0}
              </div>
              <div className="text-xs text-slate-500">Mandati Attivi</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-500">
                {stats?.lspd?.multe_non_pagate || 0}
              </div>
              <div className="text-xs text-slate-500">Multe Non Pagate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="card-tactical p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="text-slate-400" size={16} />
              <span className="text-sm text-slate-400">Utenti Online:</span>
              <span className="text-sm font-bold text-white">-</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-slate-400" size={16} />
              <span className="text-sm text-slate-400">Ultimo aggiornamento:</span>
              <span className="text-sm font-bold text-white">
                {new Date().toLocaleTimeString('it-IT')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Eye size={14} />
            <span>PURE LIFE OS • City Pulse v3.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityPulsePage;
