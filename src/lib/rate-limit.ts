import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const DEFAULT_WINDOW = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * Distributed rate limiter.
 * Operates statelessly across serverless invocations using Upstash Redis REST API
 * or Supabase API metrics DB check when running in serverless production.
 * Falls back to local in-memory store in development/test.
 */
export async function checkRateLimit(
  reqOrKey: NextRequest | string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const windowMs = config.windowMs || DEFAULT_WINDOW;
  const maxRequests = config.maxRequests || DEFAULT_MAX_REQUESTS;
  const keyPrefix = config.keyPrefix || 'rate_limit';

  let ip = 'global';
  if (typeof reqOrKey === 'string') {
    ip = reqOrKey;
  } else {
    ip =
      reqOrKey.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      reqOrKey.headers.get('x-real-ip') ||
      'unknown';
  }

  const isDev =
    process.env.NODE_ENV !== 'production' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'unknown' ||
    ip === 'localhost';

  const effectiveMaxRequests = isDev ? Math.max(maxRequests * 10, 200) : maxRequests;
  const key = `${keyPrefix}:${ip}`;

  // 1. Upstash Redis REST distributed rate limiter (if configured)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken && !isDev) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds, 'NX'],
        ]),
        cache: 'no-store',
      });

      const data = await res.json();
      const currentCount = Number(data?.[0]?.result ?? 1);
      const resetTime = new Date(Date.now() + windowMs);
      const limited = currentCount > effectiveMaxRequests;
      const remaining = Math.max(0, effectiveMaxRequests - currentCount);

      return {
        limited,
        remaining,
        resetTime,
        retryAfter: limited ? Math.ceil(windowMs / 1000) : 0,
      };
    } catch (err) {
      console.warn('[rate-limit] Redis distributed rate limiter error, falling back:', err);
    }
  }

  // 2. PostgreSQL DB distributed rate limit check for production serverless fallback
  if (process.env.NODE_ENV === 'production' && !isDev) {
    try {
      const { rows } = await query(
        `SELECT COUNT(*) as count FROM api_metrics 
         WHERE endpoint = $1 AND timestamp >= $2`,
        [key, new Date(Date.now() - windowMs).toISOString()]
      );

      const currentCount = parseInt(rows[0]?.count || '0', 10);
      const limited = currentCount >= effectiveMaxRequests;
      const remaining = Math.max(0, effectiveMaxRequests - currentCount);
      const resetTime = new Date(Date.now() + windowMs);

      return {
        limited,
        remaining,
        resetTime,
        retryAfter: limited ? Math.ceil(windowMs / 1000) : 0,
      };
    } catch (err) {
      console.warn('[rate-limit] PostgreSQL distributed rate limiter error, falling back:', err);
    }
  } currentCount = (count || 0) + 1;
      const resetTime = new Date(Date.now() + windowMs);
      const limited = currentCount > effectiveMaxRequests;
      const remaining = Math.max(0, effectiveMaxRequests - currentCount);

      void client.from('api_metrics').insert({
        endpoint: key,
        response_time: 0,
        status_code: limited ? 429 : 200,
        timestamp: new Date().toISOString(),
      });

      return {
        limited,
        remaining,
        resetTime,
        retryAfter: limited ? Math.ceil(windowMs / 1000) : 0,
      };
    } catch (dbErr) {
      console.warn('[rate-limit] DB distributed rate limiter error, falling back:', dbErr);
    }
  }

  // 3. In-memory rate limiter fallback (development/test)
  const now = Date.now();
  if (store[key] && store[key].resetTime < now) {
    delete store[key];
  }

  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return {
      limited: false,
      remaining: effectiveMaxRequests - 1,
      resetTime: new Date(store[key].resetTime),
    };
  }

  store[key].count++;
  const resetTime = new Date(store[key].resetTime);

  if (store[key].count > effectiveMaxRequests) {
    const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
    return {
      limited: true,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  return {
    limited: false,
    remaining: effectiveMaxRequests - store[key].count,
    resetTime,
  };
}

// Legacy function signature for backward compatibility with rateLimit(key, points)
export function rateLimit(keyOrReq: string | NextRequest, pointsOrConfig?: number | RateLimitConfig) {
  if (typeof keyOrReq === 'string') {
    const points = (pointsOrConfig as number) || 5;
    return checkRateLimit(keyOrReq, { maxRequests: points, windowMs: 60 * 1000 });
  }
  const config = (keyOrReq as unknown as RateLimitConfig) || {};
  return (req: NextRequest) => checkRateLimit(req, config);
}

// Rate limiting middleware wrapper for Next.js API routes
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  return async (req: NextRequest, ...args: any[]) => {
    const result = await checkRateLimit(req, config);

    if (result.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            resetAt: result.resetTime.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': (result.retryAfter || 60).toString(),
            'X-RateLimit-Limit': (config.maxRequests || DEFAULT_MAX_REQUESTS).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toISOString(),
          },
        }
      );
    }

    const response = await handler(req, ...args);

    response.headers.set('X-RateLimit-Limit', (config.maxRequests || DEFAULT_MAX_REQUESTS).toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());

    return response;
  };
}

// Pre-configured rate limiters for different endpoints
export const rateLimits = {
  auth: (handler: (req: NextRequest) => Promise<Response>) => 
    withRateLimit(handler, { maxRequests: 5, windowMs: 60 * 1000, keyPrefix: 'auth' }),
  
  scan: (handler: (req: NextRequest) => Promise<Response>) => 
    withRateLimit(handler, { maxRequests: 30, windowMs: 60 * 1000, keyPrefix: 'scan' }),
  
  read: (handler: (req: NextRequest) => Promise<Response>) => 
    withRateLimit(handler, { maxRequests: 60, windowMs: 60 * 1000, keyPrefix: 'read' }),
  
  admin: (handler: (req: NextRequest) => Promise<Response>) => 
    withRateLimit(handler, { maxRequests: 120, windowMs: 60 * 1000, keyPrefix: 'admin' }),
  
  public: (handler: (req: NextRequest) => Promise<Response>) => 
    withRateLimit(handler, { maxRequests: 300, windowMs: 60 * 1000, keyPrefix: 'public' }),
};
