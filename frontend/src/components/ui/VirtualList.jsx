/**
 * PURE LIFE OS 3.0 - Virtual List Component
 * Rendering virtualizzato per liste lunghe (1000+ elementi)
 */

import React, { useRef, useState, useEffect, useCallback, memo } from 'react';

/**
 * VirtualList - Renderizza solo gli elementi visibili
 * @param {Array} items - Array di elementi da renderizzare
 * @param {Function} renderItem - Funzione per renderizzare ogni elemento
 * @param {number} itemHeight - Altezza fissa di ogni elemento
 * @param {number} overscan - Elementi extra da renderizzare sopra/sotto
 * @param {string} className - Classi CSS per il container
 */
export const VirtualList = memo(({ 
  items = [], 
  renderItem, 
  itemHeight = 60, 
  overscan = 5,
  className = '',
  onEndReached,
  endReachedThreshold = 200,
  loading = false,
  LoadingComponent = null
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calcola quali elementi sono visibili
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Elementi visibili
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(scrollTop);

    // Check if near end for infinite scroll
    if (onEndReached && scrollHeight - scrollTop - clientHeight < endReachedThreshold) {
      onEndReached();
    }
  }, [onEndReached, endReachedThreshold]);

  // Resize observer per container height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Initial height
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ position: 'relative' }}
    >
      {/* Spacer per mantenere scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Container elementi visibili */}
        <div
          style={{
            position: 'absolute',
            top: startIndex * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id || startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Loading indicator */}
      {loading && LoadingComponent && (
        <div className="py-4">
          {LoadingComponent}
        </div>
      )}
    </div>
  );
});

/**
 * VirtualGrid - Griglia virtualizzata
 */
export const VirtualGrid = memo(({
  items = [],
  renderItem,
  itemHeight = 200,
  itemWidth = 300,
  gap = 16,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calcola colonne
  const columns = Math.max(1, Math.floor((containerSize.width + gap) / (itemWidth + gap)));
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * (itemHeight + gap);

  // Calcola righe visibili
  const rowHeight = itemHeight + gap;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const endRow = Math.min(rows - 1, Math.ceil((scrollTop + containerSize.height) / rowHeight) + 1);

  // Elementi visibili
  const visibleItems = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < items.length) {
        visibleItems.push({ item: items[index], row, col, index });
      }
    }
  }

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, row, col, index }) => (
          <div
            key={item.id || index}
            style={{
              position: 'absolute',
              top: row * rowHeight,
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Hook per infinite scroll semplice
 */
export const useInfiniteScroll = (callback, options = {}) => {
  const { threshold = 100, enabled = true } = options;
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    observerRef.current = observer;

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [callback, threshold, enabled]);

  return loadMoreRef;
};

export default VirtualList;
