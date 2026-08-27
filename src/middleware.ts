import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';

export async function middleware(req: NextRequest) {
  // Global rate limit check for API routes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'global';
  const limitResult = (await rateLimit(`api_global:${ip}`, 300)) as { limited: boolean };
  if (limitResult.limited) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      },
      { status: 429 }
    );
  }

  // Authorization is enforced per-route by `withAuthorization` middleware wrappers
  return NextResponse.next();
}

// The matcher ensures this middleware runs only for API routes.
export const config = {
  matcher: ['/api/:path*'],
};
