import { NextRequest, NextResponse } from "next/server";

/**
 * Validates CSRF headers on state-changing HTTP mutation requests (POST, PUT, PATCH, DELETE).
 * Returns a 403 response if validation fails, or null if the request is valid.
 */
export function verifyCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!isMutation) {
    return null; // Safe GET/HEAD/OPTIONS methods bypass CSRF check
  }

  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "CSRF verification failed: Cross-site request blocked.",
        },
      },
      { status: 403 }
    );
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const targetHost = host.toLowerCase();
      const allowedOriginEnv = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS;
      let allowedHosts: string[] = [];
      if (allowedOriginEnv && allowedOriginEnv !== "*") {
        allowedHosts = allowedOriginEnv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((o) => {
            try {
              return new URL(o).host.toLowerCase();
            } catch {
              return o.toLowerCase();
            }
          });
      }

      const isMatch =
        originHost === targetHost ||
        allowedOriginEnv === "*" ||
        allowedHosts.includes(originHost);
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "CSRF verification failed: Cross-Origin request blocked.",
            },
          },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "CSRF verification failed: Invalid origin format.",
          },
        },
        { status: 403 }
      );
    }
  }

  return null;
}
