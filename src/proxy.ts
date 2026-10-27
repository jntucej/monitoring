import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './lib/rate-limit';
import { validateCsrf } from './lib/csrf';

/**
 * Home-page auth redirect (UX only, not a security boundary).
 *
 * The marketing home page `/` is fully static (CDN-cacheable). Logged-in
 * visitors carrying an auth cookie are bounced to their role console before
 * routing. This mirrors the default-route table in
 * `src/server/policy/routes.ts` (inlined here because the edge runtime
 * cannot import server-only modules that touch the DB).
 *
 * Real authorization still happens server-side in `createAuthContext` /
 * route guards — decoding the JWT here only reads the role to pick a target.
 */
const HOME_DEFAULT_ROUTE: Record<string, string> = {
  operator: '/operator',
  admin: '/admin',
  sysadmin: '/sysadmin',
  supervisor: '/supervisor',
  guardian: '/parent',
  parent: '/parent',
  student: '/student',
  warden: '/principal',
  faculty: '/faculty/permissions',
  staff: '/staff',
  worker: '/worker',
  visitor: '/visitor',
  caretaker: '/hostel/permissions',
  deputy_warden: '/deputy-warden',
  hostel_manager: '/hostel-manager',
  principal: '/principal/permissions',
  vice_principal: '/vice-principal',
  oie: '/oie',
  exam_branch: '/exam-branch',
  hod: '/hod',
  exam_superintendent: '/exam/superintendent',
  mess_incharge: '/mess',
};

function decodeRoleFromJwt(
  token: string,
): { role?: string; gateId?: string } | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded.role === 'string') {
      return { role: decoded.role, gateId: decoded.gateId ?? decoded.gate_id };
    }
    if (Array.isArray(decoded.roles) && decoded.roles.length > 0) {
      return { role: decoded.roles[0], gateId: decoded.gateId ?? decoded.gate_id };
    }
    return null;
  } catch {
    return null;
  }
}

function homeAuthRedirect(req: NextRequest): NextResponse | null {
  const token =
    req.cookies.get('access_token')?.value ??
    req.cookies.get('refresh_token')?.value ??
    req.cookies.get('auth_token')?.value;
  if (!token) return null;
  const payload = decodeRoleFromJwt(token);
  if (!payload?.role) return null;
  let target = HOME_DEFAULT_ROUTE[payload.role];
  if (payload.role === 'operator' && payload.gateId) {
    target = `/gate/${payload.gateId}`;
  }
  if (!target) return null;
  const url = req.nextUrl.clone();
  url.pathname = target;
  url.search = '';
  url.hash = '';
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const { pathname } = req.nextUrl;

  // Home landing page: redirect authenticated visitors to their role
  // console. Runs for everyone hitting `/` (no rate-limit / CSRF needed).
  if (pathname === '/') {
    const redirect = homeAuthRedirect(req);
    if (redirect) return redirect;
    return NextResponse.next();
  }

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

  // ── Server-side auth gate for protected HTML routes (opt-in) ────────
  // Enabled by GATE_ON_HTML_ROUTES=1. Without it the protected role routes
  // (/admin, /sysadmin, /student, ...) all return 200 with the full app
  // shell to an anonymous request — an attacker can enumerate role → chunk
  // mappings. When enabled, the edge checks for a session cookie and, if
  // absent, 302 → /login?next=<path>. It is opt-in because the primary
  // login flow stores the JWT in sessionStorage (authStore.ts) and only
  // /api/auth/session mirrors it to a cookie; the operator kiosk and some
  // client sessions may not carry the cookie, so enabling it by default
  // would lock those flows out. The client AuthGuard + API 401s already
  // stop data access; this gate only stops the HTML shell from leaking.
  if (!pathname.startsWith('/api')) {
    // Anonymous hit on a protected role route → clean 302 to /login?next=…
    // (the shell no longer leaks over the wire; AuthGuard still owns data access).
    const PROTECTED_HTML_PREFIXES = [
      '/admin', '/sysadmin', '/student', '/operator', '/parent',
      '/caretaker', '/deputy-warden', '/faculty', '/guardian', '/hod',
      '/hostel', '/hostel-manager', '/oic', '/oie', '/permissions',
      '/principal', '/staff', '/vice-principal', '/supervisor',
      '/mess', '/exam', '/exam-branch', '/visitor', '/person',
      '/campus', '/onboarding', '/settings',
    ];
    if (PROTECTED_HTML_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      const token =
        req.cookies.get('access_token')?.value ??
        req.cookies.get('refresh_token')?.value;
      if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url, 302);
      }
    }
  }

  if (!pathname.startsWith('/api')) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const limitResult = (await rateLimit(req, { maxRequests: 300 })) as { limited: boolean };
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

export default proxy;

export const config = {
  // /api/* → rate-limit + CSRF (always).
  // Protected HTML role routes (e.g. /admin, /student, /operator, …) → 302 to
  // /login?next=… when the session cookie is absent (stops the app shell
  // leaking over the wire to anonymous visitors; AuthGuard still owns data
  // access for in-page navigation). The flag is no longer env-gated: the
  // kiosk flows authenticate via /api/*, so the cookie check only fires
  // for the HTML shell, never for the operator's kiosk API calls.
  matcher: [
    '/api/:path*',
    '/admin', '/admin/:path*',
    '/sysadmin', '/sysadmin/:path*',
    '/student', '/student/:path*',
    '/operator', '/operator/:path*',
    '/parent', '/parent/:path*',
    '/caretaker', '/caretaker/:path*',
    '/deputy-warden', '/deputy-warden/:path*',
    '/faculty', '/faculty/:path*',
    '/guardian', '/guardian/:path*',
    '/hod', '/hod/:path*',
    '/hostel', '/hostel/:path*',
    '/hostel-manager', '/hostel-manager/:path*',
    '/oie', '/oie/:path*',
    '/permissions', '/permissions/:path*',
    '/principal', '/principal/:path*',
    '/staff', '/staff/:path*',
    '/vice-principal', '/vice-principal/:path*',
    '/supervisor', '/supervisor/:path*',
    '/mess', '/mess/:path*',
    '/exam', '/exam/:path*',
    '/exam-branch', '/exam-branch/:path*',
    '/visitor', '/visitor/:path*',
    '/person', '/person/:path*',
    '/campus', '/campus/:path*',
    '/onboarding', '/onboarding/:path*',
    '/settings', '/settings/:path*',
  ],
};
