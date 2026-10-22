/**
 * Scheme-aware cookie options for auth cookies.
 *
 * The browser-facing origin for this deployment is HTTPS (a host-level
 * TLS terminator presents a Let's Encrypt `*.ucej.in` cert, then forwards
 * plain HTTP to the Caddy container, which reverse-proxies to Next.js).
 *
 * `secure: process.env.NODE_ENV === "production"` is therefore correct for
 * the public HTTPS origin, but it is wrong for the HTTP loopback test path
 * (and for any future non-TLS ingress) — the browser would silently drop
 * the cookies and every hard reload would log the user out.
 *
 * `isSecureCookie` decides per-request: use the `x-forwarded-proto` header
 * when an upstream proxy set it, otherwise trust the request URL scheme.
 *
 * Usage in API routes:
 *   import { secureCookieOptions } from "@/lib/cookies";
 *   response.cookies.set("access_token", token, secureCookieOptions(req, 3600));
 */

export interface SecureCookieOpts {
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge: number;
  path?: string;
}

/**
 * Returns the correct `secure` flag for an auth cookie on this request.
 *
 * Resolution order:
 *   1. `x-forwarded-proto` header (set by a trusted TLS-terminating proxy)
 *   2. The request URL scheme (https → true, http → false)
 *
 * When the request is unambiguously HTTPS, the cookie is secure.
 * When it is unambiguously HTTP, the cookie is NOT secure (so it persists
 * on the loopback / plain-HTTP ingress).
 *
 * For a request that is HTTP with no `x-forwarded-proto` and no explicit
 * hint, we default to `process.env.NODE_ENV === "production"` — preserving
 * the historical behaviour for any ingress we don't yet classify.
 */
export function isRequestSecure(req: {
  headers: Headers;
  url?: string;
  nextUrl?: { protocol: string } | string;
}): boolean {
  // 1. Trusted proxy set x-forwarded-proto.
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto) {
    // The first entry is the client-facing protocol.
    return xfProto.split(",")[0].trim().toLowerCase() === "https";
  }

  // 2. Next.js request.nextUrl or req.url (NextRequest carries both).
  const nextUrl = req.nextUrl;
  if (nextUrl && typeof nextUrl === "object" && nextUrl.protocol) {
    return nextUrl.protocol === "https:";
  }
  if (typeof req.url === "string") {
    return req.url.startsWith("https://");
  }

  // 3. Fallback: treat production as secure (historical behaviour).
  return process.env.NODE_ENV === "production";
}

/**
 * Build the full options object for an auth cookie, with the correct
 * `secure` flag for this request's scheme.
 */
export function secureCookieOptions(
  req: {
    headers: Headers;
    url?: string;
    nextUrl?: { protocol: string } | string;
  },
  opts: SecureCookieOpts,
): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: opts.httpOnly ?? true,
    secure: isRequestSecure(req),
    sameSite: opts.sameSite ?? "lax",
    maxAge: opts.maxAge,
    path: opts.path ?? "/",
  };
}
