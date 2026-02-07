/**
 * PURE LIFE OS - Registrazione Pubblica Cittadini
 * Permette ai cittadini di creare il proprio account
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSound } from '../context/SoundContext';
import { useHealth } from '../context/HealthContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  UserPlus, AlertCircle, Loader2, ChevronLeft, 
  CheckCircle, Eye, EyeOff, User, Mail, Lock 
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const RegisterPage = () => {
  const { play } = useSound();
  const { isDbAvailable, isBackendAvailable } = useHealth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    game_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const registrationDisabled = !isBackendAvailable || !isDbAvailable;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.game_name || formData.game_name.trim().length < 3) {
      setError('Il nome in game deve essere di almeno 3 caratteri');
      return false;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setError('Inserisci un\'email valida');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setError('');
    setLoading(true);
    play('click');

    try {
      const response = await axios.post(`${API_URL}/api/auth/register/citizen`, {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        game_name: formData.game_name.trim()
      });

      play('success');
      setSuccess(true);
      
      // Salva token per login automatico
      if (response.data.access_token) {
        localStorage.setItem('plos_token', response.data.access_token);
        localStorage.setItem('plos_refresh_token', response.data.refresh_token);
        
        toast.success(`Benvenuto ${response.data.game_name}!`);
        
        // Redirect alla city dopo 1.5 secondi
        setTimeout(() => {
          window.location.href = '/city';
        }, 1500);
      }
      
    } catch (err) {
      play('error');
      const detail = err.response?.data?.detail;
      setError(detail || 'Errore durante la registrazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="font-heading text-2xl mb-2">Registrazione Completata!</h1>
            <p className="text-plos-text-secondary mb-4">
              Benvenuto a Pure Life, {formData.game_name}
            </p>
            <p className="text-sm text-plos-text-muted">
              Reindirizzamento in corso...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          data-testid="register-back-btn"
        >
          <ChevronLeft size={18} />
          <span className="font-heading tracking-wider">TORNA INDIETRO</span>
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-plos-primary bg-plos-surface mb-3 animate-pulse-glow overflow-hidden">
            <img 
              src="/logo.png" 
              alt="PURE LIFE OS" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<svg class="w-8 h-8 text-plos-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
              }}
            />
          </div>
          <h1 className="font-heading text-2xl tracking-widest">
            REGISTRAZIONE <span className="text-plos-primary">CITTADINO</span>
          </h1>
          <p className="text-plos-text-secondary mt-1 text-sm tracking-wider">
            Crea il tuo account Pure Life
          </p>
        </div>

        {/* System Status Warning */}
        {registrationDisabled && (
          <div className="glass-card rounded-lg p-4 mb-4 border border-plos-alert/50">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-plos-alert w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-plos-alert font-medium text-sm">Sistema non disponibile</p>
                <p className="text-plos-text-muted text-xs">Registrazione temporaneamente disabilitata</p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle className="text-red-400 w-4 h-4 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Game Name */}
          <div className="mb-4">
            <label className="block text-plos-text-secondary text-xs font-heading mb-1.5 tracking-wider">
              NOME IN GAME *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted w-4 h-4" />
              <input
                type="text"
                name="game_name"
                value={formData.game_name}
                onChange={handleChange}
                placeholder="Il tuo nome nel gioco"
                className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-colors"
                disabled={loading || registrationDisabled}
                data-testid="register-game-name"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-plos-text-secondary text-xs font-heading mb-1.5 tracking-wider">
              EMAIL *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted w-4 h-4" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tua@email.com"
                className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-colors"
                disabled={loading || registrationDisabled}
                data-testid="register-email"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-plos-text-secondary text-xs font-heading mb-1.5 tracking-wider">
              PASSWORD *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimo 8 caratteri"
                className="w-full pl-10 pr-10 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-colors"
                disabled={loading || registrationDisabled}
                data-testid="register-password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-plos-text-muted hover:text-plos-primary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-plos-text-secondary text-xs font-heading mb-1.5 tracking-wider">
              CONFERMA PASSWORD *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted w-4 h-4" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ripeti la password"
                className="w-full pl-10 pr-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-colors"
                disabled={loading || registrationDisabled}
                data-testid="register-confirm-password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || registrationDisabled}
            className="w-full py-3 bg-plos-primary text-black font-heading font-semibold tracking-wider rounded-lg hover:bg-plos-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="register-submit"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                REGISTRAZIONE...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                REGISTRATI
              </>
            )}
          </button>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <p className="text-plos-text-secondary text-sm">
              Hai già un account?{' '}
              <Link 
                to="/login" 
                className="text-plos-primary hover:underline font-medium"
              >
                Accedi
              </Link>
            </p>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-plos-surface/50 rounded-lg">
            <p className="text-plos-text-muted text-xs text-center">
              La registrazione è riservata ai <span className="text-plos-primary">cittadini</span>. 
              Per altri ruoli (LSPD, EMS, NEWS, etc.) contatta un amministratore.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
