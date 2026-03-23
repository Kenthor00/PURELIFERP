/**
 * PURE LIFE OS - Marketplace Page
 * Sistema annunci per cittadini
 * UI 100% in Italiano
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { OsPanel, OsPageHeader, OsStatCard } from '../../components/os/OsComponents';
import {
  ShoppingBag, Plus, Search, Filter, Eye, MessageSquare, Check, X,
  Car, Building2, Briefcase, Wrench, Heart, Clock, MapPin, Phone,
  Mail, RefreshCw, ChevronRight, Tag, DollarSign, User, Edit, Trash2,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';

// Category icons mapping
const categoryIcons = {
  vehicles: Car,
  real_estate: Building2,
  jobs: Briefcase,
  services: Wrench
};

const categoryColors = {
  vehicles: '#3b82f6',
  real_estate: '#8b5cf6',
  jobs: '#22c55e',
  services: '#f59e0b'
};

const categoryLabels = {
  vehicles: 'Veicoli',
  real_estate: 'Immobili',
  jobs: 'Lavoro',
  services: 'Servizi'
};

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    sold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    removed: 'bg-red-500/20 text-red-400 border-red-500/30',
    expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  const labels = {
    active: 'Attivo',
    pending: 'In attesa',
    sold: 'Venduto',
    removed: 'Rimosso',
    expired: 'Scaduto',
    draft: 'Bozza'
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

// Listing card component
function ListingCard({ listing, onClick }) {
  const Icon = categoryIcons[listing.category] || ShoppingBag;
  const color = categoryColors[listing.category] || '#888';
  
  return (
    <div 
      onClick={onClick}
      data-testid={`listing-card-${listing.id}`}
      className="bg-plos-surface p-4 rounded-lg border border-plos-border hover:border-plos-primary/50 cursor-pointer transition-all group"
    >
      {/* Image or placeholder */}
      <div className="relative h-40 rounded-lg mb-3 overflow-hidden bg-plos-background">
        {listing.images && listing.images.length > 0 ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={48} style={{ color }} className="opacity-30" />
          </div>
        )}
        {listing.is_featured && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
            IN EVIDENZA
          </span>
        )}
        <div 
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}30` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      
      {/* Info */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-heading font-bold text-sm line-clamp-1">{listing.title}</h3>
        <StatusBadge status={listing.status} />
      </div>
      
      <p className="text-lg font-bold text-plos-primary mb-2">
        {listing.price_display}
      </p>
      
      <div className="space-y-1 text-xs text-plos-text-muted">
        {listing.location && (
          <p className="flex items-center gap-1">
            <MapPin size={12} />
            <span className="truncate">{listing.location}</span>
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {listing.views_count} views
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {listing.interests_count} interessi
          </span>
        </div>
      </div>
    </div>
  );
}

// Create listing modal
function CreateListingModal({ isOpen, onClose, api, categories, onCreated }) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    price_negotiable: true,
    contact_phone: '',
    contact_email: '',
    location: '',
    images: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setFormData({
        title: '',
        description: '',
        price: '',
        price_negotiable: true,
        contact_phone: '',
        contact_email: '',
        location: '',
        images: []
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: selectedCategory.code,
        price: formData.price ? parseFloat(formData.price) : null,
        price_negotiable: formData.price_negotiable,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        location: formData.location || null,
        images: formData.images.length > 0 ? formData.images : null
      };
      
      const res = await api.post('/marketplace', payload);
      toast.success('Annuncio creato! In attesa di approvazione.');
      onCreated(res.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-background border border-plos-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-plos-border">
          <h2 className="font-heading text-xl font-bold">Nuovo Annuncio</h2>
          <button onClick={onClose} className="p-2 hover:bg-plos-surface rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {/* Step 1: Select category */}
          {step === 1 && (
            <div>
              <p className="text-sm text-plos-text-muted mb-4">Seleziona la categoria dell'annuncio:</p>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => {
                  const Icon = categoryIcons[cat.code] || ShoppingBag;
                  return (
                    <button
                      key={cat.code}
                      onClick={() => { setSelectedCategory(cat); setStep(2); }}
                      data-testid={`category-${cat.code}`}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:border-plos-primary/50 ${
                        selectedCategory?.code === cat.code ? 'border-plos-primary bg-plos-primary/10' : 'border-plos-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <Icon size={20} style={{ color: cat.color }} />
                        </div>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <p className="text-xs text-plos-text-muted">{cat.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Step 2: Fill details */}
          {step === 2 && selectedCategory && (
            <div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-plos-surface rounded-lg">
                {(() => {
                  const Icon = categoryIcons[selectedCategory.code] || ShoppingBag;
                  return (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedCategory.color}20` }}
                    >
                      <Icon size={20} style={{ color: selectedCategory.color }} />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-bold">{selectedCategory.name}</h3>
                  <p className="text-xs text-plos-text-muted">{selectedCategory.description}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-plos-text-muted mb-1">Titolo *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    placeholder="Es: Vendo BMW M3 2024"
                    data-testid="listing-title-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-plos-text-muted mb-1">Descrizione *</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none resize-none"
                    rows={4}
                    placeholder="Descrivi dettagliatamente il tuo annuncio..."
                    data-testid="listing-description-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-plos-text-muted mb-1">Prezzo ($)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                      placeholder="Lascia vuoto per 'Su richiesta'"
                      data-testid="listing-price-input"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.price_negotiable}
                        onChange={e => setFormData({...formData, price_negotiable: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Prezzo trattabile</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-plos-text-muted mb-1">Posizione</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                    placeholder="Es: Los Santos, Vinewood"
                    data-testid="listing-location-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-plos-text-muted mb-1">Telefono</label>
                    <input
                      type="text"
                      value={formData.contact_phone}
                      onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                      className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                      placeholder="Numero di telefono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-plos-text-muted mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={e => setFormData({...formData, contact_email: e.target.value})}
                      className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
                      placeholder="Email di contatto"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
                >
                  Indietro
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !formData.title || formData.description.length < 20}
                  data-testid="create-listing-submit"
                  className="flex-1 px-4 py-3 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80 disabled:opacity-50"
                >
                  {loading ? 'Creazione...' : 'Pubblica Annuncio'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Listing detail modal
function ListingDetailModal({ listing, isOpen, onClose, api, onUpdated, currentUserId }) {
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);

  useEffect(() => {
    if (isOpen && listing && listing.is_owner) {
      fetchInterests();
    }
  }, [isOpen, listing]);

  const fetchInterests = async () => {
    if (!listing) return;
    setLoadingInterests(true);
    try {
      const res = await api.get(`/marketplace/${listing.id}/interests`);
      setInterests(res.data);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoadingInterests(false);
    }
  };

  const handleSendInterest = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      await api.post(`/marketplace/${listing.id}/interest`, {
        message: interestMessage || null
      });
      toast.success('Interesse inviato al venditore!');
      setShowInterestForm(false);
      setInterestMessage('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nell\'invio');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSold = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      await api.post(`/marketplace/${listing.id}/sold`);
      toast.success('Annuncio segnato come venduto!');
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo annuncio?')) return;
    setLoading(true);
    try {
      await api.delete(`/marketplace/${listing.id}`);
      toast.success('Annuncio eliminato');
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !listing) return null;

  const Icon = categoryIcons[listing.category] || ShoppingBag;
  const color = categoryColors[listing.category] || '#888';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-plos-background border border-plos-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-plos-border">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">{listing.title}</h2>
              <p className="text-sm text-plos-text-muted">{categoryLabels[listing.category]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-plos-surface rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {/* Images */}
          {listing.images && listing.images.length > 0 && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={listing.images[0]} 
                alt={listing.title}
                className="w-full h-64 object-cover"
              />
            </div>
          )}
          
          {/* Price and status */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-2xl font-bold text-plos-primary">
              {listing.price_display}
            </p>
            <StatusBadge status={listing.status} />
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <h3 className="font-heading font-bold mb-2">Descrizione</h3>
            <p className="text-plos-text-muted whitespace-pre-wrap">{listing.description}</p>
          </div>
          
          {/* Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2 bg-plos-surface p-4 rounded-lg">
              <h3 className="font-heading font-bold text-sm mb-3">Informazioni</h3>
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-plos-text-muted" />
                <span>Venditore: {listing.seller_name}</span>
              </div>
              {listing.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-plos-text-muted" />
                  <span>{listing.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Eye size={14} className="text-plos-text-muted" />
                <span>{listing.views_count} visualizzazioni</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Heart size={14} className="text-plos-text-muted" />
                <span>{listing.interests_count} interessati</span>
              </div>
            </div>
            
            {/* Contact info (only if active and not owner) */}
            {listing.status === 'active' && !listing.is_owner && (
              <div className="space-y-2 bg-plos-surface p-4 rounded-lg">
                <h3 className="font-heading font-bold text-sm mb-3">Contatti</h3>
                {listing.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-plos-text-muted" />
                    <span>{listing.contact_phone}</span>
                  </div>
                )}
                {listing.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-plos-text-muted" />
                    <span>{listing.contact_email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Owner actions */}
          {listing.is_owner && listing.status === 'active' && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleMarkSold}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg"
              >
                <CheckCircle2 size={16} />
                Segna Venduto
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
              >
                <Trash2 size={16} />
                Elimina
              </button>
            </div>
          )}
          
          {/* Interest form for non-owners */}
          {!listing.is_owner && listing.status === 'active' && (
            <div className="border-t border-plos-border pt-4">
              {!showInterestForm ? (
                <button
                  onClick={() => setShowInterestForm(true)}
                  data-testid="show-interest-btn"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80"
                >
                  <Heart size={18} />
                  Sono interessato
                </button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={interestMessage}
                    onChange={e => setInterestMessage(e.target.value)}
                    placeholder="Scrivi un messaggio al venditore (opzionale)..."
                    className="w-full p-3 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none resize-none"
                    rows={3}
                    data-testid="interest-message-input"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowInterestForm(false)}
                      className="px-4 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSendInterest}
                      disabled={loading}
                      data-testid="send-interest-btn"
                      className="flex-1 px-4 py-2 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80 disabled:opacity-50"
                    >
                      {loading ? 'Invio...' : 'Invia interesse'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Interests list for owner */}
          {listing.is_owner && interests.length > 0 && (
            <div className="border-t border-plos-border pt-4 mt-4">
              <h3 className="font-heading font-bold mb-3">
                Interessati ({interests.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {interests.map(interest => (
                  <div key={interest.id} className="p-3 bg-plos-surface rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{interest.user_name}</span>
                      <span className="text-xs text-plos-text-muted">
                        {new Date(interest.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    {interest.message && (
                      <p className="text-sm text-plos-text-muted">{interest.message}</p>
                    )}
                    {interest.contact_phone && (
                      <p className="text-xs text-plos-primary mt-1">
                        Tel: {interest.contact_phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component
export default function MarketplacePage() {
  const { api, user } = useAuth();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [myListingsOnly, setMyListingsOnly] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (myListingsOnly) {
        params.append('my_listings', 'true');
        if (filterStatus) params.append('status', filterStatus);
      }
      if (search) params.append('search', search);
      params.append('sort_by', sortBy);
      
      const [listingsRes, categoriesRes, statsRes] = await Promise.all([
        api.get(`/marketplace?${params.toString()}`),
        api.get('/marketplace/categories'),
        api.get('/marketplace/stats/summary').catch(() => ({ data: null }))
      ]);
      
      setListings(listingsRes.data.listings || []);
      setCategories(categoriesRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  }, [api, filterCategory, filterStatus, search, sortBy, myListingsOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleListingCreated = (newListing) => {
    setListings([newListing, ...listings]);
    fetchData(); // Refresh stats
  };

  return (
    <div className="min-h-screen bg-plos-background text-plos-text p-6">
      <OsPageHeader
        title="Marketplace"
        subtitle="Annunci della community"
        icon={ShoppingBag}
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Marketplace' }
        ]}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <OsStatCard
            title="Annunci Attivi"
            value={stats.total_active || 0}
            icon={ShoppingBag}
            color="blue"
          />
          <OsStatCard
            title="I Miei Annunci"
            value={stats.my_listings || 0}
            icon={Tag}
            color="green"
          />
          <OsStatCard
            title="In Attesa"
            value={stats.pending_moderation || 0}
            icon={Clock}
            color="yellow"
          />
          <OsStatCard
            title="Messaggi Non Letti"
            value={stats.unread_interests || 0}
            icon={MessageSquare}
            color="purple"
          />
        </div>
      )}

      {/* Category quick filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !filterCategory 
              ? 'bg-plos-primary text-black' 
              : 'bg-plos-surface hover:bg-plos-hover'
          }`}
        >
          Tutti
        </button>
        {categories.map(cat => {
          const Icon = categoryIcons[cat.code] || ShoppingBag;
          return (
            <button
              key={cat.code}
              onClick={() => setFilterCategory(cat.code)}
              data-testid={`filter-${cat.code}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterCategory === cat.code 
                  ? 'bg-plos-primary text-black' 
                  : 'bg-plos-surface hover:bg-plos-hover'
              }`}
            >
              <Icon size={16} />
              {cat.name_short}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <OsPanel className="mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-plos-text-muted" />
              <input
                type="text"
                placeholder="Cerca annunci..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="search-input"
                className="pl-10 pr-4 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 bg-plos-surface border border-plos-border rounded-lg focus:border-plos-primary focus:outline-none"
            >
              <option value="newest">Più recenti</option>
              <option value="oldest">Meno recenti</option>
              <option value="price_asc">Prezzo crescente</option>
              <option value="price_desc">Prezzo decrescente</option>
              <option value="popular">Più visti</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={myListingsOnly}
                onChange={e => setMyListingsOnly(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Solo i miei</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-plos-surface hover:bg-plos-hover rounded-lg"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              data-testid="create-listing-btn"
              className="flex items-center gap-2 px-4 py-2 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80"
            >
              <Plus size={18} />
              Nuovo Annuncio
            </button>
          </div>
        </div>
      </OsPanel>

      {/* Listings grid */}
      {loading ? (
        <div className="text-center py-12 text-plos-text-muted">Caricamento...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag size={48} className="mx-auto mb-4 text-plos-text-muted opacity-30" />
          <p className="text-plos-text-muted">
            {myListingsOnly ? 'Non hai ancora pubblicato annunci' : 'Nessun annuncio trovato'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-plos-primary text-black font-bold rounded-lg hover:bg-plos-primary/80"
          >
            Pubblica il primo annuncio
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => setSelectedListing(listing)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateListingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        api={api}
        categories={categories}
        onCreated={handleListingCreated}
      />
      
      <ListingDetailModal
        listing={selectedListing}
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        api={api}
        onUpdated={fetchData}
        currentUserId={user?.id}
      />
    </div>
  );
}
