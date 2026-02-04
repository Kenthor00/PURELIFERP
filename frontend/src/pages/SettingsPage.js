import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { Settings, Volume2, VolumeX, User, Save, Loader2 } from 'lucide-react';

export const SettingsPage = () => {
  const { user, updateSettings } = useAuth();
  const { enabled: soundEnabled, toggle: toggleSound, play } = useSound();
  
  const [saving, setSaving] = useState(false);

  const handleSoundToggle = async () => {
    const newValue = !soundEnabled;
    toggleSound(newValue);
    
    try {
      setSaving(true);
      await updateSettings({ sound_enabled: newValue });
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <Settings className="text-plos-primary" />
          IMPOSTAZIONI
        </h1>
        <p className="text-plos-text-secondary text-sm mt-1">
          Configurazione sistema
        </p>
      </div>

      {/* Profile */}
      <div className="card-tactical p-6">
        <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
          <User size={18} className="text-blue-500" />
          PROFILO UTENTE
        </h2>
        
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-1">
                NOME
              </label>
              <p className="text-lg">{user?.name}</p>
            </div>
            
            <div>
              <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-1">
                EMAIL
              </label>
              <p className="text-lg mono">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-1">
                RUOLO
              </label>
              <span className={`px-3 py-1 border inline-block uppercase font-heading tracking-wider ${
                user?.role === 'police' ? 'border-blue-500 text-blue-500' :
                user?.role === 'ems' ? 'border-red-500 text-red-500' :
                user?.role === 'dispatch' ? 'border-plos-primary text-plos-primary' :
                'border-plos-primary text-plos-primary'
              }`}>
                {user?.role}
              </span>
            </div>
            
            {user?.badge_number && (
              <div>
                <label className="block text-plos-text-secondary text-xs tracking-wider font-heading mb-1">
                  DISTINTIVO
                </label>
                <p className="text-lg mono">{user?.badge_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="card-tactical p-6">
        <h2 className="font-heading text-lg tracking-wider mb-4 flex items-center gap-2">
          {soundEnabled ? <Volume2 size={18} className="text-plos-primary" /> : <VolumeX size={18} className="text-plos-text-muted" />}
          AUDIO
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Suoni UI Tattici</p>
            <p className="text-sm text-plos-text-secondary mt-1">
              Abilita effetti sonori per interazioni e notifiche
            </p>
          </div>
          
          <button
            onClick={handleSoundToggle}
            disabled={saving}
            className={`relative w-14 h-7 rounded-none border transition-colors ${
              soundEnabled
                ? 'bg-plos-primary/20 border-plos-primary'
                : 'bg-plos-surface border-plos-border'
            }`}
            data-testid="sound-toggle-btn"
          >
            <span
              className={`absolute top-1 w-5 h-5 transition-all ${
                soundEnabled
                  ? 'left-7 bg-plos-primary'
                  : 'left-1 bg-plos-text-muted'
              }`}
            />
          </button>
        </div>
        
        {soundEnabled && (
          <div className="mt-4 pt-4 border-t border-plos-border">
            <p className="text-sm text-plos-text-muted mb-3">Test suoni:</p>
            <div className="flex flex-wrap gap-2">
              {['click', 'success', 'error', 'alert', 'notification', 'dispatch'].map((sound) => (
                <button
                  key={sound}
                  onClick={() => play(sound)}
                  className="px-3 py-1 border border-plos-border text-xs uppercase hover:border-plos-primary hover:text-plos-primary transition-colors"
                >
                  {sound}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="card-tactical p-6">
        <h2 className="font-heading text-lg tracking-wider mb-4">INFORMAZIONI SISTEMA</h2>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-plos-text-secondary">Versione</span>
            <span className="mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plos-text-secondary">Sistema</span>
            <span className="mono">PURE LIFE OS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plos-text-secondary">Database</span>
            <span className="mono">MySQL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-plos-text-secondary">Realtime</span>
            <span className="mono">SSE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
