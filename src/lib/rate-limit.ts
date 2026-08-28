import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (use Redis in production)
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

export function rateLimit(keyOrReq: string | NextRequest, pointsOrConfig?: number | RateLimitConfig) {
  if (typeof keyOrReq === 'string') {
    // Legacy support: rateLimit(key, points)
    const key = keyOrReq;
    const points = (pointsOrConfig as number) || 5;
    const isDev = process.env.NODE_ENV !== "production" || key.includes("127.0.0.1") || key.includes("::1") || key.includes("unknown") || key.includes("global");
    const effectivePoints = isDev ? Math.max(points * 10, 1000) : points;
    const now = Date.now();
    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }
    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + 60 * 1000 };
      return Promise.resolve({ limited: false });
    }
    store[key].count++;
    if (store[key].count > effectivePoints) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      return Promise.resolve({ limited: true, retryAfter });
    }
    return Promise.resolve({ limited: false });
  }

  // NextRequest rate limiter function: rateLimit(config)(req)
  const config = (keyOrReq as unknown as RateLimitConfig) || {};
  const windowMs = config.windowMs || DEFAULT_WINDOW;
  const maxRequests = config.maxRequests || DEFAULT_MAX_REQUESTS;
  const keyPrefix = config.keyPrefix || 'rate_limit';

  return function (req: NextRequest): { limited: boolean; remaining: number; resetTime: Date } {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // In local development / test environments, raise rate limits to prevent dev lockouts
    const isDev = process.env.NODE_ENV !== "production" || ip === "127.0.0.1" || ip === "::1" || ip === "unknown" || ip === "localhost";
    const effectiveMaxRequests = isDev ? Math.max(maxRequests * 10, 200) : maxRequests;
    
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return { limited: false, remaining: effectiveMaxRequests - 1, resetTime: new Date(store[key].resetTime) };
    }

    store[key].count++;

    if (store[key].count > effectiveMaxRequests) {
      return { 
        limited: true, 
        remaining: 0, 
        resetTime: new Date(store[key].resetTime) 
      };
    }

    return { 
      limited: false, 
      remaining: effectiveMaxRequests - store[key].count, 
      resetTime: new Date(store[key].resetTime) 
    };
  };
}

// Rate limiting middleware for API routes
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<Response>,
  config: RateLimitConfig = {}
) {
  return async (req: NextRequest, ...args: any[]) => {
    const limiter = (rateLimit as Function)(config);
    const result = limiter(req);

    if (result.limited) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'RATE_LIMIT_EXCEEDED', 
            message: 'Too many requests. Please try again later.',
            resetAt: result.resetTime.toISOString(),
          } 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': (config.maxRequests || DEFAULT_MAX_REQUESTS).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime.toISOString(),
          }
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
