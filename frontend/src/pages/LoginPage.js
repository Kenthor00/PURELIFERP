import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useHealth } from '../context/HealthContext';
import { Shield, AlertCircle, Loader2, Database, Server, Zap, ChevronLeft } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { play } = useSound();
  const { isDbAvailable, isBackendAvailable, health, needsSeed } = useHealth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';
  
  // Check if login is allowed (disabled if DB down, but allowed if just needs seed - seed banner handles that)
  const loginDisabled = !isBackendAvailable || !isDbAvailable;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    play('click');

    try {
      const result = await login(email, password);
      play('success');
      
      // Check if needs game_name
      if (result.needs_game_name) {
        navigate('/set-game-name', { replace: true });
        return;
      }
      
      // Redirect based on sector
      let redirectPath = from;
      if (from === '/' || from === '/login') {
        const sector = result.sector?.toUpperCase();
        switch (sector) {
          case 'ADMIN':
            redirectPath = '/admin';
            break;
          case 'LSPD':
            redirectPath = '/lspd';
            break;
          case 'EMS':
            redirectPath = '/ems';
            break;
          case 'DISPATCH':
            redirectPath = '/dispatch';
            break;
          case 'GOV':
            redirectPath = '/justice';
            break;
          case 'NEWS':
            redirectPath = '/city/news';
            break;
          default:
            redirectPath = '/city';
        }
      }
      
      navigate(redirectPath, { replace: true });
    } catch (err) {
      play('error');
      setError(err.response?.data?.detail || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-plos-primary/5 to-transparent" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Pulsante Torna Indietro */}
        <button
          onClick={() => navigate('/city')}
          className="absolute -top-12 left-0 flex items-center gap-1 text-plos-text-secondary hover:text-plos-primary transition-colors text-sm"
          data-testid="login-back-btn"
        >
          <ChevronLeft size={18} />
          <span className="font-heading tracking-wider">TORNA INDIETRO</span>
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-plos-primary bg-plos-surface mb-4 animate-pulse-glow overflow-hidden">
            <img 
              src="/logo.png" 
              alt="PURE LIFE OS" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<svg class="w-10 h-10 text-plos-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
              }}
            />
          </div>
          <h1 className="font-heading text-3xl tracking-widest">
            PURE LIFE <span className="text-plos-primary">OS</span>
          </h1>
          <p className="text-plos-text-secondary mt-2 text-sm tracking-wider">
            SISTEMA OPERATIVO DIGITALE
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel corner-brackets p-6" data-testid="login-card">
          <h2 className="font-heading text-xl tracking-wider mb-6 text-center">
            ACCESSO SISTEMA
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-plos-alert/10 border border-plos-alert text-plos-alert text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* System Status Alert */}
          {loginDisabled && (
            <div className="p-4 mb-4 bg-orange-500/10 border border-orange-500">
              <div className="flex items-start gap-3">
                {!isBackendAvailable ? (
                  <Server className="text-orange-500 mt-0.5" size={20} />
                ) : (
                  <Database className="text-orange-500 mt-0.5" size={20} />
                )}
                <div>
                  <p className="text-orange-500 font-heading text-sm">SISTEMA NON DISPONIBILE</p>
                  <p className="text-plos-text-secondary text-xs mt-1">
                    {!isBackendAvailable 
                      ? 'Il server backend non è raggiungibile. Riprova tra qualche minuto.'
                      : 'Il database non è raggiungibile. Il login è temporaneamente disabilitato.'}
                  </p>
                  {health.db?.error && (
                    <p className="text-orange-400/70 text-xs mt-1 mono">
                      {health.db.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-plos-text-secondary text-xs tracking-wider mb-2 font-heading">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-tactical w-full"
                placeholder="operatore@purelife.rp"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-plos-text-secondary text-xs tracking-wider mb-2 font-heading">
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-tactical w-full"
                placeholder="••••••••"
                required
                data-testid="password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || loginDisabled}
              className="btn-tactical w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  AUTENTICAZIONE...
                </>
              ) : loginDisabled ? (
                'LOGIN DISABILITATO'
              ) : (
                'ACCEDI'
              )}
            </button>

            {/* Link Registrazione */}
            <div className="mt-4 text-center">
              <p className="text-plos-text-secondary text-sm">
                Non hai un account?{' '}
                <Link 
                  to="/register" 
                  className="text-plos-primary hover:underline font-medium"
                  data-testid="register-link"
                >
                  Registrati come Cittadino
                </Link>
              </p>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-plos-border">
            <p className="text-plos-text-muted text-xs text-center mono">
              v1.0.0 | SISTEMA PROTETTO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
