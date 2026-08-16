/**
 * Rate limiting for Gate Monitoring System
 */
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';

const opts = {
  points: 5, // 5 requests
  duration: 60 * 60, // per hour
  blockDuration: 60 * 15, // block for 15 minutes if exceeded
};

const rateLimiter = new RateLimiterMemory(opts);

export async function rateLimit(key: string, points = 5): Promise<{ limited: boolean; retryAfter?: number }> {
  try {
    const res = await rateLimiter.consume(key, points);
    return { limited: false };
  } catch (rejRes: any) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
    return { limited: true, retryAfter };
  }
}

// Rate limiting middleware for Next.js API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  options: { keyPrefix: string; maxRequests?: number } = { keyPrefix: 'default', maxRequests: 5 }
) {
  return async (req: NextRequest) => {
    // Use IP address as part of the rate limit key
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;

    const { limited, retryAfter } = await rateLimit(key, options.maxRequests);

    if (limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${retryAfter} seconds.`
          }
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '900'
          }
        }
      );
    }

    return handler(req);
  };
}