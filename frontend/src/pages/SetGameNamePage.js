/**
 * PURE LIFE OS - Set Game Name Page
 * Pagina obbligatoria per impostare il nome in game al primo accesso
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SetGameNamePage = () => {
  const [gameName, setGameName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gameName || gameName.trim().length < 3) {
      toast.error('Il nome in game deve avere almeno 3 caratteri');
      return;
    }

    if (gameName.length > 50) {
      toast.error('Il nome in game non può superare i 50 caratteri');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('plos_token');
      await axios.post(
        `${API_URL}/api/auth/set-game-name`,
        { game_name: gameName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Nome in game impostato con successo!');
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
      
      // Redirect to appropriate dashboard
      const sector = user?.sector?.toUpperCase();
      switch (sector) {
        case 'LSPD':
          navigate('/lspd');
          break;
        case 'EMS':
          navigate('/ems');
          break;
        case 'DISPATCH':
          navigate('/dispatch');
          break;
        case 'GOV':
          navigate('/justice');
          break;
        case 'NEWS':
          navigate('/city/news');
          break;
        case 'ADMIN':
          navigate('/admin');
          break;
        default:
          navigate('/city');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Errore durante il salvataggio';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-plos-primary to-plos-accent rounded-lg flex items-center justify-center">
            <span className="text-3xl font-heading font-bold text-black">PL</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-white tracking-wider">
            PURE LIFE OS
          </h1>
          <p className="text-plos-text-secondary mt-2">
            Imposta il tuo nome in game
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-plos-accent rounded-full animate-pulse"></div>
              <span className="text-plos-accent text-sm font-medium">CONFIGURAZIONE RICHIESTA</span>
            </div>
            <p className="text-plos-text-secondary text-sm">
              Prima di accedere al sistema, devi impostare il tuo nome in game.
              Questo nome sarà visibile a tutti gli altri utenti.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-plos-text-secondary text-sm mb-2">
                Nome In Game
              </label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Es: Marco_Rossi"
                className="w-full bg-plos-surface border border-plos-border rounded-lg px-4 py-3 text-white placeholder-plos-text-secondary focus:border-plos-primary focus:outline-none transition-colors"
                maxLength={50}
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-plos-text-secondary mt-2">
                Minimo 3 caratteri, massimo 50
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || gameName.trim().length < 3}
              className="w-full bg-gradient-to-r from-plos-primary to-plos-accent text-black font-semibold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-plos-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvataggio...
                </span>
              ) : (
                'Conferma e Accedi'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-plos-surface/50 rounded-lg border border-plos-border">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-plos-primary/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-plos-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-plos-text-secondary">
                  <strong className="text-white">Suggerimento:</strong> Usa lo stesso nome che usi in game per essere riconosciuto più facilmente dai tuoi colleghi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="mt-4 text-center">
            <p className="text-plos-text-secondary text-sm">
              Accesso come: <span className="text-white">{user.email}</span>
            </p>
            <p className="text-plos-text-secondary text-sm">
              Settore: <span className="text-plos-accent">{user.sector}</span> - {user.grade}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetGameNamePage;
