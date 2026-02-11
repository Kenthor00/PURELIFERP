/**
 * PURE LIFE OS - Admin RBAC Sync Tab
 * Sincronizzazione Job/Gradi da ESX/QBCore
 * UI 100% in Italiano - Supporta configurazione env automatica
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OsPanel, OsSectionHeader } from '../os/OsComponents';
import {
  Database, Play, Eye, Loader2, AlertTriangle, Check,
  Plus, Edit, Trash2, ArrowRightLeft, History, Link, Wifi, WifiOff, RefreshCw
} from 'lucide-react';

// Badge connessione automatica
function EnvConnectionBadge({ envConnection, onTestConnection, testing }) {
  if (!envConnection) return null;
  
  const isActive = envConnection.active;
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isActive ? 'bg-green-500/10 border-green-500/30' : 'bg-plos-surface border-plos-border'
    }`}>
      <div className="flex items-center gap-3">
        {isActive ? <Wifi size={18} className="text-green-400" /> : <WifiOff size={18} className="text-plos-text-muted" />}
        <div>
          <p className="font-medium text-sm">
            {isActive ? '✓ Connessione Automatica Attiva' : 'Connessione Automatica Non Configurata'}
          </p>
          {isActive && (
            <p className="text-xs text-plos-text-muted">
              {envConnection.host} → {envConnection.database} ({envConnection.framework})
            </p>
          )}
        </div>
      </div>
      {isActive && (
        <button
          onClick={onTestConnection}
          disabled={testing}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 rounded text-green-400 disabled:opacity-50"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Test
        </button>
      )}
    </div>
  );
}

// Componenti interni semplificati
function SourceButton({ src, selected, onClick }) {
  const isSelected = selected === src.code;
  return (
    <button
      onClick={() => onClick(src.code)}
      className={`p-3 rounded-lg border-2 transition-all ${
        isSelected ? 'border-plos-primary bg-plos-primary/10' : 'border-plos-border hover:border-plos-primary/50'
      }`}
    >
      <Database size={20} className={`mx-auto mb-2 ${isSelected ? 'text-plos-primary' : 'text-plos-text-muted'}`} />
      <p className="text-sm font-medium">{src.name}</p>
    </button>
  );
}

function ModeButton({ m, selected, onClick }) {
  const isSelected = selected === m.code;
  const isStrict = m.code === 'strict';
  return (
    <button
      onClick={() => onClick(m.code)}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        isSelected ? (isStrict ? 'border-red-500 bg-red-500/10' : 'border-plos-primary bg-plos-primary/10') 
        : 'border-plos-border hover:border-plos-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isStrict ? <AlertTriangle size={16} className="text-red-400" /> 
          : <ArrowRightLeft size={16} className={isSelected ? 'text-plos-primary' : 'text-plos-text-muted'} />}
        <span className="font-medium text-sm">{m.name}</span>
      </div>
      <p className="text-xs text-plos-text-muted">{m.description}</p>
    </button>
  );
}

function StatBox({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
    gray: 'bg-plos-surface text-plos-text-muted'
  };
  return (
    <div className={`p-3 rounded-lg ${colors[color] || colors.gray}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color !== 'gray' ? '' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-plos-text-muted">{subValue}</p>
    </div>
  );
}

function ReportItem({ item }) {
  const bgColors = {
    added: 'bg-green-500/10',
    updated: 'bg-yellow-500/10',
    removed: 'bg-red-500/10',
    skipped: 'bg-plos-surface'
  };
  return (
    <div className={`flex items-center justify-between p-2 rounded text-sm ${bgColors[item.action] || bgColors.skipped}`}>
      <div className="flex items-center gap-2">
        {item.action === 'added' && <Plus size={14} className="text-green-400" />}
        {item.action === 'updated' && <Edit size={14} className="text-yellow-400" />}
        {item.action === 'removed' && <Trash2 size={14} className="text-red-400" />}
        {item.action === 'skipped' && <Check size={14} className="text-plos-text-muted" />}
        <span className="font-medium">{item.job_name}</span>
        <span className="text-xs text-plos-text-muted font-mono">({item.job_code})</span>
      </div>
      <div className="text-xs text-right">
        {item.grades_added > 0 && <span className="text-green-400">+{item.grades_added}g </span>}
        {item.grades_updated > 0 && <span className="text-yellow-400">~{item.grades_updated}g </span>}
      </div>
    </div>
  );
}

export default function SyncTab({ api }) {
  const [syncConfig, setSyncConfig] = useState(null);
  const [syncSource, setSyncSource] = useState('auto');
  const [syncMode, setSyncMode] = useState('merge');
  const [syncDryRun, setSyncDryRun] = useState(true);
  const [syncFivemDbUrl, setSyncFivemDbUrl] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [lastSyncReport, setLastSyncReport] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchSyncConfig();
  }, []);

  const fetchSyncConfig = async () => {
    try {
      const [configRes, lastReportRes] = await Promise.all([
        api.get('/admin/rbac/sync/config'),
        api.get('/admin/rbac/sync/last-report')
      ]);
      setSyncConfig(configRes.data);
      setLastSyncReport(lastReportRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento configurazione sync');
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.post('/admin/rbac/sync/test-connection');
      if (res.data.success) {
        toast.success(`Connessione riuscita! ${res.data.message}`);
      } else {
        toast.error(`Test fallito: ${res.data.message}`);
      }
    } catch (error) {
      toast.error('Errore nel test connessione');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncReport(null);
    try {
      const res = await api.post('/admin/rbac/sync', {
        source: syncSource,
        mode: syncMode,
        dry_run: syncDryRun,
        fivem_db_url: syncFivemDbUrl || null
      });
      setSyncReport(res.data);
      setLastSyncReport(res.data);
      if (res.data.dry_run) {
        toast.info('Anteprima completata - Nessuna modifica applicata');
      } else if (res.data.errors && res.data.errors.length > 0) {
        toast.warning(`Sync completato con ${res.data.errors.length} errori`);
      } else {
        toast.success(`Sync completato! +${res.data.jobs_added} job, ~${res.data.jobs_updated} aggiornati`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante la sincronizzazione');
    } finally {
      setSyncLoading(false);
    }
  };

  const sources = syncConfig?.sources || [];
  const modes = syncConfig?.modes || [];
  const selectedSrcDesc = sources.find(s => s.code === syncSource)?.description;
  const envConnection = syncConfig?.env_connection;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <OsPanel>
        <OsSectionHeader title="Sincronizzazione Job/Gradi" icon={Database} />
        <div className="space-y-4">
          {/* Badge Connessione Automatica */}
          <EnvConnectionBadge 
            envConnection={envConnection} 
            onTestConnection={handleTestConnection}
            testing={testingConnection}
          />
          
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <AlertTriangle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400 mb-1">Sincronizzazione Database FiveM</p>
              <p className="text-plos-text-muted">Importa job e gradi dal tuo server ESX o QBCore.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">Framework Sorgente</label>
            <div className="grid grid-cols-3 gap-2">
              {sources.map(src => <SourceButton key={src.code} src={src} selected={syncSource} onClick={setSyncSource} />)}
            </div>
            {selectedSrcDesc && <p className="text-xs text-plos-text-muted mt-2">{selectedSrcDesc}</p>}
          </div>
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">Modalità Sincronizzazione</label>
            <div className="grid grid-cols-2 gap-2">
              {modes.map(m => <ModeButton key={m.code} m={m} selected={syncMode} onClick={setSyncMode} />)}
            </div>
          </div>
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">URL Database FiveM (opzionale)</label>
            <input
              type="text"
              value={syncFivemDbUrl}
              onChange={e => setSyncFivemDbUrl(e.target.value)}
              placeholder="mysql://user:pass@host/database"
              className="w-full p-3 bg-plos-background border border-plos-border rounded-lg text-sm font-mono focus:border-plos-primary focus:outline-none"
            />
            <p className="text-xs text-plos-text-muted mt-1">Lascia vuoto per usare il database corrente.</p>
          </div>
          <div className="flex items-center justify-between p-3 bg-plos-surface rounded-lg">
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-plos-text-muted" />
              <div>
                <p className="font-medium text-sm">Modalità Anteprima (Dry Run)</p>
                <p className="text-xs text-plos-text-muted">Mostra le modifiche senza applicarle</p>
              </div>
            </div>
            <button
              onClick={() => setSyncDryRun(!syncDryRun)}
              className={`w-12 h-6 rounded-full transition-all ${syncDryRun ? 'bg-plos-primary' : 'bg-plos-border'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-all ${syncDryRun ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {syncMode === 'strict' && !syncDryRun && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-400 mb-1">Attenzione: Modalità Pericolosa!</p>
                <p className="text-plos-text-muted">La modalità STRICT eliminerà tutti i job non presenti nella sorgente.</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className={`w-full flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${
              syncDryRun ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-plos-primary hover:bg-plos-primary/80 text-black'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {syncLoading ? <><Loader2 size={20} className="animate-spin" />Sincronizzazione...</> 
              : syncDryRun ? <><Eye size={20} />Anteprima Modifiche</> : <><Play size={20} />Esegui Sync</>}
          </button>
        </div>
      </OsPanel>
      <OsPanel>
        <OsSectionHeader title="Report Sincronizzazione" icon={History} />
        {syncReport ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-plos-surface rounded-lg">
              <div>
                <p className="font-medium">{syncReport.dry_run ? '🔍 Anteprima' : '✅ Eseguito'}</p>
                <p className="text-xs text-plos-text-muted">{new Date(syncReport.timestamp).toLocaleString('it-IT')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono">{syncReport.source.toUpperCase()}</p>
                <p className="text-xs text-plos-text-muted">{syncReport.duration_ms}ms</p>
              </div>
            </div>
            {syncReport.framework_detected && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                <Database size={16} className="text-blue-400" />
                <span className="text-sm">{syncReport.framework_detected}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <StatBox icon={Plus} label="Aggiunti" value={syncReport.jobs_added} subValue={`+${syncReport.grades_added} gradi`} color="green" />
              <StatBox icon={Edit} label="Aggiornati" value={syncReport.jobs_updated} subValue={`~${syncReport.grades_updated} gradi`} color="yellow" />
              <StatBox icon={Check} label="Invariati" value={syncReport.jobs_skipped} subValue={`${syncReport.grades_skipped} gradi`} color="gray" />
              {syncReport.jobs_removed > 0 && (
                <StatBox icon={Trash2} label="Rimossi" value={syncReport.jobs_removed} subValue={`${syncReport.grades_removed} gradi`} color="red" />
              )}
            </div>
            {syncReport.errors && syncReport.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="font-medium text-red-400 mb-2">Errori ({syncReport.errors.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {syncReport.errors.map((err, i) => <p key={i} className="text-xs text-red-300 font-mono">{err}</p>)}
                </div>
              </div>
            )}
            {syncReport.items && syncReport.items.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Dettaglio per Job</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {syncReport.items.map((item, i) => <ReportItem key={i} item={item} />)}
                </div>
              </div>
            )}
          </div>
        ) : lastSyncReport ? (
          <div className="text-center py-8">
            <History size={48} className="mx-auto mb-4 text-plos-text-muted opacity-30" />
            <p className="text-plos-text-muted mb-2">Ultimo sync: {new Date(lastSyncReport.timestamp).toLocaleString('it-IT')}</p>
            <p className="text-sm text-plos-text-muted">{lastSyncReport.jobs_added} aggiunti, {lastSyncReport.jobs_updated} aggiornati</p>
          </div>
        ) : (
          <div className="text-center py-8 text-plos-text-muted">
            <Database size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nessun report disponibile</p>
            <p className="text-sm mt-2">Esegui una sincronizzazione per vedere i risultati</p>
          </div>
        )}
      </OsPanel>
    </div>
  );
}
