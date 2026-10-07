// Rate limiting implementation for self-hosted PostgreSQL
// Replaces the Upstash Redis-based rate limiter with a PostgreSQL-based solution

import { PoolClient } from 'pg';
import { getEnv } from './env';
import { query, getPool, withTransaction } from './db';

/**
 * Rate limiter for self-hosted PostgreSQL
 * Uses PostgreSQL as the distributed rate limiter backend instead of Upstash Redis.
 * 
 * This implementation leverages the existing PostgreSQL instance for distributed rate limiting,
 * providing a robust alternative that works well with serverless architectures.
 */

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  const env = getEnv();
  return {
    windowMs: env.isProduction ? 60 * 1000 : 15 * 1000, // 1 min default, 15 min in dev
    maxRequests: env.isProduction ? 100 : 30,
    keyPrefix: 'gate_limiter',
  };
}

/**
 * Record a request hit for rate limiting
 */
async function recordRateLimitHit(pool: PoolClient, key: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO rate_limit_logs (key, updated_at) VALUES ($1, NOW())
       ON CONFLICT (key) DO UPDATE SET updated_at = NOW(), hit_count = rate_limit_logs.hit_count + 1`,
      [key]
    );
  } catch (err) {
    // Table may not exist yet - fail silently
    console.debug('[RateLimit] rate_limit_logs table not found, ignoring:', err);
  }
}

export async function checkRateLimit(
  reqOrKey: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const windowMs = config.windowMs || 60 * 1000;
  const maxRequests = config.maxRequests || 100;
  const keyPrefix = config.keyPrefix || 'gate_limiter';
  const key = `${keyPrefix}:${reqOrKey}`;

  const pool = getPool();
  const windowStart = new Date(Date.now() - windowMs);

  try {
    const client = await pool.connect();
    try {
      await recordRateLimitHit(client, key);

      const result = await client.query(
        `SELECT COUNT(*) AS count, MAX(updated_at) AS last_update
         FROM rate_limit_logs
         WHERE key = $1 AND updated_at > $2`,
        [key, windowStart]
      );

      const recentCount = parseInt(result.rows[0]?.count || 0, 10);
      const lastUpdate = result.rows[0]?.last_update || windowStart;

      const resetTime = new Date(lastUpdate.getTime() + windowMs).toISOString();
      const retryAfter = resetTime ? Math.ceil((Date.parse(resetTime) - Date.now()) / 1000) : 0;

      if (recentCount >= maxRequests) {
        return {
          limited: true,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      return {
        limited: false,
        remaining: maxRequests - recentCount,
        resetTime,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[RateLimit] Failed to check rate limit:', error);
    // Fail open - allow request if rate limiting service is unavailable
    return {
      limited: false,
      remaining: maxRequests,
      resetTime: new Date(Date.now() + windowMs).toISOString(),
    };
  }
}

export async function withRateLimit(
  handler: (req: any, _args: any[]) => Promise<any>,
  config: RateLimitConfig = {}
) {
  const key = getRateLimitKey();
  const result = await checkRateLimit(key, config);

  if (result.limited) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Try again later.',
          retryAfter: result.retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': (config.maxRequests || 100).toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime,
        },
      }
    );
  }

  return handler(req, []);
}

/**
 * Extract a rate-limit key from the incoming request
 */
function getRateLimitKey(): string {
  if (typeof window !== 'undefined') {
    return 'unknown';
  }
  const { NextRequest } = require('next/server');
  // This helper is intended for server-side usage; extract from headers where available
  return 'rate_limit_key';
}
