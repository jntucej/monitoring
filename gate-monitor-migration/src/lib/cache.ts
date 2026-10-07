// Cache management for self-hosted PostgreSQL
// Uses PostgreSQL as the backing store for cached data

import { PoolClient } from 'pg';
import { getPool, query } from './db';
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
  constructor(private pool: any) {}

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const { rows } = await this.pool.query(
        'SELECT value, expires_at FROM cache_table WHERE key = $1',
        [key]
      );
      if (!rows[0]) return null;

      const entry = rows[0];
      if (Date.now() > entry.expires_at) {
        // Expired - remove from cache
        await this.pool.query('DELETE FROM cache_table WHERE key = $1', [key]);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    try {
      await this.pool.query(
        'INSERT INTO cache_table (key, value, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3',
        [key, value, expiresAt]
      );
    } catch (e) {
      console.error('[Cache] Set error:', e);
    }
  }

  /**
   * Delete all entries with a prefix
   */
  async invalidatePattern(prefix: string): Promise<number> {
    try {
      const { rowCount } = await this.pool.query(
        'DELETE FROM cache_table WHERE key LIKE $1',
        [`%${prefix}%`]
      );
      return rowCount || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      await this.pool.query('DELETE FROM cache_table WHERE expires_at > NOW()');
    } catch (e) {
      console.error('[Cache] Clear error:', e);
    }
  }
}

// Global cache instance
let cacheInstance: PostgresCache | null = null;

function getCache(): PostgresCache {
  if (!cacheInstance) {
    cacheInstance = new PostgresCache(getPool());
  }
  return cacheInstance;
}

export async function getCached<T>(key: string): Promise<T | null> {
  return getCache().get<T>(key);
}

export async function setCached<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  await getCache().set<T>(key, value, ttlSeconds);
}

export async function invalidateCache(prefix: string): Promise<number> {
  return getCache().invalidatePattern(prefix);
}

export async function clearCache(): Promise<void> {
  await getCache().clear();
}
