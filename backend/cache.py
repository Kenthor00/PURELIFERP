"""
PURE LIFE OS 3.0 - Sistema Cache In-Memory LRU con TTL
Performance Extreme Mode
"""

import asyncio
import time
from typing import Any, Optional, Callable, Dict
from functools import wraps
from collections import OrderedDict
import hashlib
import json

class LRUCache:
    """Cache LRU thread-safe con TTL"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0
    
    async def get(self, key: str) -> Optional[Any]:
        """Recupera valore dalla cache"""
        async with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            value, expires_at = self._cache[key]
            
            # Check TTL
            if time.time() > expires_at:
                del self._cache[key]
                self._misses += 1
                return None
            
            # Move to end (LRU)
            self._cache.move_to_end(key)
            self._hits += 1
            return value
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Salva valore in cache"""
        async with self._lock:
            ttl = ttl or self.default_ttl
            expires_at = time.time() + ttl
            
            # Remove oldest if at capacity
            while len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
            
            self._cache[key] = (value, expires_at)
    
    async def delete(self, key: str) -> bool:
        """Elimina chiave dalla cache"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalida tutte le chiavi che contengono il pattern"""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    async def clear(self) -> None:
        """Svuota la cache"""
        async with self._lock:
            self._cache.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Statistiche cache"""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%"
        }


# Istanza globale cache
cache = LRUCache(max_size=2000, default_ttl=60)  # 60s default TTL


def cache_key(*args, **kwargs) -> str:
    """Genera chiave cache da argomenti"""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()


def cached(prefix: str, ttl: int = 60):
    """
    Decorator per cachare risultati funzioni async
    
    @cached("lspd_stats", ttl=30)
    async def get_lspd_stats(db):
        ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Genera chiave (escludi db session)
            filtered_kwargs = {k: v for k, v in kwargs.items() if k != 'db'}
            key = f"{prefix}:{cache_key(*args[1:], **filtered_kwargs)}"  # Skip first arg (usually self/db)
            
            # Check cache
            cached_value = await cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute and cache
            result = await func(*args, **kwargs)
            await cache.set(key, result, ttl)
            return result
        
        return wrapper
    return decorator


def invalidate_cache(patterns: list[str]):
    """
    Decorator per invalidare cache dopo operazioni di scrittura
    
    @invalidate_cache(["lspd_stats", "lspd_cases"])
    async def create_case(db, case_data):
        ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Invalida patterns
            for pattern in patterns:
                await cache.invalidate_pattern(pattern)
            
            return result
        return wrapper
    return decorator


# Cache specifiche per moduli
class ModuleCache:
    """Cache helper per moduli specifici"""
    
    @staticmethod
    async def get_user(user_id: int) -> Optional[dict]:
        return await cache.get(f"user:{user_id}")
    
    @staticmethod
    async def set_user(user_id: int, data: dict, ttl: int = 300) -> None:
        await cache.set(f"user:{user_id}", data, ttl)
    
    @staticmethod
    async def invalidate_user(user_id: int) -> None:
        await cache.delete(f"user:{user_id}")
    
    @staticmethod
    async def get_stats(module: str) -> Optional[dict]:
        return await cache.get(f"stats:{module}")
    
    @staticmethod
    async def set_stats(module: str, data: dict, ttl: int = 30) -> None:
        await cache.set(f"stats:{module}", data, ttl)
    
    @staticmethod
    async def invalidate_stats(module: str) -> None:
        await cache.invalidate_pattern(f"stats:{module}")


# Endpoint per stats cache (debug/monitoring)
async def get_cache_stats() -> dict:
    """Ritorna statistiche cache per monitoring"""
    return cache.stats()


async def clear_all_cache() -> dict:
    """Svuota tutta la cache (admin only)"""
    await cache.clear()
    return {"status": "cleared"}
