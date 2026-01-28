/**
 * Bounded cache with LRU eviction and TTL support
 * Prevents memory leaks from unbounded caches in long-running sessions
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface BoundedCacheOptions {
  /** Maximum number of entries before LRU eviction */
  maxSize: number;
  /** Time-to-live in milliseconds (0 = no expiration) */
  ttl: number;
}

/**
 * Creates a bounded cache with LRU eviction
 * Automatically evicts least-recently-used entries when maxSize is reached
 */
export function createBoundedCache<T>(options: BoundedCacheOptions) {
  const { maxSize, ttl } = options;
  const cache = new Map<string, CacheEntry<T>>();

  /**
   * Get an entry from the cache
   * Returns undefined if not found or expired
   * Updates LRU order on access
   */
  function get(key: string): T | undefined {
    const entry = cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    cache.delete(key);
    cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set an entry in the cache
   * Evicts least-recently-used entries if at capacity
   */
  function set(key: string, data: T): void {
    // If key exists, delete first to update LRU order
    if (cache.has(key)) {
      cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if cache has a valid (non-expired) entry
   */
  function has(key: string): boolean {
    const entry = cache.get(key);

    if (!entry) {
      return false;
    }

    // Check TTL
    if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an entry from the cache
   */
  function remove(key: string): boolean {
    return cache.delete(key);
  }

  /**
   * Clear all entries
   */
  function clear(): void {
    cache.clear();
  }

  /**
   * Get current cache size
   */
  function size(): number {
    return cache.size;
  }

  /**
   * Prune expired entries (useful for periodic cleanup)
   */
  function prune(): number {
    if (ttl <= 0) return 0;

    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of cache) {
      if (now - entry.timestamp > ttl) {
        cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  return {
    get,
    set,
    has,
    delete: remove,
    clear,
    size,
    prune,
  };
}

/**
 * Default cache configurations for different use cases
 */
export const CACHE_CONFIGS = {
  // API response cache: 5 min TTL, max 100 entries
  apiResponses: { maxSize: 100, ttl: 5 * 60 * 1000 },

  // Chapter cache: 30 min TTL, max 50 entries
  chapters: { maxSize: 50, ttl: 30 * 60 * 1000 },

  // Search results: 2 min TTL, max 20 entries
  searchResults: { maxSize: 20, ttl: 2 * 60 * 1000 },

  // Image cache: 1 hour TTL, max 200 entries
  images: { maxSize: 200, ttl: 60 * 60 * 1000 },
};
