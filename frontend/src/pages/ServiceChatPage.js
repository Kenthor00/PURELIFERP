/**
 * PURE LIFE OS 3.0 - Service Chat
 * WOW PASS - Premium UI Design
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  OsPanel,
  OsSectionHeader,
  OsEmptyState,
} from '../components/os/OsComponents';
import axios from 'axios';
import {
  MessageSquare, Send, Users, Pin, Trash2, Settings,
  ArrowLeft, RefreshCw, Circle, Hash, Shield, Radio,
  Newspaper, MapPin, FileText, Activity, AtSign
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
  
  // Autocomplete menzioni
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  
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
      const res = await axios.get(`${API_URL}/api/chat/channels`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setChannels(res.data);
      
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
  }, [searchParams, token, activeChannel]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const res = await axios.get(
        `${API_URL}/api/chat/channels/${activeChannel.name}/messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
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
      const headers = { Authorization: `Bearer ${token}` };
      const [presenceRes, myPresenceRes] = await Promise.all([
        axios.get(
          activeChannel ? `${API_URL}/api/chat/presence?channel_name=${activeChannel.name}` : `${API_URL}/api/chat/presence`,
          { headers }
        ),
        axios.get(`${API_URL}/api/chat/presence/me`, { headers })
      ]);
      setPresence(presenceRes.data);
      setMyPresence(myPresenceRes.data);
    } catch (error) {
      console.error('Errore fetch presence:', error);
    }
  }, [activeChannel, token]);

  // Fetch users for mention autocomplete
  const fetchMentionUsers = useCallback(async (query) => {
    if (!activeChannel) return;
    try {
      const res = await axios.get(
        `${API_URL}/api/chat/channels/${activeChannel.name}/users?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMentionUsers(res.data);
      setMentionIndex(0);
    } catch (error) {
      console.error('Errore fetch mention users:', error);
      setMentionUsers([]);
    }
  }, [activeChannel, token]);

  // Update my presence
  const updateMyPresence = async (status) => {
    try {
      const res = await axios.put(
        `${API_URL}/api/chat/presence`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      setShowMentionPopup(false);
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
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages();
    } catch (error) {
      console.error('Errore pin:', error);
    }
  };

  // Handle mention selection
  const selectMention = (mentionUser) => {
    const input = inputRef.current;
    if (!input) return;
    
    // Find the @ position before cursor
    const textBeforeCursor = newMessage.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const before = newMessage.substring(0, lastAtIndex);
      const after = newMessage.substring(cursorPosition);
      const newText = `${before}@${mentionUser.game_name} ${after}`;
      setNewMessage(newText);
      
      // Set cursor after the mention
      setTimeout(() => {
        const newPos = lastAtIndex + mentionUser.game_name.length + 2;
        input.setSelectionRange(newPos, newPos);
        input.focus();
      }, 0);
    }
    
    setShowMentionPopup(false);
    setMentionQuery('');
  };

  // Handle input change with mention detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewMessage(value);
    setCursorPosition(cursorPos);
    
    // Check for @ mention trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space before @ (or it's at the start)
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
      
      if ((charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) && 
          !textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionQuery(textAfterAt);
        setShowMentionPopup(true);
        fetchMentionUsers(textAfterAt);
        return;
      }
    }
    
    setShowMentionPopup(false);
  };

  // Handle key navigation in mention popup
  const handleKeyDown = (e) => {
    if (showMentionPopup && mentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionUsers.length) % mentionUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(mentionUsers[mentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionPopup(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  // Quick Actions component
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

  // Render message content with highlighted mentions
  const renderMessageContent = (content, mentions) => {
    if (!mentions || mentions.length === 0) {
      return <span>{content}</span>;
    }
    
    // Highlight @mentions
    const parts = content.split(/(@[A-Za-zÀ-ÿ0-9_\s]+?)(?=\s|$)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('@')) {
            const isMentionMe = part.toLowerCase().includes(user?.game_name?.toLowerCase() || '');
            return (
              <span 
                key={index} 
                className={`font-medium ${isMentionMe ? 'bg-plos-primary/30 text-plos-primary px-1 rounded' : 'text-blue-400'}`}
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Message component
  const MessageItem = ({ msg }) => {
    const isOwn = msg.author_id === user?.id;
    const isMentioned = msg.mentions && msg.mentions.includes(user?.id);
    const canDelete = isOwn || (user?.hierarchy_level >= 7) || user?.sector === 'ADMIN' || user?.is_sector_chief;
    const canPin = (user?.hierarchy_level >= 3) || user?.sector === 'ADMIN';
    
    return (
      <div 
        className={`group flex gap-3 px-4 py-2 hover:bg-plos-surface/50 transition-colors
          ${msg.is_pinned ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : ''} 
          ${isMentioned ? 'bg-plos-primary/10 border-l-2 border-plos-primary' : ''}`}
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
            {isMentioned && <AtSign size={12} className="text-plos-primary" />}
          </div>
          
          <p className="text-sm text-plos-text-secondary mt-1 whitespace-pre-wrap break-words">
            {renderMessageContent(msg.content, msg.mentions)}
          </p>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity">
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
    <div className="h-screen flex" data-testid="service-chat-page">
      {/* Sidebar */}
      <div className="w-72 border-r border-plos-border/50 bg-gradient-to-b from-plos-surface/90 to-plos-bg/90 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-plos-border/30">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-plos-surface/50 rounded-lg transition-colors text-plos-text-secondary hover:text-white">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-plos-primary/10 border border-plos-primary/30 rounded-lg">
                <MessageSquare className="text-plos-primary" size={18} />
              </div>
              <div>
                <h1 className="font-heading text-sm tracking-wider text-white">SERVICE CHAT</h1>
                <p className="text-[10px] text-plos-text-muted">COMUNICAZIONI INTERNE</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* My Status */}
        <div className="p-4 border-b border-plos-border/30">
          <div className="text-[10px] text-plos-text-muted tracking-wider mb-2 flex items-center gap-1">
            <div className="w-1 h-3 bg-plos-primary rounded-full"></div>
            IL MIO STATO
          </div>
          <select
            value={myPresence?.status || 'online'}
            onChange={(e) => updateMyPresence(e.target.value)}
            className="w-full px-3 py-2 bg-plos-surface/50 border border-plos-border/50 rounded-lg text-sm text-white focus:border-plos-primary focus:outline-none transition-all"
          >
            <option value="online">🟢 Online</option>
            <option value="in_service">🔵 In Servizio</option>
            <option value="off_duty">🟡 Fuori Servizio</option>
          </select>
        </div>
        
        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="text-[10px] text-plos-text-muted tracking-wider mb-3 flex items-center gap-1">
              <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
              CANALI
            </div>
            <div className="space-y-1">
              {channels.map(channel => {
                const Icon = CHANNEL_ICONS[channel.name] || Hash;
                const isActive = activeChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                      isActive
                        ? 'bg-plos-primary/20 border border-plos-primary/30 text-white' 
                        : 'text-plos-text-secondary hover:bg-plos-surface/50 hover:text-white border border-transparent'
                    }`}
                    data-testid={`channel-${channel.name}`}
                  >
                    <Icon size={16} className={isActive ? 'text-plos-primary' : ''} />
                    <span className="truncate font-medium">{channel.display_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Presence Toggle */}
        <div className="border-t border-plos-border/30">
          <button
            onClick={() => setShowPresence(!showPresence)}
            className="w-full p-4 flex items-center justify-between text-sm hover:bg-plos-surface/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users size={16} className="text-plos-primary" />
              <span className="text-plos-text-secondary">Utenti Online</span>
            </span>
            <span className="px-2 py-0.5 bg-plos-primary/20 text-plos-primary text-xs rounded-full font-medium">
              {presence.length}
            </span>
          </button>
          
          {showPresence && (
            <div className="max-h-48 overflow-y-auto border-t border-plos-border/30 bg-plos-bg/50">
              {presence.map(p => (
                <div key={p.user_id} className="px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-plos-surface/30">
                  <Circle size={8} className={`${STATUS_COLORS[p.status]} fill-current`} />
                  <span className="truncate text-white">{p.game_name}</span>
                  <span className="text-[10px] text-plos-text-muted ml-auto tracking-wider">{p.sector}</span>
                </div>
              ))}
              {presence.length === 0 && (
                <div className="px-4 py-4 text-sm text-plos-text-muted text-center">
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
      <div className="flex-1 flex flex-col bg-plos-bg/50">
        {/* Channel Header */}
        {activeChannel && (
          <div className="p-4 border-b border-plos-border/30 bg-gradient-to-r from-plos-surface/50 to-transparent backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-plos-primary/10 border border-plos-primary/30 rounded-lg">
                {React.createElement(CHANNEL_ICONS[activeChannel.name] || Hash, { size: 18, className: 'text-plos-primary' })}
              </div>
              <div>
                <h2 className="font-heading tracking-wider text-white flex items-center gap-2">
                  {activeChannel.display_name}
                </h2>
                {activeChannel.description && (
                  <p className="text-xs text-plos-text-muted mt-0.5">{activeChannel.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-plos-text-muted flex items-center gap-1.5 tracking-wider">
                <AtSign size={12} className="text-plos-primary" /> USA @NOME PER MENZIONARE
              </span>
              <button 
                onClick={() => { fetchMessages(); fetchPresence(); }} 
                className="p-2 bg-plos-surface/50 border border-plos-border/50 hover:border-plos-primary/50 rounded-lg transition-all"
              >
                <RefreshCw size={16} className="text-plos-text-secondary" />
              </button>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-plos-text-muted animate-pulse">Caricamento...</div>
            </div>
          ) : !activeChannel ? (
            <OsEmptyState
              icon={MessageSquare}
              title="Seleziona un canale"
              description="Scegli un canale dalla sidebar per iniziare a chattare"
            />
          ) : messages.length === 0 ? (
            <OsEmptyState
              icon={MessageSquare}
              title="Nessun messaggio"
              description="Sii il primo a scrivere in questo canale!"
            />
          ) : (
            <div className="py-4">
              {messages.map(msg => (
                <MessageItem key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input with Mention Autocomplete */}
        {activeChannel && (
          <div className="relative p-4 border-t border-plos-border/30 bg-gradient-to-r from-plos-surface/50 to-transparent backdrop-blur-sm">
            {/* Mention Autocomplete Popup */}
            {showMentionPopup && mentionUsers.length > 0 && (
              <div 
                className="absolute bottom-full left-4 right-4 mb-2 bg-plos-surface border border-plos-border/50 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                data-testid="mention-autocomplete"
              >
                <div className="p-2 text-[10px] text-plos-text-muted border-b border-plos-border/30 tracking-wider flex items-center gap-1">
                  <AtSign size={10} /> MENZIONA UTENTE
                </div>
                {mentionUsers.map((u, index) => (
                  <button
                    key={u.id}
                    onClick={() => selectMention(u)}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-sm text-left hover:bg-plos-primary/10 transition-colors ${
                      index === mentionIndex ? 'bg-plos-primary/20' : ''
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-plos-primary/20 border border-plos-primary/30 flex items-center justify-center text-xs font-bold text-plos-primary">
                      {u.game_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-white">{u.game_name}</span>
                      <span className="text-[10px] text-plos-text-muted ml-2 tracking-wider">{u.sector}</span>
                    </div>
                    {u.grade && <span className="text-[10px] text-plos-text-muted">{u.grade}</span>}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Scrivi in #${activeChannel.display_name}... (usa @ per menzionare)`}
                className="flex-1 px-4 py-3 bg-plos-surface/50 border border-plos-border/50 rounded-lg text-white placeholder-plos-text-muted focus:border-plos-primary focus:outline-none transition-all"
                disabled={sending}
                data-testid="chat-input"
              />
              <button 
                onClick={sendMessage} 
                disabled={sending || !newMessage.trim()}
                className="px-5 bg-plos-primary/20 border border-plos-primary/50 hover:bg-plos-primary/30 text-plos-primary rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
