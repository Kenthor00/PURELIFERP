/**
 * PURE LIFE OS - Public Document Verification Page
 * Pagina pubblica per verifica documento via QR
 * Accessibile senza autenticazione
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Shield,
  FileText, Calendar, Building2, User, Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VerifyDocumentPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyDocument();
  }, [token]);

  const verifyDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/documents/verify/${token}`);
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Documento non trovato o link non valido');
      } else if (err.response?.status === 429) {
        setError('Troppe richieste. Riprova tra un minuto.');
      } else {
        setError('Errore nella verifica del documento');
      }
    } finally {
      setLoading(false);
    }
  };

  // Status config
  const getStatusConfig = (status) => {
    const configs = {
      VALID: {
        icon: CheckCircle2,
        color: 'text-lime-500',
        bg: 'bg-lime-500/10',
        border: 'border-lime-500',
        label: 'DOCUMENTO VALIDO'
      },
      SUSPENDED: {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500',
        label: 'DOCUMENTO SOSPESO'
      },
      REVOKED: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500',
        label: 'DOCUMENTO REVOCATO'
      },
      EXPIRED: {
        icon: Clock,
        color: 'text-gray-500',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500',
        label: 'DOCUMENTO SCADUTO'
      }
    };
    return configs[status] || configs.VALID;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="text-lime-400" size={28} />
            <h1 className="text-2xl font-bold text-white">PURE LIFE OS</h1>
          </div>
          <p className="text-slate-400 text-sm">Sistema di Verifica Documenti</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-lime-400 mx-auto mb-4" size={48} />
              <p className="text-slate-400">Verifica in corso...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <XCircle className="text-red-500 mx-auto mb-4" size={64} />
              <h2 className="text-xl font-bold text-white mb-2">Verifica Fallita</h2>
              <p className="text-slate-400">{error}</p>
              <button
                onClick={verifyDocument}
                className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Riprova
              </button>
            </div>
          ) : result ? (
            <>
              {/* Status Banner */}
              {(() => {
                const config = getStatusConfig(result.status);
                const StatusIcon = config.icon;
                return (
                  <div className={`${config.bg} border-b-4 ${config.border} p-6 text-center`}>
                    <StatusIcon className={`${config.color} mx-auto mb-3`} size={64} />
                    <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
                    <p className="text-slate-400 text-sm mt-1">{result.status_label}</p>
                  </div>
                );
              })()}

              {/* Document Info */}
              <div className="p-6 space-y-4">
                {/* Document Type */}
                <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <FileText className="text-lime-400" size={24} />
                  <div>
                    <p className="text-xs text-slate-400">Tipo Documento</p>
                    <p className="font-medium text-white">{result.document_type}</p>
                  </div>
                </div>

                {/* Holder */}
                <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <User className="text-blue-400" size={24} />
                  <div>
                    <p className="text-xs text-slate-400">Intestatario</p>
                    <p className="font-medium text-white">{result.holder_name}</p>
                    <p className="text-xs text-slate-500">({result.holder_initials})</p>
                  </div>
                </div>

                {/* Document Number */}
                <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <Shield className="text-purple-400" size={24} />
                  <div>
                    <p className="text-xs text-slate-400">Numero Documento</p>
                    <p className="font-mono text-white">{result.document_number_masked}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="text-slate-400" size={16} />
                      <p className="text-xs text-slate-400">Emesso il</p>
                    </div>
                    <p className="text-sm text-white">
                      {new Date(result.issued_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  {result.expires_at && (
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className={result.is_expired ? 'text-red-400' : 'text-slate-400'} size={16} />
                        <p className="text-xs text-slate-400">Scadenza</p>
                      </div>
                      <p className={`text-sm ${result.is_expired ? 'text-red-400 font-bold' : 'text-white'}`}>
                        {new Date(result.expires_at).toLocaleDateString('it-IT')}
                        {result.is_expired && ' (SCADUTO)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Issuing Authority */}
                <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <Building2 className="text-amber-400" size={24} />
                  <div>
                    <p className="text-xs text-slate-400">Ente Emittente</p>
                    <p className="font-medium text-white">{result.issuing_authority}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500">
                    Verifica effettuata il {new Date(result.verified_at).toLocaleString('it-IT')}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Sistema certificato PURE LIFE OS
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Legal Note */}
        <p className="text-center text-slate-600 text-xs mt-4">
          La verifica è valida al momento della consultazione.
          <br />
          Per informazioni: supporto@purelife.rp
        </p>
      </div>
    </div>
  );
}
