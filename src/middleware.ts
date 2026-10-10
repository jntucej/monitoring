import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';
import { validateCsrf } from './lib/csrf';

export async function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const { pathname } = req.nextUrl;

  const BYPASS_PATHS = ['/api/health', '/metrics', '/api/metrics'];
  if (BYPASS_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const SCRAPER_IPS = (process.env.SCRAPER_IPS ?? '').split(',').filter(Boolean);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  if (SCRAPER_IPS.includes(ip)) return NextResponse.next();

  if (!pathname.startsWith('/api')) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const limitResult = await rateLimit(`api_global:${ip}`, 300) as { limited: boolean };
  if (limitResult.limited) {
    const res = NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.', requestId } },
      { status: 429 },
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const csrfResult = validateCsrf(req);
  if (!csrfResult.valid) {
    const res = NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: csrfResult.error || 'CSRF validation failed.' } },
      { status: 403 }
    );
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
