// Cache management for self-hosted PostgreSQL
// Replaces the in-memory cache with a PostgreSQL-backed cache for production

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

/**
 * Cache entry stored in PostgreSQL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * In-memory cache wrapper around PostgreSQL
 * Provides TTL-based caching with PostgreSQL as the backing store
 */
class PostgresCache {
  constructor(private db: SupabaseClient) {
    this.db = db;
  }
  
  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.db.from('cache_table').select('value', 'expires_at').eq('key', key).first();
    if (!result) return null;
    
    const entry = result[0];
    if (Date.now() > entry.expiresAt) {
      // Expired - remove from cache
      await this.db.from('cache_table').delete().eq('key', key).where('expires_at', '>=', entry.expiresAt).where('key', key);
      return null;
    }
    
    return entry.value;
  }
  
  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    await this.db.from('cache_table').insert({ key, value, expiresAt }).onConflict('key').ignore();
  }
  
  /**
   * Delete all entries with a prefix
   */
  async invalidatePattern(prefix: string): Promise<number> {
    const result = await this.db.from('cache_table').delete().eq('key', '*' + prefix).where('expires_at', '>=', new Date()).where('key', '*' + prefix).count();
    return result;
  }
  
  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    await this.db.from('cache_table').delete().where('expires_at', '>=', new Date());
  }
}

// Global cache instance
const cache = new PostgresCache(getSupabaseServiceClient());

export async function getCached<T>(key: string): Promise<T | null> {
  return cache.get<T>(key);
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  await cache.set<T>(key, value, ttlSeconds);
}

export async function invalidateCache(prefix: string): Promise<number> {
  return cache.invalidatePattern(prefix);
}

export async function clearCache(): Promise<void> {
  await cache.clear();
}
