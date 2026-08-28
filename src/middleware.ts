import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';
import { verifyCsrf } from './middleware/csrf';
import { getDefaultRouteForRole } from './lib/route-helpers';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api')) {
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

    // Global CSRF verification for state-changing HTTP mutation methods
    const csrfError = verifyCsrf(req);
    if (csrfError) {
      return csrfError;
    }

    return NextResponse.next();
  }

  // Role-based path restrictions for page routes
  const role = req.headers.get('x-user-role') || req.cookies.get('user-role')?.value || req.cookies.get('role')?.value;
  if (role) {
    const defaultRoute = getDefaultRouteForRole(role);

    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/gate') && role !== 'operator' && role !== 'sysadmin' && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/sysadmin') && role !== 'sysadmin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/student') && role !== 'student' && role !== 'sysadmin' && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/faculty') && role !== 'faculty' && role !== 'sysadmin' && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/parent') && !['parent', 'guardian', 'sysadmin', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/staff') && role !== 'staff' && role !== 'sysadmin' && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/worker') && role !== 'worker' && role !== 'sysadmin' && role !== 'admin') {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
    if (path.startsWith('/supervisor') && !['supervisor', 'warden', 'admin', 'sysadmin'].includes(role)) {
      return NextResponse.redirect(new URL(defaultRoute, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/sysadmin/:path*',
    '/gate/:path*',
    '/student/:path*',
    '/faculty/:path*',
    '/parent/:path*',
    '/staff/:path*',
    '/worker/:path*',
    '/supervisor/:path*',
  ],
};

