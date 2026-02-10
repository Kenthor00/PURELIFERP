/**
 * PURE LIFE OS 3.0 - City Pulse Dashboard
 * Mappa Custom FiveM con Punti di Interesse (POI)
 * WOW PASS - Premium UI Design
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { StatsSkeleton, ListSkeleton } from '../components/ui/Skeleton';
import {
  OsStatCard,
  OsPanel,
  OsSectionHeader,
  OsPageHeader,
} from '../components/os/OsComponents';
import {
  Activity, Shield, Heart, Radio, MapPin, RefreshCw,
  AlertTriangle, Plus, X, Edit, Trash2, Save, Building2,
  Home, Store, Factory, Music, Wrench, ChevronDown, Eye, EyeOff
} from 'lucide-react';

// Mappa FiveM ad alta risoluzione
const FIVEM_MAP_URL = 'https://www.bragitoff.com/wp-content/uploads/2015/11/gta-v-satellite-map-8192x8192.jpg';

// Icone POI per categoria
const POI_ICONS = {
  governo: Building2,
  polizia: Shield,
  ospedale: Heart,
  commerciale: Store,
  residenziale: Home,
  industriale: Factory,
  intrattenimento: Music,
  servizi: Wrench,
  altro: MapPin,
};

// Colori POI per categoria
const POI_COLORS = {
  governo: '#8B5CF6',
  polizia: '#3B82F6',
  ospedale: '#EF4444',
  commerciale: '#10B981',
  residenziale: '#F59E0B',
  industriale: '#6B7280',
  intrattenimento: '#EC4899',
  servizi: '#06B6D4',
  altro: '#9CA3AF',
};

export const CityPulsePage = () => {
  const { api, user } = useAuth();
  const mapRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pois, setPois] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLabels, setShowLabels] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // POI Editor State
  const [editMode, setEditMode] = useState(false);
  const [poiModal, setPoiModal] = useState({ open: false, poi: null, isNew: false });
  const [newPoiPosition, setNewPoiPosition] = useState(null);
  const [poiForm, setPoiForm] = useState({
    name: '',
    category: 'altro',
    description: '',
    address: '',
    phone: '',
    is_public: true
  });

  // Check if user can manage POIs
  const canManagePoi = user?.sector === 'ADMIN' || 
    (user?.sector === 'GOV' && user?.hierarchy_level >= 3) ||
    (['LSPD', 'EMS', 'DISPATCH'].includes(user?.sector) && user?.hierarchy_level >= 7);

  // Fetch data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch stats
      const [lspdRes, emsRes, dispatchRes] = await Promise.all([
        api.get('/lspd/stats').catch(() => ({ data: {} })),
        api.get('/ems/stats').catch(() => ({ data: {} })),
        api.get('/dispatch/stats').catch(() => ({ data: {} })),
      ]);

      setStats({
        lspd: lspdRes.data,
        ems: emsRes.data,
        dispatch: dispatchRes.data,
      });

      // Fetch POIs
      try {
        const poisRes = await api.get('/poi');
        setPois(poisRes.data || []);
      } catch (err) {
        console.log('POI endpoint non disponibile, uso dati demo');
        // Dati demo se API non disponibile
        setPois([
          { id: 1, name: 'Central LSPD', x_percent: 45, y_percent: 55, category: 'polizia', description: 'Stazione centrale di polizia' },
          { id: 2, name: 'Pillbox Hospital', x_percent: 48, y_percent: 52, category: 'ospedale', description: 'Ospedale principale' },
          { id: 3, name: 'City Hall', x_percent: 43, y_percent: 58, category: 'governo', description: 'Municipio di Los Santos' },
          { id: 4, name: 'Maze Bank', x_percent: 46, y_percent: 50, category: 'commerciale', description: 'Grattacielo Maze Bank' },
          { id: 5, name: 'Vanilla Unicorn', x_percent: 52, y_percent: 60, category: 'intrattenimento', description: 'Club notturno' },
        ]);
      }

      // Fetch categories
      try {
        const catRes = await api.get('/poi/categories');
        setCategories(catRes.data?.categories || []);
      } catch {
        setCategories([
          { value: 'governo', label: 'Edifici Governativi' },
          { value: 'polizia', label: 'Stazioni LSPD' },
          { value: 'ospedale', label: 'Strutture EMS' },
          { value: 'commerciale', label: 'Attività Commerciali' },
          { value: 'residenziale', label: 'Zone Residenziali' },
          { value: 'industriale', label: 'Zone Industriali' },
          { value: 'intrattenimento', label: 'Intrattenimento' },
          { value: 'servizi', label: 'Servizi Pubblici' },
          { value: 'altro', label: 'Altro' },
        ]);
      }

    } catch (error) {
      console.error('Errore fetch city pulse:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // Filtra POI per categoria
  const filteredPois = pois.filter(poi => 
    selectedCategory === 'all' || poi.category === selectedCategory
  );

  // Gestione click sulla mappa per aggiungere POI
  const handleMapClick = (e) => {
    if (!editMode || !canManagePoi) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewPoiPosition({ x_percent: x, y_percent: y });
    setPoiForm({
      name: '',
      category: 'altro',
      description: '',
      address: '',
      phone: '',
      is_public: true
    });
    setPoiModal({ open: true, poi: null, isNew: true });
  };

  // Salva POI
  const handleSavePoi = async () => {
    if (!poiForm.name) {
      toast.error('Inserisci un nome per il POI');
      return;
    }

    try {
      if (poiModal.isNew && newPoiPosition) {
        await api.post('/poi', {
          ...poiForm,
          x_percent: newPoiPosition.x_percent,
          y_percent: newPoiPosition.y_percent
        });
        toast.success('POI creato con successo');
      } else if (poiModal.poi) {
        await api.put(`/poi/${poiModal.poi.id}`, poiForm);
        toast.success('POI aggiornato con successo');
      }
      
      setPoiModal({ open: false, poi: null, isNew: false });
      setNewPoiPosition(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nel salvataggio');
    }
  };

  // Elimina POI
  const handleDeletePoi = async (poiId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo POI?')) return;
    
    try {
      await api.delete(`/poi/${poiId}`);
      toast.success('POI eliminato');
      fetchData();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  // Edit POI
  const handleEditPoi = (poi) => {
    setPoiForm({
      name: poi.name,
      category: poi.category,
      description: poi.description || '',
      address: poi.address || '',
      phone: poi.phone || '',
      is_public: poi.is_public !== false
    });
    setPoiModal({ open: true, poi, isNew: false });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <OsPageHeader icon={Activity} title="CITY PULSE" subtitle="Centro di Controllo Città" />
        <StatsSkeleton count={4} />
        <div className="h-96"><ListSkeleton rows={8} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="city-pulse-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${alertColors[cityAlertLevel].bg} ${alertColors[cityAlertLevel].border} ${alertColors[cityAlertLevel].pulse ? 'animate-pulse' : ''}`}>
            <Activity className={alertColors[cityAlertLevel].text} size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-heading font-bold tracking-wide">
              CITY <span className="text-plos-primary">PULSE</span>
            </h1>
            <p className="text-plos-text-muted text-sm mt-0.5">
              Mappa Attività & Punti di Interesse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Alert Level Badge */}
          <div className={`px-4 py-2 rounded-lg ${alertColors[cityAlertLevel].bg} border ${alertColors[cityAlertLevel].border}`}>
            <span className={`font-heading text-sm tracking-wider ${alertColors[cityAlertLevel].text}`}>
              ALLERTA: {cityAlertLevel.toUpperCase()}
            </span>
          </div>

          {/* Edit Mode Toggle */}
          {canManagePoi && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                editMode 
                  ? 'bg-plos-primary/20 border border-plos-primary text-plos-primary' 
                  : 'bg-plos-surface border border-plos-border text-plos-text-secondary hover:border-plos-primary/50'
              }`}
            >
              {editMode ? 'ESCI MODIFICA' : 'MODIFICA MAPPA'}
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2.5 bg-plos-surface border border-plos-border hover:border-plos-primary/50 rounded-lg transition-all"
            title="Aggiorna dati"
          >
            <RefreshCw size={18} className={`text-plos-text-secondary ${refreshing ? 'animate-spin text-plos-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OsStatCard icon={Shield} label="CASI APERTI" value={stats?.lspd?.casi_aperti || 0} color="blue" subtitle="LSPD" />
        <OsStatCard icon={Radio} label="IN ATTESA" value={stats?.dispatch?.chiamate_in_attesa || 0} color="orange" subtitle="DISPATCH" />
        <OsStatCard icon={Heart} label="INTERVENTI OGGI" value={stats?.ems?.referti_oggi || 0} color="red" subtitle="EMS" />
        <OsStatCard icon={AlertTriangle} label="EMERGENZE CRITICHE" value={stats?.dispatch?.chiamate_p1 || 0} color={stats?.dispatch?.chiamate_p1 > 0 ? 'red' : 'green'} subtitle="PRIORITÀ 1" />
      </div>

      {/* Main Map Section */}
      <OsPanel>
        <OsSectionHeader icon={MapPin} title="MAPPA LOS SANTOS" color="plos-primary">
          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-black/30 border border-plos-border rounded-lg text-sm text-white"
            >
              <option value="all">Tutti i POI</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Toggle Labels */}
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="p-2 bg-black/30 border border-plos-border rounded-lg hover:border-plos-primary/50"
              title={showLabels ? 'Nascondi etichette' : 'Mostra etichette'}
            >
              {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </OsSectionHeader>

        {/* Map Container */}
        <div className="p-4">
          {editMode && (
            <div className="mb-4 p-3 bg-plos-primary/10 border border-plos-primary/30 rounded-lg text-sm text-plos-primary">
              <strong>MODALITÀ MODIFICA:</strong> Clicca sulla mappa per aggiungere un nuovo POI
            </div>
          )}
          
          <div 
            ref={mapRef}
            className={`relative w-full rounded-lg overflow-hidden border border-plos-border ${editMode ? 'cursor-crosshair' : ''}`}
            style={{ aspectRatio: '16/9' }}
            onClick={handleMapClick}
          >
            {/* FiveM Map Image */}
            <img 
              src={FIVEM_MAP_URL} 
              alt="Los Santos Map" 
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* POI Markers */}
            {filteredPois.map(poi => {
              const Icon = POI_ICONS[poi.category] || MapPin;
              const color = POI_COLORS[poi.category] || '#9CA3AF';
              
              return (
                <div
                  key={poi.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ 
                    left: `${poi.x_percent}%`, 
                    top: `${poi.y_percent}%`,
                    zIndex: 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editMode && canManagePoi) {
                      handleEditPoi(poi);
                    }
                  }}
                >
                  {/* Marker */}
                  <div 
                    className="p-2 rounded-full shadow-lg border-2 border-white/50 transition-transform hover:scale-125"
                    style={{ backgroundColor: color }}
                  >
                    <Icon size={14} className="text-white" />
                  </div>
                  
                  {/* Label */}
                  {showLabels && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-black/80 text-white text-[10px] rounded font-medium">
                        {poi.name}
                      </span>
                    </div>
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-plos-surface border border-plos-border rounded-lg p-3 shadow-xl min-w-48">
                      <p className="font-heading text-sm font-bold">{poi.name}</p>
                      <p className="text-xs text-plos-text-muted capitalize">{poi.category}</p>
                      {poi.description && (
                        <p className="text-xs text-plos-text-secondary mt-1">{poi.description}</p>
                      )}
                      {editMode && canManagePoi && (
                        <p className="text-xs text-plos-primary mt-2">Click per modificare</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* New POI Preview */}
            {newPoiPosition && (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ 
                  left: `${newPoiPosition.x_percent}%`, 
                  top: `${newPoiPosition.y_percent}%`,
                  zIndex: 20
                }}
              >
                <div className="p-2 rounded-full bg-plos-primary border-2 border-white shadow-lg">
                  <Plus size={14} className="text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {categories.slice(0, 5).map(cat => {
              const Icon = POI_ICONS[cat.value] || MapPin;
              return (
                <div 
                  key={cat.value} 
                  className="flex items-center gap-2 text-xs text-plos-text-secondary cursor-pointer hover:text-white"
                  onClick={() => setSelectedCategory(cat.value === selectedCategory ? 'all' : cat.value)}
                >
                  <div className="p-1 rounded" style={{ backgroundColor: `${POI_COLORS[cat.value]}33` }}>
                    <Icon size={12} style={{ color: POI_COLORS[cat.value] }} />
                  </div>
                  <span>{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </OsPanel>

      {/* POI Modal */}
      {poiModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-plos-surface border border-plos-border rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">
                {poiModal.isNew ? 'NUOVO POI' : 'MODIFICA POI'}
              </h3>
              <button 
                onClick={() => {
                  setPoiModal({ open: false, poi: null, isNew: false });
                  setNewPoiPosition(null);
                }} 
                className="p-1"
              >
                <X size={20} className="text-plos-text-muted" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">NOME *</label>
                <input
                  type="text"
                  value={poiForm.name}
                  onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  placeholder="Nome del punto di interesse"
                />
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">CATEGORIA</label>
                <select
                  value={poiForm.category}
                  onChange={(e) => setPoiForm({ ...poiForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-plos-text-muted mb-1">DESCRIZIONE</label>
                <textarea
                  value={poiForm.description}
                  onChange={(e) => setPoiForm({ ...poiForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                  rows={2}
                  placeholder="Descrizione opzionale..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-plos-text-muted mb-1">INDIRIZZO</label>
                  <input
                    type="text"
                    value={poiForm.address}
                    onChange={(e) => setPoiForm({ ...poiForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                    placeholder="Indirizzo..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-plos-text-muted mb-1">TELEFONO</label>
                  <input
                    type="text"
                    value={poiForm.phone}
                    onChange={(e) => setPoiForm({ ...poiForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-black/30 border border-plos-border rounded-lg text-white text-sm"
                    placeholder="555-1234"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={poiForm.is_public}
                  onChange={(e) => setPoiForm({ ...poiForm, is_public: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_public" className="text-sm text-plos-text-secondary">
                  Visibile a tutti (pubblico)
                </label>
              </div>
              
              <div className="flex gap-3 pt-2">
                {!poiModal.isNew && (
                  <button
                    onClick={() => handleDeletePoi(poiModal.poi.id)}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 rounded-lg text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setPoiModal({ open: false, poi: null, isNew: false });
                    setNewPoiPosition(null);
                  }}
                  className="flex-1 px-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-white"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSavePoi}
                  className="flex-1 px-4 py-2 bg-plos-primary/20 border border-plos-primary/50 hover:bg-plos-primary/30 rounded-lg text-plos-primary font-heading flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  SALVA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPulsePage;
