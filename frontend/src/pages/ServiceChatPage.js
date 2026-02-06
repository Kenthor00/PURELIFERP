import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  MessageSquare, Send, Users, Pin, Trash2, Settings,
  ArrowLeft, RefreshCw, Circle, Hash, Shield, Radio,
  Newspaper, MapPin, FileText, Activity, ChevronDown,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mapping icone canali
const CHANNEL_ICONS = {
  lspd: Shield,
  ems: Activity,
  gov: FileText,
  dispatch: Radio,
  weazel: Newspaper,
  staff: Settings
};

// Status colors
const STATUS_COLORS = {
  online: 'bg-green-500',
  in_service: 'bg-blue-500',
  off_duty: 'bg-yellow-500',
  offline: 'bg-gray-500'
};

const STATUS_LABELS = {
  online: 'Online',
  in_service: 'In Servizio',
  off_duty: 'Fuori Servizio',
  offline: 'Offline'
};

export const ServiceChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState([]);
  const [myPresence, setMyPresence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showPresence, setShowPresence] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  
  const authHeaders = { Authorization: `Bearer ${token}` };
  
  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chat/channels`, { headers: authHeaders });
      setChannels(res.data);
      
      // Auto-select channel from URL or first one
      const paramChannel = searchParams.get('channel')?.toLowerCase();
      if (paramChannel) {
        const found = res.data.find(c => c.name === paramChannel);
        if (found) setActiveChannel(found);
        else if (res.data.length > 0) setActiveChannel(res.data[0]);
      } else if (res.data.length > 0 && !activeChannel) {
        setActiveChannel(res.data[0]);
      }
    } catch (error) {
      console.error('Errore fetch channels:', error);
    }
  }, [searchParams, token]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const res = await axios.get(
        `${API_URL}/api/chat/channels/${activeChannel.name}/messages?limit=50`,
        { headers: authHeaders }
      );
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Errore fetch messages:', error);
    }
  }, [activeChannel, token]);

  // Fetch presence
  const fetchPresence = useCallback(async () => {
    try {
      const [presenceRes, myPresenceRes] = await Promise.all([
        axios.get(
          activeChannel ? `${API_URL}/api/chat/presence?channel_name=${activeChannel.name}` : `${API_URL}/api/chat/presence`,
          { headers: authHeaders }
        ),
        axios.get(`${API_URL}/api/chat/presence/me`, { headers: authHeaders })
      ]);
      setPresence(presenceRes.data);
      setMyPresence(myPresenceRes.data);
    } catch (error) {
      console.error('Errore fetch presence:', error);
    }
  }, [activeChannel, token]);

  // Update my presence
  const updateMyPresence = async (status) => {
    try {
      const res = await axios.put(
        `${API_URL}/api/chat/presence`,
        { status },
        { headers: authHeaders }
      );
      setMyPresence(res.data);
    } catch (error) {
      console.error('Errore update presence:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || sending) return;
    
    try {
      setSending(true);
      await axios.post(
        `${API_URL}/api/chat/channels/${activeChannel.name}/messages`,
        { content: newMessage.trim(), message_type: 'text' },
        { headers: authHeaders }
      );
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Errore invio messaggio:', error);
      alert(error.response?.data?.detail || 'Errore invio messaggio');
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!window.confirm('Eliminare questo messaggio?')) return;
    try {
      await axios.delete(
        `${API_URL}/api/chat/channels/${activeChannel.name}/messages/${messageId}`,
        { headers: authHeaders }
      );
      fetchMessages();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert(error.response?.data?.detail || 'Errore eliminazione');
    }
  };

  // Pin/Unpin message
  const togglePin = async (messageId) => {
    try {
      await axios.post(
        `${API_URL}/api/chat/channels/${activeChannel.name}/messages/${messageId}/pin`,
        {},
        { headers: authHeaders }
      );
      fetchMessages();
    } catch (error) {
      console.error('Errore pin:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchChannels();
    fetchPresence();
    setLoading(false);
  }, [fetchChannels, fetchPresence]);

  // Load messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages();
      fetchPresence();
    }
  }, [activeChannel, fetchMessages, fetchPresence]);

  // Polling
  useEffect(() => {
    if (activeChannel) {
      pollRef.current = setInterval(() => {
        fetchMessages();
        fetchPresence();
      }, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeChannel, fetchMessages, fetchPresence]);

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick Actions
  const QuickActions = () => (
    <div className="p-3 border-t border-plos-border bg-plos-surface/50">
      <div className="text-xs text-plos-text-muted mb-2">AZIONI RAPIDE</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/dispatch')} className="btn-tactical-sm text-xs flex items-center gap-1">
          <Radio size={12} /> Dispatch
        </button>
        <button onClick={() => navigate('/city')} className="btn-tactical-sm text-xs flex items-center gap-1">
          <MapPin size={12} /> City Hub
        </button>
        <button onClick={() => navigate('/city/news')} className="btn-tactical-sm text-xs flex items-center gap-1">
          <Newspaper size={12} /> News
        </button>
        {(user?.sector === 'ADMIN' || user?.is_sector_chief) && (
          <button onClick={() => navigate('/admin/audit')} className="btn-tactical-sm text-xs flex items-center gap-1">
            <FileText size={12} /> Audit
          </button>
        )}
      </div>
    </div>
  );

  // Message component
  const MessageItem = ({ msg }) => {
    const isOwn = msg.author_id === user?.id;
    const canDelete = isOwn || (user?.hierarchy_level >= 7) || user?.sector === 'ADMIN' || user?.is_sector_chief;
    const canPin = (user?.hierarchy_level >= 3) || user?.sector === 'ADMIN';
    
    return (
      <div 
        className={`group flex gap-3 px-4 py-2 hover:bg-plos-surface/50 ${msg.is_pinned ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''}`}
        data-testid={`message-${msg.id}`}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-plos-surface flex items-center justify-center text-xs font-bold text-plos-primary">
          {msg.author_game_name?.charAt(0) || '?'}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{msg.author_game_name}</span>
            <span className="text-xs text-plos-primary">{msg.author_sector}</span>
            {msg.author_grade && (
              <span className="text-xs text-plos-text-muted">· {msg.author_grade}</span>
            )}
            <span className="text-xs text-plos-text-muted">
              {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {msg.is_pinned && <Pin size={12} className="text-yellow-500" />}
          </div>
          
          <p className="text-sm text-plos-text-secondary mt-1 whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1">
          {canPin && (
            <button onClick={() => togglePin(msg.id)} className="p-1 text-plos-text-muted hover:text-yellow-500">
              <Pin size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => deleteMessage(msg.id)} className="p-1 text-plos-text-muted hover:text-red-500">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="h-screen flex tactical-bg" data-testid="service-chat-page">
      {/* Sidebar */}
      <div className="w-64 border-r border-plos-border bg-plos-surface flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-plos-border">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-plos-text-secondary hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-heading text-sm tracking-wider flex items-center gap-2">
                <MessageSquare className="text-plos-primary" size={16} />
                SERVICE CHAT
              </h1>
            </div>
          </div>
        </div>
        
        {/* My Status */}
        <div className="p-3 border-b border-plos-border">
          <div className="text-xs text-plos-text-muted mb-2">IL MIO STATO</div>
          <select
            value={myPresence?.status || 'online'}
            onChange={(e) => updateMyPresence(e.target.value)}
            className="input-tactical w-full text-sm"
          >
            <option value="online">🟢 Online</option>
            <option value="in_service">🔵 In Servizio</option>
            <option value="off_duty">🟡 Fuori Servizio</option>
          </select>
        </div>
        
        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs text-plos-text-muted mb-2">CANALI</div>
            {channels.map(channel => {
              const Icon = CHANNEL_ICONS[channel.name] || Hash;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                    activeChannel?.id === channel.id 
                      ? 'bg-plos-primary/20 text-white' 
                      : 'text-plos-text-secondary hover:bg-plos-surface hover:text-white'
                  }`}
                  data-testid={`channel-${channel.name}`}
                >
                  <Icon size={16} />
                  <span className="truncate">{channel.display_name}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Presence Toggle */}
        <div className="border-t border-plos-border">
          <button
            onClick={() => setShowPresence(!showPresence)}
            className="w-full p-3 flex items-center justify-between text-sm hover:bg-plos-surface"
          >
            <span className="flex items-center gap-2">
              <Users size={16} className="text-plos-primary" />
              Utenti Online
            </span>
            <span className="text-plos-text-muted">{presence.length}</span>
          </button>
          
          {showPresence && (
            <div className="max-h-48 overflow-y-auto border-t border-plos-border">
              {presence.map(p => (
                <div key={p.user_id} className="px-4 py-2 flex items-center gap-2 text-sm">
                  <Circle size={8} className={`${STATUS_COLORS[p.status]} fill-current`} />
                  <span className="truncate">{p.game_name}</span>
                  <span className="text-xs text-plos-text-muted ml-auto">{p.sector}</span>
                </div>
              ))}
              {presence.length === 0 && (
                <div className="px-4 py-3 text-sm text-plos-text-muted text-center">
                  Nessun utente online
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <QuickActions />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        {activeChannel && (
          <div className="p-4 border-b border-plos-border bg-plos-surface flex items-center justify-between">
            <div>
              <h2 className="font-heading tracking-wider flex items-center gap-2">
                {React.createElement(CHANNEL_ICONS[activeChannel.name] || Hash, { size: 18, className: 'text-plos-primary' })}
                {activeChannel.display_name}
              </h2>
              {activeChannel.description && (
                <p className="text-xs text-plos-text-muted mt-1">{activeChannel.description}</p>
              )}
            </div>
            <button onClick={() => { fetchMessages(); fetchPresence(); }} className="btn-tactical-secondary p-2">
              <RefreshCw size={16} />
            </button>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-plos-text-muted">
              Caricamento...
            </div>
          ) : !activeChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-plos-text-muted">
              <MessageSquare size={48} className="mb-4" />
              <p>Seleziona un canale per iniziare</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-plos-text-muted">
              <MessageSquare size={48} className="mb-4" />
              <p>Nessun messaggio in questo canale</p>
              <p className="text-sm mt-2">Sii il primo a scrivere!</p>
            </div>
          ) : (
            <div className="py-4">
              {messages.map(msg => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        {activeChannel && (
          <div className="p-4 border-t border-plos-border bg-plos-surface">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Scrivi in #${activeChannel.display_name}...`}
                className="input-tactical flex-1"
                disabled={sending}
                data-testid="chat-input"
              />
              <button 
                onClick={sendMessage} 
                disabled={sending || !newMessage.trim()}
                className="btn-tactical px-4"
                data-testid="send-message-btn"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceChatPage;
