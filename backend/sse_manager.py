"""
PURE LIFE OS - SSE Manager
Server-Sent Events per realtime updates
"""
import asyncio
import json
from typing import Dict, Set, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class SSEClient:
    user_id: int
    role: str
    queue: asyncio.Queue = field(default_factory=asyncio.Queue)


class SSEManager:
    def __init__(self):
        self.clients: Dict[str, SSEClient] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, client_id: str, user_id: int, role: str) -> SSEClient:
        """Connette un nuovo client SSE"""
        async with self._lock:
            client = SSEClient(user_id=user_id, role=role)
            self.clients[client_id] = client
            logger.info(f"SSE Client connesso: {client_id} (user: {user_id}, role: {role})")
            return client
    
    async def disconnect(self, client_id: str):
        """Disconnette un client SSE"""
        async with self._lock:
            if client_id in self.clients:
                del self.clients[client_id]
                logger.info(f"SSE Client disconnesso: {client_id}")
    
    async def broadcast(self, event_type: str, data: dict, roles: Optional[Set[str]] = None):
        """Invia evento a tutti i client (o filtrato per ruoli)"""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        async with self._lock:
            for client_id, client in self.clients.items():
                if roles is None or client.role in roles:
                    try:
                        await client.queue.put(message)
                    except Exception as e:
                        logger.error(f"Errore invio SSE a {client_id}: {e}")
    
    async def send_to_user(self, user_id: int, event_type: str, data: dict):
        """Invia evento a un utente specifico"""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        async with self._lock:
            for client_id, client in self.clients.items():
                if client.user_id == user_id:
                    try:
                        await client.queue.put(message)
                    except Exception as e:
                        logger.error(f"Errore invio SSE a user {user_id}: {e}")
    
    def format_sse(self, data: dict) -> str:
        """Formatta messaggio per SSE"""
        return f"data: {json.dumps(data)}\n\n"
    
    async def event_generator(self, client: SSEClient):
        """Generatore eventi per streaming SSE"""
        try:
            while True:
                message = await asyncio.wait_for(client.queue.get(), timeout=30.0)
                yield self.format_sse(message)
        except asyncio.TimeoutError:
            yield self.format_sse({"type": "ping", "timestamp": datetime.now(timezone.utc).isoformat()})
        except asyncio.CancelledError:
            pass


sse_manager = SSEManager()
