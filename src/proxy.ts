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

  // ── Server-side auth gate for protected HTML routes ─────────────────
  // Without this, /admin, /sysadmin, /student, etc. all return 200 with
  // the full app shell (loading spinner, title, chunk-per-role) to an
  // anonymous curl. The client-side AuthGuard then redirects, but the
  // shell has already leaked — an attacker can enumerate role → chunk
  // mappings from the HTML. Doing the cookie check here (edge runtime,
  // presence-only, no JWT validation) means an anonymous request gets
  // a 302 → /login?next=<path> instead of 200 + 27 KB of shell.
  const PROTECTED_HTML_PREFIXES = [
    '/admin', '/sysadmin', '/student', '/operator', '/parent',
    '/caretaker', '/deputy-warden', '/faculty', '/guardian', '/hod',
    '/hostel', '/hostel-manager', '/oic', '/oie', '/permissions',
    '/principal', '/staff', '/vice-principal', '/supervisor',
    '/mess', '/exam', '/exam-branch', '/visitor', '/person',
    '/campus', '/onboarding', '/settings',
  ];
  const isProtectedHtml = PROTECTED_HTML_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isProtectedHtml) {
    const token =
      req.cookies.get('access_token')?.value ??
      req.cookies.get('refresh_token')?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url, 302);
    }
    // Token present — pass through; the client AuthGuard + API 401s
    // handle the case where the token is stale/invalid.
  }

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
