/**
 * Cross-Site Request Forgery (CSRF) & Login CSRF Protection
 *
 * Validates Origin and Host headers on state-changing requests (POST, PUT, PATCH, DELETE)
 * to prevent cross-site request forgery across credential and sensitive mutation endpoints.
 */
import { NextRequest, NextResponse } from "next/server";

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCsrf(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();

  // Safe HTTP methods do not require CSRF origin validation
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { valid: true };
  }

  const pathname = new URL(req.url).pathname;
  const CSRF_EXEMPT = new Set([
    "/api/auth/login", "/api/auth/refresh", "/api/auth/reset-password", "/api/auth/bootstrap", "/api/csrf",
  ]);
  if (CSRF_EXEMPT.has(pathname)) {
    return { valid: true };
  }

  // Check Sec-Fetch-Site if provided by modern browsers.
  // Issue #390: narrow from accepting 'same-site' to only 'same-origin' | 'none'.
  // 'same-site' permits requests from other subdomains (e.g. evil.college.edu).
  // 'same-origin' means same scheme + host + port — the correct check for state-
  // changing requests. 'none' covers direct user navigations.
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) {
    if (secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
      return {
        valid: false,
        error: `Cross-site request blocked: Sec-Fetch-Site '${secFetchSite}' is not allowed.`,
      };
    }
    if (secFetchSite === 'same-origin') {
      return { valid: true };
    }
    // For 'none', fall through to verify Origin / Host consistency if present
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host.toLowerCase();
      const targetHost = host.toLowerCase();

      // Normalise standard HTTP/HTTPS default ports (:80 on http, :443 on https)
      const stripDefaultPort = (h: string) => h.replace(/:80$/, "").replace(/:443$/, "");
      const cleanOriginHost = stripDefaultPort(originHost);
      const cleanTargetHost = stripDefaultPort(targetHost);

      const allowedOriginEnv = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS;
      let allowedHosts: string[] = [];
      if (allowedOriginEnv && allowedOriginEnv !== "*") {
        allowedHosts = allowedOriginEnv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((o) => {
            try {
              return stripDefaultPort(new URL(o).host.toLowerCase());
            } catch {
              return stripDefaultPort(o.toLowerCase());
            }
          });
      }

      if (
        cleanOriginHost !== cleanTargetHost &&
        allowedOriginEnv !== "*" &&
        !allowedHosts.includes(cleanOriginHost)
      ) {
        return {
          valid: false,
          error: `Cross-origin request rejected: origin '${originHost}' does not match host '${targetHost}'.`,
        };
      }
    } catch {
      return { valid: false, error: "Invalid Origin header format." };
    }
  }

  return { valid: true };
}

/**
 * Returns a 403 NextResponse if CSRF validation fails, or null if valid.
 */
export function assertCsrf(req: NextRequest): NextResponse | null {
  const result = validateCsrf(req);
  if (!result.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: result.error || "Cross-origin request rejected.",
        },
      },
      { status: 403 }
    );
  }
  return null;
}
