import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth-token";
import { isMfaRequiredForAdmin } from "@/lib/authContext";
import { createEnrollToken } from "@/lib/mfa-enroll";
import { verifyTOTPCode } from "@/lib/totp";
import { decryptSecret } from "@/lib/mfa-secret";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { checkLockout, recordFailedAttempt, clearLockout } from "@/lib/login-lockout";
import type { Role } from "@/lib/types";

const INVALID_CREDENTIALS = {
  success: false,
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid identifier or PIN.",
  },
};

const ALLOWED_PIN_ROLES: Role[] = ["operator", "staff", "worker", "faculty"];

async function handlePinLogin(req: NextRequest) {
  // 1. CSRF Protection: check Origin against Host for state-changing POST
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be JSON." } },
        { status: 400 }
      );
    }

    const { employeeId, login, identifier, pin, totp_code, totpCode, mfa_challenge } = body as Record<string, unknown>;
    const rawId = ((employeeId || login || identifier || "") as string);
    const rawPin = ((pin || "") as string);

    if (!rawId.trim() || !rawPin.trim() || !/^\d{4,8}$/.test(rawPin.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PIN", message: "Identifier and valid 4-8 digit PIN are required." },
        },
        { status: 400 }
      );
    }

    const cleanId = rawId.trim();
    const cleanPin = rawPin.trim();
    const normalizedId = cleanId.toUpperCase();

    // 2. Check global lockout using unified service
    const lockout = await checkLockout(normalizedId);
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

    // 3. Query active user restricted to non-privileged roles ONLY
    const userRes = await query(
      `SELECT id, unique_id, email, name, role, status,
              pin_hash, initial_pin_hash, pin_must_change,
              two_factor_enabled, two_factor_secret,
              failed_login_count, locked_until,
              department_id, photo_url
         FROM users 
        WHERE (
          UPPER(unique_id) = UPPER($1) 
          OR LOWER(email) = LOWER($1) 
          OR LOWER(login_identifier) = LOWER($1)
          OR LOWER(handle) = LOWER($1)
        ) 
          AND status = 'ACTIVE'
          AND role = ANY($2::text[])
        LIMIT 1`,
      [cleanId, ALLOWED_PIN_ROLES]
    );

    const user = userRes.rows[0];

    // Check per-user account lockout
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "LOCKED",
            message: "Too many failed attempts. Try again later.",
          },
        },
        { status: 429 }
      );
    }

    // 4. Verify PIN: ONLY pin_hash and initial_pin_hash (NEVER password_hash!)
    let pinValid = false;
    if (user) {
      if (user.pin_hash) {
        pinValid = await verifyPassword(cleanPin, user.pin_hash);
      }
      if (!pinValid && user.initial_pin_hash) {
        pinValid = await verifyPassword(cleanPin, user.initial_pin_hash);
      }
    }

    // 5. Handle Failure
    if (!user || !pinValid) {
      await recordFailedAttempt(normalizedId, 'pin-login');

      // Increment per-user account failed login count if user exists
      if (user) {
        await query(
          `UPDATE users
              SET failed_login_count = failed_login_count + 1,
                  locked_until = CASE
                    WHEN failed_login_count + 1 >= 5
                    THEN NOW() + INTERVAL '15 minutes'
                    ELSE locked_until
                  END
            WHERE id = $1`,
          [user.id]
        );
      }

      await addAudit({
        action: "PIN_LOGIN_FAILED",
        userId: user?.id || "system",
        userName: user?.name || "System",
        role: (user?.role as Role) || "operator",
        details: {
          identifier: cleanId, // DO NOT log the PIN
          ip: extractClientIp(req),
          userAgent: req.headers.get("user-agent") || "unknown",
          reason: !user ? "user_not_found_or_not_permitted" : "invalid_pin",
          endpoint: "/api/auth/pin-login",
        },
      });

      return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
    }

    // 6. Handle Success: Clear lockout counters
    await clearLockout(normalizedId);
    await query(
      `UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1`,
      [user.id]
    );

    // 7. Defensive MFA check: if user has 2FA enabled, enforce TOTP verification
    const requiresMfa = Boolean(user.two_factor_enabled) || (
      (user.role === "sysadmin" || user.role === "admin") && (await isMfaRequiredForAdmin())
    );

    if (requiresMfa) {
      if (!user.two_factor_enabled) {
        const enrollToken = await createEnrollToken(user.id);
        return NextResponse.json(
          {
            success: true,
            mfa_enrollment_required: true,
            enroll_token: enrollToken,
            expires_in: 600,
          },
          { status: 200 }
        );
      }

      const presentedTotp = (totp_code || totpCode) ? String(totp_code || totpCode).trim() : null;
      if (!presentedTotp) {
        const challengeId = crypto.randomUUID();
        const service = getSupabaseServiceClient();
        await service.from("mfa_login_challenges").insert({
          id: challengeId,
          user_id: user.id,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

        return NextResponse.json(
          {
            success: true,
            mfa_required: true,
            mfa_challenge: challengeId,
            user_id: user.id,
            expires_in: 300,
            message: "TOTP 2FA verification required.",
          },
          { status: 200 }
        );
      }

      // If an MFA challenge ID was presented, burn it (single-use validation)
      if (mfa_challenge) {
        const service = getSupabaseServiceClient();
        const { data: burned } = await service
          .from("mfa_login_challenges")
          .update({ used_at: new Date().toISOString() })
          .eq("id", String(mfa_challenge))
          .eq("user_id", user.id)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("id");

        if (!burned || (Array.isArray(burned) && burned.length === 0)) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_MFA_CHALLENGE", message: "MFA challenge expired or already consumed. Please restart login." },
            },
            { status: 401 }
          );
        }
      }

      if (!user.two_factor_secret) {
        return NextResponse.json(
          { success: false, error: { code: "MFA_ERROR", message: "2FA secret configuration missing." } },
          { status: 500 }
        );
      }

      const secret = decryptSecret(user.two_factor_secret);
      const validTotp = verifyTOTPCode(secret, presentedTotp);
      if (!validTotp) {
        await addAudit({
          action: "PIN_LOGIN_FAILED",
          userId: user.id,
          userName: user.name,
          role: user.role as Role,
          details: {
            identifier: cleanId,
            ip: extractClientIp(req),
            reason: "invalid_mfa_code",
            endpoint: "/api/auth/pin-login",
          },
        });
        return NextResponse.json(
          { success: false, error: { code: "INVALID_MFA_CODE", message: "Invalid two-factor authentication code." } },
          { status: 401 }
        );
      }
    }
    const rolesRes = await query<{ role: string }>(`SELECT role FROM user_roles WHERE user_id = $1`, [user.id]);
    const roles = rolesRes.rows.map(r => r.role);
    if (!roles.includes(user.role)) roles.push(user.role);

    // 8. Generate Tokens
    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
          roles: roles,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
    });

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
          roles: roles,
    });

    // 9. Audit Success
    await addAudit({
      action: "PIN_LOGIN_SUCCESS",
      userId: user.id,
      userName: user.name,
      role: user.role as Role,
      details: {
        identifier: cleanId,
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent") || "unknown",
        endpoint: "/api/auth/pin-login",
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          token: access_token,
          refreshToken: refresh_token,
          pin_must_change: Boolean(user.pin_must_change),
          user: {
            id: user.id,
            uniqueId: user.unique_id,
            name: user.name,
            email: user.email,
            role: user.role,
          roles: roles,
            status: user.status,
            department: user.department_id,
            photoUrl: user.photo_url,
          },
        },
        access_token,
        refresh_token,
        expires_in: 3600,
        token_type: "Bearer",
      },
      { status: 200 }
    );

    response.cookies.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });

    response.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err: unknown) {
    console.error("[PIN Login Route Error]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "PIN login failed." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePinLogin, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "pin_login_limit",
});

