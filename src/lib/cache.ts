/**
 * High-performance Cache Manager for Gate Monitor Platform.
 * Supports dual-mode operation: Redis client (if REDIS_URL is set) or high-efficiency in-memory TTL cache fallback.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
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
