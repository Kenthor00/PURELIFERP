/**
 * PURE LIFE OS - Admin RBAC Sync Tab
 * Sincronizzazione Job/Gradi da ESX/QBCore
 * UI 100% in Italiano
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OsPanel, OsSectionHeader } from '../os/OsComponents';
import {
  Database, Play, Eye, Loader2, AlertTriangle, Check,
  Plus, Edit, Trash2, ArrowRightLeft, History
} from 'lucide-react';

export default function SyncTab({ api }) {
  const [syncConfig, setSyncConfig] = useState(null);
  const [syncSource, setSyncSource] = useState('auto');
  const [syncMode, setSyncMode] = useState('merge');
  const [syncDryRun, setSyncDryRun] = useState(true);
  const [syncFivemDbUrl, setSyncFivemDbUrl] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [lastSyncReport, setLastSyncReport] = useState(null);

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
      } else if (res.data.errors?.length > 0) {
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

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Configurazione Sync */}
      <OsPanel>
        <OsSectionHeader title="Sincronizzazione Job/Gradi" icon={Database} />
        
        <div className="space-y-4">
          {/* Alert informativo */}
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <AlertTriangle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400 mb-1">Sincronizzazione Database FiveM</p>
              <p className="text-plos-text-muted">
                Importa automaticamente i lavori e i gradi dal tuo server ESX o QBCore. 
                Usa sempre l'anteprima prima di applicare modifiche.
              </p>
            </div>
          </div>

          {/* Selezione Sorgente */}
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">Framework Sorgente</label>
            <div className="grid grid-cols-3 gap-2">
              {(syncConfig?.sources || []).map(src => (
                <button
                  key={src.code}
                  onClick={() => setSyncSource(src.code)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    syncSource === src.code 
                      ? 'border-plos-primary bg-plos-primary/10' 
                      : 'border-plos-border hover:border-plos-primary/50'
                  }`}
                >
                  <Database size={20} className={`mx-auto mb-2 ${syncSource === src.code ? 'text-plos-primary' : 'text-plos-text-muted'}`} />
                  <p className="text-sm font-medium">{src.name}</p>
                </button>
              ))}
            </div>
            {syncConfig?.sources?.find(s => s.code === syncSource)?.description && (
              <p className="text-xs text-plos-text-muted mt-2">
                {syncConfig.sources.find(s => s.code === syncSource).description}
              </p>
            )}
          </div>

          {/* Selezione Modalità */}
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">Modalità Sincronizzazione</label>
            <div className="grid grid-cols-2 gap-2">
              {(syncConfig?.modes || []).map(m => (
                <button
                  key={m.code}
                  onClick={() => setSyncMode(m.code)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    syncMode === m.code 
                      ? m.code === 'strict' 
                        ? 'border-red-500 bg-red-500/10' 
                        : 'border-plos-primary bg-plos-primary/10' 
                      : 'border-plos-border hover:border-plos-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {m.code === 'strict' ? (
                      <AlertTriangle size={16} className="text-red-400" />
                    ) : (
                      <ArrowRightLeft size={16} className={syncMode === m.code ? 'text-plos-primary' : 'text-plos-text-muted'} />
                    )}
                    <span className="font-medium text-sm">{m.name}</span>
                  </div>
                  <p className="text-xs text-plos-text-muted">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* URL Database (opzionale) */}
          <div>
            <label className="block text-sm text-plos-text-muted mb-2">
              URL Database FiveM <span className="text-xs">(opzionale)</span>
            </label>
            <input
              type="text"
              value={syncFivemDbUrl}
              onChange={(e) => setSyncFivemDbUrl(e.target.value)}
              placeholder="mysql://user:pass@host/database"
              className="w-full p-3 bg-plos-background border border-plos-border rounded-lg text-sm font-mono focus:border-plos-primary focus:outline-none"
            />
            <p className="text-xs text-plos-text-muted mt-1">
              {syncConfig?.info?.same_db_note || 'Lascia vuoto per usare il database corrente.'}
            </p>
          </div>

          {/* Toggle Anteprima */}
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
              className={`w-12 h-6 rounded-full transition-all ${
                syncDryRun ? 'bg-plos-primary' : 'bg-plos-border'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-all ${
                syncDryRun ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Warning per strict mode */}
          {syncMode === 'strict' && !syncDryRun && (
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-400 mb-1">Attenzione: Modalità Pericolosa!</p>
                <p className="text-plos-text-muted">
                  La modalità STRICT eliminerà tutti i job non presenti nella sorgente. 
                  Questo potrebbe rimuovere utenti dai loro ruoli. Usa con cautela!
                </p>
              </div>
            </div>
          )}

          {/* Pulsante Sync */}
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className={`w-full flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${
              syncDryRun 
                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                : 'bg-plos-primary hover:bg-plos-primary/80 text-black'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {syncLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Sincronizzazione in corso...
              </>
            ) : syncDryRun ? (
              <>
                <Eye size={20} />
                Anteprima Modifiche
              </>
            ) : (
              <>
                <Play size={20} />
                Esegui Sincronizzazione
              </>
            )}
          </button>
        </div>
      </OsPanel>

      {/* Report Sync */}
      <OsPanel>
        <OsSectionHeader title="Report Sincronizzazione" icon={History} />
        
        {syncReport ? (
          <div className="space-y-4">
            {/* Header Report */}
            <div className="flex items-center justify-between p-3 bg-plos-surface rounded-lg">
              <div>
                <p className="font-medium">
                  {syncReport.dry_run ? '🔍 Anteprima' : '✅ Eseguito'}
                </p>
                <p className="text-xs text-plos-text-muted">
                  {new Date(syncReport.timestamp).toLocaleString('it-IT')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono">{syncReport.source.toUpperCase()}</p>
                <p className="text-xs text-plos-text-muted">{syncReport.duration_ms}ms</p>
              </div>
            </div>

            {/* Framework rilevato */}
            {syncReport.framework_detected && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                <Database size={16} className="text-blue-400" />
                <span className="text-sm">{syncReport.framework_detected}</span>
              </div>
            )}

            {/* Statistiche */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Plus size={16} className="text-green-400" />
                  <span className="text-sm font-medium">Aggiunti</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{syncReport.jobs_added}</p>
                <p className="text-xs text-plos-text-muted">+{syncReport.grades_added} gradi</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Edit size={16} className="text-yellow-400" />
                  <span className="text-sm font-medium">Aggiornati</span>
                </div>
                <p className="text-2xl font-bold text-yellow-400">{syncReport.jobs_updated}</p>
                <p className="text-xs text-plos-text-muted">~{syncReport.grades_updated} gradi</p>
              </div>
              <div className="p-3 bg-plos-surface rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Check size={16} className="text-plos-text-muted" />
                  <span className="text-sm font-medium">Invariati</span>
                </div>
                <p className="text-2xl font-bold">{syncReport.jobs_skipped}</p>
                <p className="text-xs text-plos-text-muted">{syncReport.grades_skipped} gradi</p>
              </div>
              {syncReport.jobs_removed > 0 && (
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 size={16} className="text-red-400" />
                    <span className="text-sm font-medium">Rimossi</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{syncReport.jobs_removed}</p>
                  <p className="text-xs text-plos-text-muted">{syncReport.grades_removed} gradi</p>
                </div>
              )}
            </div>

            {/* Errori */}
            {syncReport.errors?.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="font-medium text-red-400 mb-2">Errori ({syncReport.errors.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {syncReport.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300 font-mono">{err}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Dettagli job */}
            {syncReport.items?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Dettaglio per Job</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {syncReport.items.map((item, i) => (
                    <div 
                      key={i}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        item.action === 'added' ? 'bg-green-500/10' :
                        item.action === 'updated' ? 'bg-yellow-500/10' :
                        item.action === 'removed' ? 'bg-red-500/10' :
                        'bg-plos-surface'
                      }`}
                    >
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
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : lastSyncReport ? (
          <div className="text-center py-8">
            <History size={48} className="mx-auto mb-4 text-plos-text-muted opacity-30" />
            <p className="text-plos-text-muted mb-2">Ultimo sync: {new Date(lastSyncReport.timestamp).toLocaleString('it-IT')}</p>
            <p className="text-sm text-plos-text-muted">
              {lastSyncReport.jobs_added} aggiunti, {lastSyncReport.jobs_updated} aggiornati
            </p>
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
