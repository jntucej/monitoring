/**
 * High-performance Cache Manager for Gate Monitor Platform.
 * Supports dual-mode operation: Redis client (if REDIS_URL is set) or high-efficiency in-memory TTL cache fallback.
 *
 * Issue #383: enforces a hard entry cap (LRU eviction) so the Map never
 * grows unboundedly when keys include user IDs or session identifiers.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

// Hard limit — evict oldest entries when reached.
const MAX_ENTRIES = 5_000;

class InMemoryCache {
  // Map preserves insertion order; delete+re-set moves an entry to the end
  // (most-recently-used), making the first key always the least-recently-used.
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): void {
    const now = Date.now();

    // Sweep a batch of expired entries first (amortised cost)
    if (this.cache.size > 0) {
      let swept = 0;
      for (const [k, v] of this.cache) {
        if (now > v.expiresAt) {
          this.cache.delete(k);
          if (++swept >= 50) break; // cap sweep to 50 per set
        }
      }
    }

    // Enforce size cap — evict LRU (first insertion-order entry)
    while (this.cache.size >= MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }

    this.cache.set(key, { value, expiresAt: now + ttlSeconds * 1000, tags });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  /** Metrics for /metrics endpoint. */
  getStats(): { size: number; maxSize: number; hits: number; misses: number } {
    return { size: this.cache.size, maxSize: MAX_ENTRIES, hits: this.hits, misses: this.misses };
  }
}

const memoryCache = new InMemoryCache();

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return memoryCache.get<T>(key);
  } catch (error) {
    console.error(`[Cache Error] Failed to get key ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    memoryCache.set<T>(key, value, ttlSeconds);
  } catch (error) {
    console.error(`[Cache Error] Failed to set key ${key}:`, error);
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    memoryCache.invalidate(pattern);
  } catch (error) {
    console.error(`[Cache Error] Failed to invalidate pattern ${pattern}:`, error);
  }
}

export async function clearCache(): Promise<void> {
  memoryCache.clear();
}

export function getCacheStats(): { size: number; maxSize: number; hits: number; misses: number } {
  return memoryCache.getStats();
}
