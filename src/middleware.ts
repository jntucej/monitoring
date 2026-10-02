import { NextRequest, NextResponse } from 'next/server';
import { Role } from './lib/types';
import { getAuth } from './lib/authContext';

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireRoles?: Role[];
  rateLimit?: boolean;
}

export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  return async function middleware(request: NextRequest) {
    // Skip auth for public endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // Check authentication
    if (options.requireAuth !== false) {
      const auth = await getAuth(request);
      if (!auth?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      // Check role requirements
      if (options.requireRoles?.length && !options.requireRoles.includes(auth.user.role as Role)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
          { status: 403 }
        );
      }
    }

    // Rate limiting (placeholder)
    if (options.rateLimit) {
      const clientId = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const key = `rate_limit_${clientId}`;
      // Implementation would use Redis or similar
    }

    return NextResponse.next();
  };
}

export function withAuth(requiredRoles: Role[] = []) {
  return function handler(handler: any) {
    return async (request: NextRequest) => {
      const auth = await getAuth(request);
      if (!auth?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      if (requiredRoles.length && !requiredRoles.includes(auth.user.role as Role)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
          { status: 403 }
        );
      }

      // Pass auth context to the handler
      (request as any).auth = auth;
      return handler(request);
    };
  };
}
