/**
 * Justice - New Hearing Page
 * Creazione nuova udienza con selezione pratica FIXATA
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Calendar, Gavel, ArrowLeft, FileText, Search, AlertCircle, CheckCircle } from 'lucide-react';

const NewHearingPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingCases, setLoadingCases] = useState(true);
  const [cases, setCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    legal_case_id: '',
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    courtroom: '',
    description: ''
  });

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      // Carica tutte le pratiche (non solo quelle idonee per udienza)
      const res = await api.get('/justice/cases');
      setCases(res.data || []);
    } catch (error) {
      console.error('Errore caricamento pratiche:', error);
      toast.error('Errore nel caricamento delle pratiche');
    } finally {
      setLoadingCases(false);
    }
  };

  // Filtra pratiche in base alla ricerca
  const filteredCases = cases.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.case_number?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query) ||
      c.plaintiff_name?.toLowerCase().includes(query) ||
      c.defendant_name?.toLowerCase().includes(query)
    );
  });

  // Quando selezioni una pratica, auto-compila il titolo
  const handleCaseSelect = (caseId) => {
    const selectedCase = cases.find(c => c.id === parseInt(caseId));
    setFormData({
      ...formData,
      legal_case_id: caseId,
      title: selectedCase ? `Udienza: ${selectedCase.title || selectedCase.case_number}` : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('Inserisci un titolo per l\'udienza');
      return;
    }
    if (!formData.scheduled_date || !formData.scheduled_time) {
      toast.error('Inserisci data e ora dell\'udienza');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
      
      await api.post('/justice/hearings', {
        legal_case_id: formData.legal_case_id ? parseInt(formData.legal_case_id) : null,
        title: formData.title,
        scheduled_date: scheduledAt,
        courtroom: formData.courtroom || null,
        description: formData.description || null
      });
      
      toast.success('Udienza programmata con successo');
      navigate('/justice');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione dell\'udienza');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto" data-testid="new-hearing-page">
      <button
        onClick={() => navigate('/justice')}
        className="flex items-center gap-2 text-plos-text-secondary hover:text-plos-primary mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Torna a Governo & Giustizia
      </button>

      <div className="glass-card rounded-xl p-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2 mb-6">
          <Gavel className="text-purple-500" />
          NUOVA UDIENZA
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selezione Pratica */}
          <div>
            <label className="block text-sm text-plos-text-secondary mb-2 flex items-center gap-2">
              <FileText size={14} />
              PRATICA ASSOCIATA
            </label>
            
            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg text-sm focus:border-plos-primary focus:outline-none"
                placeholder="Cerca pratica per numero, titolo..."
              />
            </div>

            {/* Lista pratiche selezionabili */}
            {loadingCases ? (
              <div className="text-center py-4 text-plos-text-muted text-sm">
                Caricamento pratiche...
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-plos-border rounded-lg bg-black/20">
                {filteredCases.length === 0 ? (
                  <div className="p-4 text-center text-plos-text-muted text-sm flex items-center justify-center gap-2">
                    <AlertCircle size={16} />
                    Nessuna pratica trovata
                  </div>
                ) : (
                  filteredCases.map(c => (
                    <div
                      key={c.id}
                      onClick={() => handleCaseSelect(c.id)}
                      className={`p-3 border-b border-plos-border/30 last:border-b-0 cursor-pointer hover:bg-plos-primary/10 transition-colors ${
                        formData.legal_case_id === String(c.id) ? 'bg-plos-primary/20 border-l-2 border-l-plos-primary' : ''
                      }`}
                      data-testid={`case-option-${c.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-purple-400">{c.case_number}</p>
                          <p className="text-sm font-medium">{c.title || 'Senza titolo'}</p>
                          <p className="text-xs text-plos-text-muted">
                            {c.case_type} | {c.status}
                          </p>
                        </div>
                        {formData.legal_case_id === String(c.id) && (
                          <CheckCircle className="text-plos-primary" size={18} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {formData.legal_case_id && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, legal_case_id: '', title: '' })}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                Rimuovi selezione pratica
              </button>
            )}
          </div>

          {/* Titolo Udienza */}
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">TITOLO UDIENZA *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              placeholder="Es: Prima udienza caso Smith vs. Johnson"
              required
            />
          </div>

          {/* Data e Ora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">DATA *</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-plos-text-secondary mb-1">ORA *</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Aula */}
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">AULA</label>
            <input
              type="text"
              value={formData.courtroom}
              onChange={(e) => setFormData({...formData, courtroom: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              placeholder="Es: Aula 1, Tribunale Centrale"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm text-plos-text-secondary mb-1">NOTE / DESCRIZIONE</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              rows={3}
              placeholder="Note aggiuntive sull'udienza..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/justice')}
              className="flex-1 px-4 py-2.5 bg-plos-surface border border-plos-border rounded-lg hover:border-plos-text-muted transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-tactical flex items-center justify-center gap-2"
            >
              {loading ? 'Creazione...' : (
                <>
                  <Calendar size={18} />
                  PROGRAMMA UDIENZA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewHearingPage;
