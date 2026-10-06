// Rate limiting implementation for self-hosted PostgreSQL
// Replaces the Upstash Redis-based rate limiter with a PostgreSQL-based solution

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

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

export function getRateLimitConfig(): RateLimitConfig {
  const env = getEnv();
  return {
    windowMs: env.isProduction ? 60 * 1000 : 15 * 1000, // 1 min default, 15 min in dev
    maxRequests: env.isProduction ? 100 : 30,
    keyPrefix: 'gate_limiter',
  };
}

export async function checkRateLimit(
  reqOrKey: string,
  config: RateLimitConfig = {}
): Promise<{
  limited: boolean;
  remaining: number;
  resetTime: string;
  retryAfter?: number;
}> {
  const windowMs = config.windowMs || 60 * 1000;
  const maxRequests = config.maxRequests || 100;
  const keyPrefix = config.keyPrefix || 'gate_limiter';
  const key = `${keyPrefix}:${reqOrKey}`;
  
  // Use the Supabase service client (which connects to our self-hosted PostgreSQL)
  const service = getSupabaseServiceClient();
  
  // Query PostgreSQL for recent rate limit entries
  const query = `
    SELECT COUNT(*) AS count, MAX(updated_at) AS last_update
    FROM rate_limit_logs
    WHERE key = $1 AND updated_at > NOW() - $2
    ORDER BY updated_at DESC
    LIMIT 100
  `;
  
  try {
    const result = await service.from('rate_limit_logs').select('count', 'last_update').eq('key', key).eq('window_start', new Date(Date.now() - windowMs)).orderBy('updated_at', 'desc').limit(100);
    
    if (result.length === 0) {
      // No previous hits in this window - allow request
      return {
        limited: false,
        remaining: maxRequests,
        resetTime: new Date(Date.now() + windowMs).toISOString(),
      };
    }
    
    const recentCount = result[0]?.count || 0;
    const resetTime = new Date(Date.now() + (windowMs - recentCount * (windowMs / maxRequests))).toISOString();
    
    if (recentCount >= maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetTime,
      };
    }
    
    return {
      limited: false,
      remaining: maxRequests - recentCount,
      resetTime,
    };
  } catch (error) {
    console.error('[RateLimit] Failed to check rate limit:', error);
    // Fail open - allow request if rate limiting service is unavailable
    return {
      limited: false,
      remaining: maxRequests,
      resetTime: new Date(Date.now() + windowMs).toISOString(),
    };
  };
}

export async function withRateLimit(
  handler: (req: any, _args: any[]) => Promise<any>,
  config: RateLimitConfig = {}
) {
  const result = await checkRateLimit('any', config);
  
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
          'Retry-After': result.retryAfter,
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime,
        },
      }
    );
  }
  
  return handler(req, _args);
}
