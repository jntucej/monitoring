import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';
import { verifyCsrf } from './middleware/csrf';

/**
 * Edge middleware protects API-wide controls only. Page authorization is enforced
 * by authenticated API handlers, never by mutable client cookies or headers.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api')) return NextResponse.next();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const limitResult = await rateLimit(`api_global:${ip}`, 300) as { limited: boolean };
  if (limitResult.limited) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' } },
      { status: 429 },
    );
  }

  const csrfError = verifyCsrf(req);
  if (csrfError) return csrfError;
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
