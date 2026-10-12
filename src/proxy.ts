import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';
import { validateCsrf } from './lib/csrf';

export async function proxy(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const { pathname } = req.nextUrl;

  const BYPASS_PATHS = ['/api/health', '/metrics', '/api/metrics'];
  if (BYPASS_PATHS.some(p => pathname.startsWith(p))) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-request-id', requestId);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const SCRAPER_IPS = (process.env.SCRAPER_IPS ?? '').split(',').filter(Boolean);

  // Most trusted source: x-client-ip is set by the trusted reverse proxy
  // (Caddy) from the remote address; client cannot spoof it.
  const clientIp = req.headers.get('x-client-ip');
  let ip: string;
  if (clientIp) {
    ip = clientIp;
  } else {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) {
      // In production the LAST entry is the actual client IP set by the
      // trusted proxy; earlier entries are upstream proxies. In dev there
      // is no proxy chain, so the first entry is the client IP.
      const entries = xff.split(',').map(s => s.trim()).filter(Boolean);
      ip = process.env.NODE_ENV === 'production' ? entries[entries.length - 1] : entries[0];
    } else {
      // x-real-ip is client-spoofable; only fall back to it in development
      // where no trusted proxy sets x-client-ip / x-forwarded-for.
      ip = req.headers.get('x-real-ip') || 'unknown';
    }
  }

  if (SCRAPER_IPS.includes(ip)) return NextResponse.next();

  if (!pathname.startsWith('/api')) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const limitResult = (await rateLimit(`api_global:${ip}`, 300)) as { limited: boolean };
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

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ['/api/:path*'],
};
