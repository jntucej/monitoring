
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from './middleware/auth';

// All API routes are protected by default.
// Only routes listed here are publicly accessible.
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/pin-login',
  '/api/auth/session',
  // The logout route should still be protected to prevent CSRF attacks
  // where a malicious site could log a user out.
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // If the request is for a public route, skip authentication.
  if (publicRoutes.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // For all other API routes, apply the authentication middleware.
  // The authMiddleware will handle token validation and return an appropriate
  // response if authentication fails.
  return authMiddleware(req);
}

// The matcher ensures this middleware runs only for API routes.
export const config = {
  matcher: ['/api/:path*'],
};
