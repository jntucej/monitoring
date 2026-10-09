import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
if (process.env.REDIS_URL && typeof window === 'undefined') {
  redisClient = new Redis(process.env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  redisClient.on('error', (err) => {
    console.warn('[RateLimiter] Redis connection error, will fallback to memory if not connected.', err.message);
  });
}

const limitersCache = new Map<string, RateLimiterRedis | RateLimiterMemory>();

function getLimiter(keyPrefix: string, maxRequests: number, windowMs: number) {
  const duration = Math.ceil(windowMs / 1000);
  const cacheKey = `${keyPrefix}:${maxRequests}:${duration}`;
  let limiter = limitersCache.get(cacheKey);
  
  if (!limiter) {
    if (redisClient && redisClient.status === 'ready') {
      limiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: `rl_${keyPrefix}`,
        points: maxRequests,
        duration: duration,
      });
    } else {
      limiter = new RateLimiterMemory({
        keyPrefix: `rl_${keyPrefix}`,
        points: maxRequests,
        duration: duration,
      });
    }
    limitersCache.set(cacheKey, limiter);
  }
  return limiter;
}

export function extractClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "127.0.0.1"
  );
}

export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: {
    windowMs?: number;
    maxRequests?: number;
    keyPrefix?: string;
  } = {}
) {
  const { windowMs = 60 * 1000, maxRequests = 100, keyPrefix = "global" } = options;

  return async function (req: NextRequest, ...args: any[]) {
    const ip = extractClientIp(req);
    const limiter = getLimiter(keyPrefix, maxRequests, windowMs);

    try {
      await limiter.consume(ip);
      return await handler(req, ...args);
    } catch (rejectRes: any) {
      const retrySecs = rejectRes?.msBeforeNext ? Math.ceil(rejectRes.msBeforeNext / 1000) : Math.ceil(windowMs / 1000);
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests. Please try again after ${retrySecs} seconds.`,
          },
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(retrySecs),
            "X-RateLimit-Limit": String(maxRequests),
          }
        }
      );
    }
  };
}