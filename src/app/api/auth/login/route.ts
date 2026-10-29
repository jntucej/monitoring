import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth-token";
import { verifyDPoPProof } from "@/lib/dpop";
import { isHoneytokenIdentifier, triggerDeceptionAlert } from "@/lib/deception";
import { secureCookieOptions } from "@/lib/cookies";
import { addAudit } from "@/lib/db";
import { log, getRequestId } from "@/lib/log";
import { assertCsrf } from "@/lib/csrf";
import type { Role } from "@/lib/types";
import { checkLockout, recordFailedAttempt, clearLockout } from "@/lib/login-lockout";

const GENERIC_FAILURE = {
  success: false,
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid credentials or user not found.",
  },
};

async function handleLoginInner(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Request body must be valid JSON." },
        },
        { status: 400 }
      );
    }

    const { login, email, password } = body as Record<string, unknown>;
    const rawIdentifier = ((login || email || "") as string);
    const rawPassword = ((password || "") as string);

    if (!rawIdentifier.trim() || !rawPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "Both login identifier/email and password are required.",
          },
        },
        { status: 400 }
      );
    }

    const identifier = rawIdentifier.trim();

    // Control 7: Honeytoken tripwire check.
    // If someone attempts to authenticate with a canary sysadmin identifier, fire an immediate alert.
    if (isHoneytokenIdentifier(identifier)) {
      await triggerDeceptionAlert("honeytoken_user", {
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
        attemptedIdentifier: identifier,
        details: { attemptedIdentifier: identifier },
      });
      // Do not reveal it is a honeytoken, fail with generic invalid credentials
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const userRes = await query(
      `SELECT * FROM users
       WHERE deleted_at IS NULL
         AND (
         LOWER(email) = LOWER($1)
         OR UPPER(unique_id) = UPPER($1)
         OR LOWER(login_identifier) = LOWER($1)
         OR LOWER(handle) = LOWER($1)
       )
       LIMIT 1`,
      [identifier]
    );

    if (userRes.rows.length === 0) {
      // BB1: Protect against account enumeration timing attacks via constant-time compare
      // Valid bcrypt hash of a random token so compare takes the expected ~60ms instead of 0.02ms error-abort
      const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
      await verifyPassword(rawPassword, DUMMY_HASH);
      await recordFailedAttempt(identifier, "login");
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const user = userRes.rows[0];

    // Check global lockout
    const lockout = await checkLockout(identifier);
    if (lockout.locked) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCKED",
            message: `Too many failed attempts. Try again after ${lockout.until?.toLocaleTimeString()}.`,
          },
        },
        { status: 429 }
      );
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCKED",
            message: "Account is temporarily locked due to too many failed attempts. Try again later.",
          },
        },
        { status: 429 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: `Account is ${user.status}. Please contact an administrator.`,
          },
        },
        { status: 403 }
      );
    }

    let passwordValid = false;
    if (user.password_hash) {
      passwordValid = await verifyPassword(rawPassword, user.password_hash);
    }

    if (!passwordValid) {
      await recordFailedAttempt(identifier, 'login');

      await addAudit({
        action: "LOGIN_FAILED",
        userId: user.id,
        userName: user.name || "User",
        role: user.role as Role,
        details: {
          identifier,
          ip: extractClientIp(req),
          userAgent: req.headers.get("user-agent") || "unknown",
          reason: "invalid_password",
          endpoint: "/api/auth/login",
          request_id: getRequestId(req),
        },
      });

      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    await clearLockout(identifier);

    const rolesRes = await query<{ role: string }>(`SELECT role FROM user_roles WHERE user_id = $1`, [user.id]);
    const roles = rolesRes.rows.map(r => r.role);
    if (!roles.includes(user.role)) roles.push(user.role);

    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: roles,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
    });

    // Optional RFC 9449 DPoP proof binding for interactive human sessions
    const dpopHeader = req.headers.get("dpop");
    let cnf: { jkt: string } | undefined = undefined;
    if (dpopHeader) {
      const dpopResult = await verifyDPoPProof(dpopHeader, req.method, req.nextUrl.pathname);
      if (dpopResult.valid && dpopResult.jkt) {
        cnf = { jkt: dpopResult.jkt };
      }
    }

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(cnf ? { cnf } : {}),
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token: access_token,
        refreshToken: refresh_token,
        user: {
          id: user.id,
          unique_id: user.unique_id,
          name: user.name,
          email: user.email,
          role: user.role,
          roles: roles,
          status: user.status,
          department_id: user.department_id,
          gate_id: user.gate_id,
        },
      },
    });

    response.cookies.set("access_token", access_token, secureCookieOptions(req, { maxAge: 3600 }));

    response.cookies.set("refresh_token", refresh_token, secureCookieOptions(req, { maxAge: 7 * 24 * 3600 }));

    return response;
  } catch (error: unknown) {
    const requestId = getRequestId(req);
    const errObj = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error);
    console.error("[login] INTERNAL_ERROR:", JSON.stringify(errObj));
    log.error({
      msg: "login.error",
      route: "/api/auth/login",
      requestId,
      err: errObj,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error during authentication.",
          requestId,
          // DEBUG: surface the real cause until this is removed
          ...(process.env.NODE_ENV !== "production" ? { cause: errObj } : {}),
        },
      },
      { status: 500 }
    );
  }
}

// Structured observability: auto-log the request lifecycle and attach the correlation ID.
const handleLogin = log.wrap("/api/auth/login", handleLoginInner);

export const POST = withRateLimit(handleLogin, {
  keyPrefix: "login",
  maxRequests: 100,
  windowMs: 60 * 1000,
});

