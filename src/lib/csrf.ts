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

  // Check Sec-Fetch-Site if provided by modern browsers
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return {
      valid: false,
      error: "Cross-site request blocked by CSRF protection.",
    };
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host.toLowerCase();
      const targetHost = host.toLowerCase();

      const allowedOriginEnv = process.env.ALLOWED_ORIGIN;
      let allowedHost: string | null = null;
      if (allowedOriginEnv && allowedOriginEnv !== "*") {
        try {
          allowedHost = new URL(allowedOriginEnv).host.toLowerCase();
        } catch {
          allowedHost = allowedOriginEnv.toLowerCase();
        }
      }

      if (originHost !== targetHost && (!allowedHost || originHost !== allowedHost)) {
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

