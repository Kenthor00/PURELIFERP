import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';
import { useSSE } from '../context/SSEContext';
import {
  MessageSquare,
  Send,
  MapPin,
  Phone,
  FileText,
  Users,
  Circle,
  Pin,
  ChevronDown,
} from 'lucide-react';

export const ChatPage = () => {
  const { api, user } = useAuth();
  const { play } = useSound();
  const { subscribe } = useSSE();
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnlinePanel, setShowOnlinePanel] = useState(true);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChannels();
    fetchOnlineUsers();
    
    // Subscribe to chat messages
    const unsubscribe = subscribe('*', (event) => {
      if (event.type?.startsWith('chat_message_')) {
        play('notification');
        if (activeChannel && event.type === `chat_message_${activeChannel.name}`) {
          setMessages(prev => [...prev, event.data]);
        }
      }
      if (event.type === 'presence_update') {
        fetchOnlineUsers();
      }
    });

    return () => unsubscribe();
  }, [activeChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannels = async () => {
    try {
      const res = await api.get('/chat/channels');
      setChannels(res.data);
      if (res.data.length > 0 && !activeChannel) {
        setActiveChannel(res.data[0]);
        fetchMessages(res.data[0].id);
      }
    } catch (error) {
      console.error('Errore fetch canali:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const res = await api.get(`/chat/channels/${channelId}/messages?limit=100`);
      setMessages(res.data);
    } catch (error) {
      console.error('Errore fetch messaggi:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await api.get('/chat/online');
      setOnlineUsers(res.data.online || []);
    } catch (error) {
      console.error('Errore fetch online:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    
    try {
      play('click');
      await api.post('/chat/messages', {
        channel_id: activeChannel.id,
        content: newMessage.trim(),
        message_type: 'text'
      });
      setNewMessage('');
    } catch (error) {
      play('error');
      console.error('Errore invio messaggio:', error);
    }
  };

  const handleQuickAction = async (actionType) => {
    play('click');
    // Quick actions placeholder
    alert(`Azione rapida: ${actionType}`);
  };

  const selectChannel = (channel) => {
    play('click');
    setActiveChannel(channel);
    fetchMessages(channel.id);
  };

  const getPresenceColor = (presence) => {
    switch (presence) {
      case 'online': return 'text-green-500';
      case 'in_service': return 'text-blue-500';
      case 'off_duty': return 'text-orange-500';
      default: return 'text-plos-text-muted';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'police': return 'text-blue-400';
      case 'ems': return 'text-red-400';
      case 'dispatch': return 'text-plos-primary';
      case 'admin': return 'text-purple-400';
      default: return 'text-plos-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-plos-primary animate-pulse">Caricamento chat...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col" data-testid="chat-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <MessageSquare className="text-plos-primary" />
          SERVICE <span className="text-plos-primary">CHAT</span>
        </h1>
        
        <button
          onClick={() => setShowOnlinePanel(!showOnlinePanel)}
          className="text-sm text-plos-text-secondary hover:text-plos-primary flex items-center gap-1 lg:hidden"
        >
          <Users size={16} />
          Online ({onlineUsers.length})
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Channels Sidebar */}
        <div className="w-48 flex-shrink-0 card-tactical p-2 overflow-y-auto hidden sm:block">
          <h3 className="font-heading text-xs text-plos-text-muted px-2 py-1">CANALI</h3>
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => selectChannel(channel)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                activeChannel?.id === channel.id
                  ? 'bg-plos-primary/20 text-plos-primary border-l-2 border-plos-primary'
                  : 'text-plos-text-secondary hover:text-plos-text hover:bg-plos-surface-highlight'
              }`}
            >
              # {channel.display_name}
            </button>
          ))}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 card-tactical flex flex-col overflow-hidden">
          {/* Channel Header */}
          <div className="p-3 border-b border-plos-border flex items-center justify-between">
            <div>
              <h2 className="font-heading tracking-wider">
                # {activeChannel?.display_name || 'Seleziona canale'}
              </h2>
              {activeChannel?.description && (
                <p className="text-xs text-plos-text-muted">{activeChannel.description}</p>
              )}
            </div>
            
            {/* Mobile channel selector */}
            <select
              value={activeChannel?.id || ''}
              onChange={(e) => {
                const ch = channels.find(c => c.id === parseInt(e.target.value));
                if (ch) selectChannel(ch);
              }}
              className="input-tactical text-sm sm:hidden"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}># {ch.display_name}</option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-plos-text-muted py-8">
                Nessun messaggio in questo canale
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 bg-plos-surface-highlight border border-plos-border flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">
                      {msg.sender_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  
                  <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.sender_name}</span>
                      <span className="text-xs text-plos-text-muted mono">
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.is_pinned && <Pin size={12} className="text-plos-primary" />}
                    </div>
                    
                    <div className={`p-2 ${
                      msg.sender_id === user?.id
                        ? 'bg-plos-primary/20 border border-plos-primary/30'
                        : 'bg-plos-surface-highlight border border-plos-border'
                    }`}>
                      {msg.message_type === 'location' ? (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-plos-primary" />
                          <span>{msg.content}</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-plos-border flex gap-2 overflow-x-auto">
            <button
              onClick={() => handleQuickAction('create_call')}
              className="px-2 py-1 text-xs border border-plos-border hover:border-plos-primary flex items-center gap-1 whitespace-nowrap"
            >
              <Phone size={12} />
              Crea Chiamata
            </button>
            <button
              onClick={() => handleQuickAction('open_case')}
              className="px-2 py-1 text-xs border border-plos-border hover:border-plos-primary flex items-center gap-1 whitespace-nowrap"
            >
              <FileText size={12} />
              Apri Caso
            </button>
            <button
              onClick={() => handleQuickAction('send_location')}
              className="px-2 py-1 text-xs border border-plos-border hover:border-plos-primary flex items-center gap-1 whitespace-nowrap"
            >
              <MapPin size={12} />
              Invia Posizione
            </button>
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-plos-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="input-tactical flex-1"
                data-testid="chat-input"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="btn-tactical px-4"
                data-testid="send-message-btn"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Online Users Panel */}
        {showOnlinePanel && (
          <div className="w-48 flex-shrink-0 card-tactical p-2 overflow-y-auto hidden lg:block">
            <h3 className="font-heading text-xs text-plos-text-muted px-2 py-1 flex items-center gap-1">
              <Users size={12} />
              ONLINE ({onlineUsers.length})
            </h3>
            <div className="space-y-1 mt-2">
              {onlineUsers.map((u) => (
                <div key={u.id} className="px-2 py-1 flex items-center gap-2">
                  <Circle size={8} className={`fill-current ${getPresenceColor(u.presence)}`} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{u.name}</p>
                    <p className={`text-xs ${getRoleColor(u.role)}`}>{u.role}</p>
                  </div>
                </div>
              ))}
              {onlineUsers.length === 0 && (
                <p className="text-xs text-plos-text-muted text-center py-2">
                  Nessuno online
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
