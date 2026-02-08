"""
PURE LIFE OS 3.0 - WebSocket Real-Time Engine
Gestisce: Chat, Notifiche, Presenza, Alert Sistema
"""

import asyncio
import json
import time
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class WSEventType(str, Enum):
    # Connection
    CONNECTED = "connected"
    HEARTBEAT = "heartbeat"
    PONG = "pong"
    
    # Chat
    CHAT_MESSAGE = "chat_message"
    CHAT_TYPING = "chat_typing"
    CHAT_READ = "chat_read"
    
    # Presence
    PRESENCE_UPDATE = "presence_update"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    
    # Notifications
    NOTIFICATION = "notification"
    NOTIFICATION_READ = "notification_read"
    
    # System
    SYSTEM_ALERT = "system_alert"
    BROADCAST = "broadcast"
    
    # Stats Update
    STATS_UPDATE = "stats_update"


class ConnectionManager:
    """Gestisce tutte le connessioni WebSocket"""
    
    def __init__(self):
        # user_id -> set of WebSocket connections (supporta multi-device)
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> user_id (reverse lookup)
        self.connection_users: Dict[WebSocket, int] = {}
        # channel_name -> set of user_ids (subscription)
        self.channel_subscribers: Dict[str, Set[int]] = {}
        # user_id -> last heartbeat timestamp
        self.heartbeats: Dict[int, float] = {}
        # Lock per thread safety
        self._lock = asyncio.Lock()
        # Stats
        self._total_messages = 0
        self._total_connections = 0
    
    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """Registra nuova connessione WebSocket"""
        await websocket.accept()
        
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            
            self.active_connections[user_id].add(websocket)
            self.connection_users[websocket] = user_id
            self.heartbeats[user_id] = time.time()
            self._total_connections += 1
        
        # Notifica connessione
        await self.send_personal(user_id, {
            "type": WSEventType.CONNECTED,
            "data": {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "server_time": time.time()
            }
        })
        
        # Broadcast presenza
        await self.broadcast_presence(user_id, "online")
        
        logger.info(f"WS Connected: user_id={user_id}, total={len(self.connection_users)}")
    
    async def disconnect(self, websocket: WebSocket) -> Optional[int]:
        """Disconnette WebSocket"""
        async with self._lock:
            user_id = self.connection_users.pop(websocket, None)
            
            if user_id and user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                
                # Se non ha più connessioni, rimuovi
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    self.heartbeats.pop(user_id, None)
                    
                    # Broadcast offline solo se disconnesso da tutti i device
                    asyncio.create_task(self.broadcast_presence(user_id, "offline"))
            
            return user_id
    
    async def send_personal(self, user_id: int, message: dict) -> bool:
        """Invia messaggio a un utente specifico (tutti i suoi device)"""
        connections = self.active_connections.get(user_id, set())
        
        if not connections:
            return False
        
        message_json = json.dumps(message, default=str)
        disconnected = []
        
        for websocket in connections:
            try:
                await websocket.send_text(message_json)
                self._total_messages += 1
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                disconnected.append(websocket)
        
        # Cleanup connessioni fallite
        for ws in disconnected:
            await self.disconnect(ws)
        
        return len(disconnected) < len(connections)
    
    async def broadcast_to_channel(self, channel: str, message: dict, exclude_user: int = None) -> int:
        """Invia messaggio a tutti gli iscritti a un canale"""
        subscribers = self.channel_subscribers.get(channel, set())
        sent_count = 0
        
        for user_id in subscribers:
            if user_id != exclude_user:
                if await self.send_personal(user_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def broadcast_all(self, message: dict, exclude_user: int = None) -> int:
        """Broadcast a tutti gli utenti connessi"""
        sent_count = 0
        
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                if await self.send_personal(user_id, message):
                    sent_count += 1
        
        return sent_count
    
    async def subscribe_channel(self, user_id: int, channel: str) -> None:
        """Iscrive utente a un canale"""
        async with self._lock:
            if channel not in self.channel_subscribers:
                self.channel_subscribers[channel] = set()
            self.channel_subscribers[channel].add(user_id)
    
    async def unsubscribe_channel(self, user_id: int, channel: str) -> None:
        """Rimuove iscrizione da canale"""
        async with self._lock:
            if channel in self.channel_subscribers:
                self.channel_subscribers[channel].discard(user_id)
    
    async def update_heartbeat(self, user_id: int) -> None:
        """Aggiorna timestamp heartbeat"""
        self.heartbeats[user_id] = time.time()
    
    async def broadcast_presence(self, user_id: int, status: str) -> None:
        """Broadcast cambio presenza"""
        await self.broadcast_all({
            "type": WSEventType.PRESENCE_UPDATE,
            "data": {
                "user_id": user_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }, exclude_user=user_id)
    
    def get_online_users(self) -> list[int]:
        """Lista utenti online"""
        return list(self.active_connections.keys())
    
    def is_online(self, user_id: int) -> bool:
        """Check se utente è online"""
        return user_id in self.active_connections
    
    def stats(self) -> dict:
        """Statistiche WebSocket"""
        return {
            "connected_users": len(self.active_connections),
            "total_connections": sum(len(conns) for conns in self.active_connections.values()),
            "channels": len(self.channel_subscribers),
            "total_messages_sent": self._total_messages,
            "total_connections_ever": self._total_connections
        }


# Istanza globale
ws_manager = ConnectionManager()


# Helper functions per invio messaggi tipizzati
async def send_chat_message(channel: str, sender_id: int, message: dict) -> int:
    """Invia messaggio chat a un canale"""
    return await ws_manager.broadcast_to_channel(channel, {
        "type": WSEventType.CHAT_MESSAGE,
        "data": {
            "channel": channel,
            "sender_id": sender_id,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })


async def send_notification(user_id: int, notification: dict) -> bool:
    """Invia notifica a utente"""
    return await ws_manager.send_personal(user_id, {
        "type": WSEventType.NOTIFICATION,
        "data": notification
    })


async def send_system_alert(message: str, level: str = "info", target_users: list[int] = None) -> int:
    """Invia alert sistema"""
    alert_data = {
        "type": WSEventType.SYSTEM_ALERT,
        "data": {
            "message": message,
            "level": level,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    if target_users:
        count = 0
        for user_id in target_users:
            if await ws_manager.send_personal(user_id, alert_data):
                count += 1
        return count
    else:
        return await ws_manager.broadcast_all(alert_data)


async def send_broadcast(title: str, message: str, sender_id: int, priority: str = "normal") -> int:
    """Invia broadcast governativo"""
    return await ws_manager.broadcast_all({
        "type": WSEventType.BROADCAST,
        "data": {
            "title": title,
            "message": message,
            "sender_id": sender_id,
            "priority": priority,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })


async def send_stats_update(module: str, stats: dict) -> int:
    """Invia aggiornamento statistiche live"""
    return await ws_manager.broadcast_all({
        "type": WSEventType.STATS_UPDATE,
        "data": {
            "module": module,
            "stats": stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })


# Background task per cleanup connessioni stale
async def heartbeat_checker():
    """Verifica heartbeat e disconnette connessioni stale"""
    while True:
        try:
            await asyncio.sleep(30)  # Check ogni 30s
            
            current_time = time.time()
            stale_threshold = 60  # 60s senza heartbeat
            
            stale_users = [
                user_id for user_id, last_beat in ws_manager.heartbeats.items()
                if current_time - last_beat > stale_threshold
            ]
            
            for user_id in stale_users:
                connections = ws_manager.active_connections.get(user_id, set())
                for ws in list(connections):
                    try:
                        await ws.close()
                    except:
                        pass
                    await ws_manager.disconnect(ws)
                
                logger.info(f"Disconnected stale user: {user_id}")
        
        except Exception as e:
            logger.error(f"Heartbeat checker error: {e}")
