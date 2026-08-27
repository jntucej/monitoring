import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './middleware/auth';
import { rateLimit } from './lib/rate-limit';

// All API routes are protected by default.
// Only routes listed here are publicly accessible.
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/pin-login',
  '/api/auth/session',
  '/api/config/college-info',
  '/api/config/roles',
  '/api/faculty/attendance',
  '/api/workers/shifts',
  '/api/gate/devices',
  '/api/health',
  '/api/metrics',
  // The logout route should still be protected to prevent CSRF attacks
  // where a malicious site could log a user out.
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

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

  // If the request is for a public route, skip authentication.
  if (publicRoutes.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // For all other API routes, apply the authentication middleware.
  return authMiddleware(req);
}

// The matcher ensures this middleware runs only for API routes.
export const config = {
  matcher: ['/api/:path*'],
};
