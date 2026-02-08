/**
 * PURE LIFE OS 3.0 - Delete Confirmation Modal
 * Modal premium per conferma eliminazione risorse
 */

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  resourceType,
  resourceName,
  resourceId,
  allowPermanent = false,
  loading = false
}) => {
  const [permanent, setPermanent] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const { user } = useAuth();
  
  const isAdmin = user?.sector === 'ADMIN';
  const needsConfirmation = permanent || resourceType === 'user';
  const confirmRequired = needsConfirmation ? 'ELIMINA' : '';

  const handleConfirm = () => {
    if (needsConfirmation && confirmText !== 'ELIMINA') return;
    onConfirm({ permanent, reason });
  };

  const handleClose = () => {
    setPermanent(false);
    setReason('');
    setConfirmText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-red-500/30 rounded-lg shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <h3 className="font-heading text-lg text-white">CONFERMA ELIMINAZIONE</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-slate-300 mb-2">
              Stai per eliminare:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
              <span className="text-plos-primary font-mono">#{resourceId}</span>
              <span className="text-white font-medium">{resourceName}</span>
            </div>
            <p className="text-sm text-slate-500 mt-2 capitalize">
              Tipo: {resourceType?.replace('_', ' ')}
            </p>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Motivo eliminazione (opzionale)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Es: Duplicato, errore, richiesta utente..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-plos-primary"
            />
          </div>

          {/* Eliminazione permanente (solo admin) */}
          {allowPermanent && isAdmin && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="w-4 h-4 accent-red-500"
                />
                <div>
                  <span className="text-red-400 font-medium">Eliminazione permanente</span>
                  <p className="text-xs text-red-400/70">
                    Non sarà possibile recuperare questa risorsa
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Conferma testo (per eliminazioni pericolose) */}
          {needsConfirmation && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Scrivi <span className="text-red-400 font-mono">ELIMINA</span> per confermare
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="ELIMINA"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/30">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (needsConfirmation && confirmText !== 'ELIMINA')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              permanent 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            {permanent ? 'Elimina Permanentemente' : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook per gestire delete con API
export const useDelete = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteResource = async (resourceType, resourceId, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.permanent) params.append('permanent', 'true');
      if (options.reason) params.append('reason', options.reason);

      const url = `/admin/delete/${resourceType}/${resourceId}?${params.toString()}`;
      const response = await api.delete(url);
      
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.detail || 'Errore durante l\'eliminazione';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const bulkDelete = async (resourceType, resourceIds, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.permanent) params.append('permanent', 'true');
      if (options.reason) params.append('reason', options.reason);

      const response = await api.post(`/admin/delete/bulk?${params.toString()}`, {
        resource_type: resourceType,
        resource_ids: resourceIds
      });
      
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      const message = err.response?.data?.detail || 'Errore durante l\'eliminazione multipla';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  return { deleteResource, bulkDelete, loading, error };
};

export default DeleteModal;
