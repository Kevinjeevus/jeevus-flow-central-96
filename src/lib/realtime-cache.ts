/**
 * Supabase Realtime Cache Manager
 * 
 * Provides an in-memory cache with TTL (time-to-live) support,
 * automatic invalidation via Supabase Realtime subscriptions,
 * and integration with React Query for seamless data management.
 */

type CacheEntry<T = any> = {
  data: T;
  timestamp: number;
  ttl: number;
  queryKeys: string[][];
};

class RealtimeCacheManager {
  private cache = new Map<string, CacheEntry>();
  private subscribers = new Map<string, Set<() => void>>();

  /** Store data in cache with a TTL (default: 5 minutes) */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000, queryKeys: string[][] = []): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      queryKeys,
    });
  }

  /** Get data from cache (returns null if expired or missing) */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /** Check if a cache entry exists and is still valid */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Invalidate a specific cache entry */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.notifySubscribers(key);
  }

  /** Invalidate all cache entries for a given table */
  invalidateByTable(table: string): string[][] {
    const affectedQueryKeys: string[][] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`table:${table}`) || key.includes(table)) {
        affectedQueryKeys.push(...entry.queryKeys);
        this.cache.delete(key);
        this.notifySubscribers(key);
      }
    }

    return affectedQueryKeys;
  }

  /** Clear the entire cache */
  clear(): void {
    this.cache.clear();
  }

  /** Subscribe to cache invalidation events */
  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  /** Get cache stats for debugging */
  getStats() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
      subscribers: this.subscribers.size,
    };
  }

  private notifySubscribers(key: string): void {
    this.subscribers.get(key)?.forEach(cb => cb());
    // Also notify wildcard subscribers
    this.subscribers.get('*')?.forEach(cb => cb());
  }
}

// Singleton instance
export const cacheManager = new RealtimeCacheManager();
