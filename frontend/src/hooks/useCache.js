/**
 * PURE LIFE OS 3.0 - IndexedDB Cache Hook
 * Cache client-side persistente per liste e dati frequenti
 */

const DB_NAME = 'purelife_os_cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  USERS: 'users',
  CASES: 'cases',
  NEWS: 'news',
  CHAT: 'chat',
  STATS: 'stats',
  NOTIFICATIONS: 'notifications'
};

// Open database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      });
    };
  });
};

// Get item from cache
const getFromCache = async (storeName, key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt && Date.now() > result.expiresAt) {
          // Expired - delete and return null
          deleteFromCache(storeName, key);
          resolve(null);
        } else {
          resolve(result?.data || null);
        }
      };
    });
  } catch (error) {
    console.warn('[Cache] Get error:', error);
    return null;
  }
};

// Set item in cache
const setInCache = async (storeName, key, data, ttlSeconds = 300) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item = {
        id: key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000)
      };

      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  } catch (error) {
    console.warn('[Cache] Set error:', error);
    return false;
  }
};

// Delete item from cache
const deleteFromCache = async (storeName, key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  } catch (error) {
    console.warn('[Cache] Delete error:', error);
    return false;
  }
};

// Clear entire store
const clearStore = async (storeName) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  } catch (error) {
    console.warn('[Cache] Clear error:', error);
    return false;
  }
};

// Clear all stores
const clearAllCache = async () => {
  await Promise.all(Object.values(STORES).map(store => clearStore(store)));
};

/**
 * Hook per usare la cache con stale-while-revalidate
 */
import { useState, useEffect, useCallback } from 'react';

export const useCache = (storeName, key, fetcher, options = {}) => {
  const { ttl = 300, staleWhileRevalidate = true, enabled = true } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled || !key) return;
    
    if (showLoading) setLoading(true);
    setError(null);

    try {
      // Try cache first
      const cached = await getFromCache(storeName, key);
      if (cached) {
        setData(cached);
        setIsStale(true);
        if (showLoading) setLoading(false);
        
        if (!staleWhileRevalidate) return;
      }

      // Fetch fresh data
      const freshData = await fetcher();
      setData(freshData);
      setIsStale(false);
      
      // Update cache
      await setInCache(storeName, key, freshData, ttl);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [storeName, key, fetcher, ttl, staleWhileRevalidate, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Invalidate cache and refetch
  const invalidate = useCallback(async () => {
    await deleteFromCache(storeName, key);
    await fetchData(false);
  }, [storeName, key, fetchData]);

  // Manual refetch
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
    invalidate
  };
};

/**
 * Hook per lista paginata con cache
 */
export const usePaginatedCache = (storeName, fetcher, options = {}) => {
  const { pageSize = 20, ttl = 300 } = options;
  
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadPage = useCallback(async (pageNum, append = false) => {
    setLoading(true);
    const cacheKey = `${storeName}_page_${pageNum}`;

    try {
      // Try cache
      let pageData = await getFromCache(storeName, cacheKey);
      
      if (!pageData) {
        // Fetch from API
        pageData = await fetcher({ page: pageNum, limit: pageSize });
        await setInCache(storeName, cacheKey, pageData, ttl);
      }

      const newItems = Array.isArray(pageData) ? pageData : pageData.items || [];
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setHasMore(newItems.length === pageSize);
      setPage(pageNum);
    } catch (err) {
      console.error('[Cache] Paginated load error:', err);
    } finally {
      setLoading(false);
    }
  }, [storeName, fetcher, pageSize, ttl]);

  // Initial load
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadPage(page + 1, true);
    }
  }, [loading, hasMore, page, loadPage]);

  // Refresh (clear cache and reload)
  const refresh = useCallback(async () => {
    await clearStore(storeName);
    setItems([]);
    setPage(1);
    setHasMore(true);
    await loadPage(1);
  }, [storeName, loadPage]);

  return {
    items,
    loading,
    hasMore,
    page,
    loadMore,
    refresh
  };
};

// Export utilities
export { 
  STORES, 
  getFromCache, 
  setInCache, 
  deleteFromCache, 
  clearStore, 
  clearAllCache 
};

export default useCache;
