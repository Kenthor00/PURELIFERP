/**
 * PURE LIFE OS 3.0 - OS Login Page
 * Schermata di accesso Sistema Operativo Governativo
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export const OSLoginPage = () => {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const sector = user.sector?.toLowerCase() || user.role || 'civil';
      const routes = {
        admin: '/admin',
        lspd: '/lspd',
        police: '/lspd',
        ems: '/ems',
        dispatch: '/dispatch',
        government: '/justice',
        news: '/news/editor',
        weazel: '/news/editor',
      };
      navigate(routes[sector] || '/city');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0f12] flex flex-col relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#adff2f" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Noise Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* System Bar */}
      <div className="h-10 bg-[#0f1519] border-b border-[#1b2a30] flex items-center justify-between px-4 relative z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#adff2f]" />
          <span className="text-[0.6875rem] font-bold tracking-[0.15em] text-[#7f9aa3]">
            PURE LIFE OS
          </span>
          <span className="text-[0.625rem] text-[#4a6670]">v3.0</span>
        </div>
        <span className="text-sm font-mono font-bold text-[#e6f1f2]">
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#adff2f]" />
          <span className="text-[0.625rem] text-[#7f9aa3]">SISTEMA ATTIVO</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-[#0f1519] border border-[#1b2a30] flex items-center justify-center">
              <Shield className="w-10 h-10 text-[#adff2f]" />
            </div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-[#e6f1f2] mb-1">
              PURE LIFE OS
            </h1>
            <p className="text-[0.6875rem] text-[#7f9aa3] tracking-wider">
              SISTEMA OPERATIVO GOVERNATIVO
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-[#0f1519] border border-[#1b2a30] rounded-lg overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-[#1b2a30] bg-gradient-to-r from-[#adff2f]/5 to-transparent">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-[#adff2f]" />
                <span className="text-[0.75rem] font-bold tracking-wider text-[#e6f1f2]">
                  AUTENTICAZIONE RICHIESTA
                </span>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-3 bg-[#ff3b3b]/10 border border-[#ff3b3b]/30 rounded-md">
                  <AlertCircle className="w-4 h-4 text-[#ff3b3b] flex-shrink-0" />
                  <p className="text-[0.75rem] text-[#ff3b3b]">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-[0.625rem] font-bold tracking-[0.1em] text-[#7f9aa3] mb-2">
                  EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6670]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0f12] border border-[#1b2a30] rounded-md text-[#e6f1f2] text-sm placeholder:text-[#4a6670] focus:outline-none focus:border-[#adff2f]/50 focus:ring-1 focus:ring-[#adff2f]/20 transition-all"
                    placeholder="utente@purelife.rp"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[0.625rem] font-bold tracking-[0.1em] text-[#7f9aa3] mb-2">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6670]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-[#0a0f12] border border-[#1b2a30] rounded-md text-[#e6f1f2] text-sm placeholder:text-[#4a6670] focus:outline-none focus:border-[#adff2f]/50 focus:ring-1 focus:ring-[#adff2f]/20 transition-all"
                    placeholder="••••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6670] hover:text-[#7f9aa3] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#adff2f] text-[#0a0f12] font-bold text-[0.75rem] tracking-wider rounded-md hover:bg-[#8bcc26] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AUTENTICAZIONE...
                  </>
                ) : (
                  'ACCEDI AL SISTEMA'
                )}
              </button>
            </form>

            {/* Form Footer */}
            <div className="px-6 py-4 border-t border-[#1b2a30] bg-[#0a0f12]/50">
              <div className="flex items-center justify-between text-[0.625rem]">
                <Link 
                  to="/register"
                  className="text-[#7f9aa3] hover:text-[#adff2f] transition-colors tracking-wider"
                >
                  REGISTRATI
                </Link>
                <Link 
                  to="/city"
                  className="text-[#7f9aa3] hover:text-[#adff2f] transition-colors tracking-wider"
                >
                  ACCESSO PUBBLICO →
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[0.5625rem] text-[#4a6670] mt-6 tracking-wider">
            SISTEMA PROTETTO • ACCESSO NON AUTORIZZATO PERSEGUIBILE
          </p>
        </div>
      </div>
    </div>
  );
};

export default OSLoginPage;
