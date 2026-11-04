import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { randomBytes, randomUUID } from "crypto";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signAccessToken, signRefreshToken, verifyPassword, signPasswordResetToken } from "@/lib/auth-token";
import { verifyDPoPProof } from "@/lib/dpop";
import { isHoneytokenIdentifier, triggerDeceptionAlert } from "@/lib/deception";
import { secureCookieOptions } from "@/lib/cookies";
import { addAudit } from "@/lib/db";
import { log, getRequestId } from "@/lib/log";
import { assertCsrf } from "@/lib/csrf";
import type { Role } from "@/lib/types";
import { checkLockout, recordFailedAttempt, clearLockout } from "@/lib/login-lockout";
import { isPrivilegedRole, sendPrivilegedLoginAlert } from "@/lib/privileged-alert";
import { passwordIsExpired, passwordAgeDays } from "@/lib/password-policy";
import { ipAllowed } from "@/lib/ip-allowlist";
import { newDeviceId, deviceCookieOptions } from "@/lib/device-binding";

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

    // M6: per-user IP allowlist. Enforced only when IP_ALLOWLIST_ENFORCED=true
    // and the user has a non-empty allowed_cidrs. Same INVALID_CREDENTIALS
    // response as a wrong password — no account/IP oracle.
    if (process.env.IP_ALLOWLIST_ENFORCED === "true") {
      const srcIp = extractClientIp(req);
      const cidrs = user.allowed_cidrs as string[] | null;
      if (!ipAllowed(srcIp, cidrs)) {
        await addAudit({
          action: "IP_BLOCKED",
          userId: user.id,
          userName: user.email,
          role: user.role as Role,
          details: { ip: srcIp, cidrs: cidrs ?? null, identifier },
        });
        return NextResponse.json(GENERIC_FAILURE, { status: 401 });
      }
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

    // M3: force password rotation for privileged roles whose password is
    // older than the policy max (90 days). A short-lived reset token lets
    // the user set a new password immediately without being locked out.
    if (passwordIsExpired(user.last_password_change, user.role)) {
      const ageDays = passwordAgeDays(user.last_password_change);
      await addAudit({
        action: "PASSWORD_CHANGE_REQUIRED",
        userId: user.id,
        userName: user.email,
        role: user.role as Role,
        details: { ageDays, endpoint: "/api/auth/login" },
      });
      const resetToken = await signPasswordResetToken(user.id, user.email);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PASSWORD_EXPIRED",
            message: "Your password has expired. Set a new one to continue.",
            resetToken,
          },
        },
        { status: 403 },
      );
    }

    // L1g: if the user is MFA-required, do NOT issue a session token.
    // Return a short-lived one-use challenge that the passkey/TOTP verify
    // handler consumes atomically (mfa_challenges table). An attacker who
    // has the password still cannot mint a session without the second factor.
    if (user.mfa_required === true || user.mfa_required === "true" || user.mfa_required === "t") {
      const pkRes = await query("SELECT 1 FROM user_passkeys WHERE user_id = $1 LIMIT 1", [user.id]);
      if (pkRes.rows.length === 0 && !user.totp_secret_hash) {
        // First login with MFA required but not enrolled → force enrollment.
        // The registration options route is reachable (withAuthorization, not
        // the MFA-gated session), so the user can enroll and complete login.
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MFA_ENROLMENT_REQUIRED",
              message: "Set up a passkey to continue.",
            },
          },
          { status: 403 },
        );
      }
      const challenge = randomUUID();
      await query(
        `INSERT INTO mfa_challenges (id, user_id, method, expires_at)
         VALUES ($1, $2, 'webauthn', NOW() + INTERVAL '5 min')`,
        [challenge, user.id],
      );
      await addAudit({
        action: "MFA_CHALLENGE_CREATED",
        userId: user.id,
        userName: user.name || user.email,
        role: user.role as Role,
        details: { identifier, ip: extractClientIp(req) },
      });
      return NextResponse.json({
        success: true,
        data: {
          mfa_required: true,
          mfaChallenge: challenge,
          userId: user.id,
          methods: ["passkey", ...(user.totp_secret_hash ? ["totp"] : [])],
        },
      });
    }

    const rolesRes = await query<{ role: string }>(`SELECT role FROM user_roles WHERE user_id = $1`, [user.id]);
    const roles = rolesRes.rows.map(r => r.role);
    if (!roles.includes(user.role)) roles.push(user.role);

    // M4: device binding — mint a fresh device-id cookie (or reuse the one
    // the client already presented) and embed its SHA-256 in the access JWT
    // as the `dh` claim. The auth layer verifies the presented cookie
    // against the claim on every request; kiosk tokens carry no dh claim.
    const existingDeviceCookie = req.cookies.get("device_id")?.value;
    const deviceId = existingDeviceCookie ?? newDeviceId().raw;
    const shouldSetDeviceCookie = !existingDeviceCookie;

    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: roles,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
      device_id: deviceId, // → dh claim (SHA-256 hex) in the token
    });

    // M2: privileged login alert — fire-and-forget, never blocks the response.
    const clientIp = extractClientIp(req);
    if (isPrivilegedRole(user.role)) {
      void sendPrivilegedLoginAlert({
        userId: user.id,
        email: user.email,
        name: user.name ?? user.email,
        role: user.role,
        sessionId: user.id, // user id is the session identifier (stateless JWT)
        ip: clientIp,
        userAgent: req.headers.get("user-agent") ?? null,
      });
    }

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

    // Part 6 — session family: mint a fresh family id and persist the
    // refresh row BEFORE the token leaves the server. The family is the
    // unit of revocation: reuse detection and logout both operate on it.
    const newSessionId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const refreshHash = crypto.createHash("sha256").update(refresh_token).digest("hex");
    try {
      await query(
        `INSERT INTO public.sessions
           (id, user_id, refresh_hash, expires_at, created_at, family_id, parent_id)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW(), $4, NULL)`,
        [newSessionId, user.id, refreshHash, familyId]
      );
      await addAudit({
        action: "SESSION_FAMILY_CREATED",
        userId: user.id,
        userName: user.name || user.email,
        role: user.role as Role,
        details: { familyId },
      });
    } catch (err) {
      // Failing to persist the session row must NOT block a successful
      // password verification: the refresh flow still works for this user,
      // but reuse-detection will treat the unknown hash as "unknown" and
      // return 401 rather than minting a new pair. Log and continue.
      console.error("[login] session family persist failed:", err);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        token: access_token,
        refreshToken: refresh_token,
        // When a credential was set by an admin/seed (password_must_change),
        // the client must route the user through a password change.
        mustChangePassword: Boolean(user.password_must_change),
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

    // M4: set the device-id cookie when this login minted a new one.
    if (shouldSetDeviceCookie) {
      response.cookies.set(deviceCookieOptions(deviceId, req));
    }

    return response;
  } catch (error: unknown) {
    const requestId = getRequestId(req);
    // §11: log only the error NAME — never the full message/stack — because
    // some library errors embed request-derived text (e.g. a JWT with a
    // user-supplied claim, or a bcrypt error quoting the input) and that
    // text can carry a credential. The full stack is kept server-side in
    // the console.error line below (log-to-disk, not wire, not structured
    // store).
    const errName = error instanceof Error ? error.name : "UnknownError";
    console.error("[login] INTERNAL_ERROR:", error instanceof Error ? error.stack : String(error));
    log.error({
      msg: "login.error",
      route: "/api/auth/login",
      requestId,
      err: errName,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error during authentication.",
          requestId,
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

