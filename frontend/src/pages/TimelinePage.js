import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import { Clock, Filter, Shield, Heart, Radio } from 'lucide-react';

export const TimelinePage = () => {
  const { api } = useAuth();
  const { play } = useSound();
  const { subscribe, events: sseEvents } = useSSE();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchEvents();
    
    const unsubscribe = subscribe('*', (event) => {
      play('notification');
      setEvents(prev => [event.data, ...prev.slice(0, 99)]);
    });

    return () => unsubscribe();
  }, [filter, subscribe, play]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.append('category', filter);
      params.append('limit', '100');
      
      const res = await api.get(`/timeline/?${params.toString()}`);
      setEvents(res.data);
    } catch (error) {
      console.error('Errore fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'lspd':
        return <Shield className="text-blue-500" size={16} />;
      case 'ems':
        return <Heart className="text-red-500" size={16} />;
      case 'dispatch':
        return <Radio className="text-plos-primary" size={16} />;
      default:
        return <Clock className="text-plos-text-muted" size={16} />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'lspd':
        return 'border-l-blue-500';
      case 'ems':
        return 'border-l-red-500';
      case 'dispatch':
        return 'border-l-plos-primary';
      default:
        return 'border-l-plos-border';
    }
  };

  return (
    <div className="space-y-6" data-testid="timeline-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Clock className="text-plos-primary" />
            TIMELINE <span className="text-plos-primary">GLOBALE</span>
          </h1>
          <p className="text-plos-text-secondary text-sm mt-1">
            Feed eventi unificato
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-plos-text-muted" />
          <select
            value={filter}
            onChange={(e) => {
              play('click');
              setFilter(e.target.value);
            }}
            className="input-tactical"
            data-testid="category-filter"
          >
            <option value="">Tutte le categorie</option>
            <option value="lspd">LSPD</option>
            <option value="ems">EMS</option>
            <option value="dispatch">Dispatch</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="card-tactical p-4">
        {loading ? (
          <div className="text-center py-8 text-plos-text-muted">Caricamento...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto mb-4 text-plos-text-muted" size={48} />
            <p className="text-plos-text-secondary">Nessun evento nella timeline</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={event.id || index}
                className={`p-4 bg-black/30 border border-plos-border border-l-4 ${getCategoryColor(event.category)}`}
                data-testid={`timeline-event-${event.id || index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getCategoryIcon(event.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-plos-surface text-xs font-heading tracking-wider uppercase">
                        {event.category}
                      </span>
                      <span className="text-xs text-plos-text-muted mono">
                        {event.event_type}
                      </span>
                    </div>
                    
                    <h3 className="font-medium">{event.title}</h3>
                    
                    {event.description && (
                      <p className="text-sm text-plos-text-secondary mt-1">
                        {event.description}
                      </p>
                    )}
                    
                    <p className="mono text-xs text-plos-text-muted mt-2">
                      {new Date(event.created_at || event.timestamp).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;
