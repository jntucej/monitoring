import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth-token";
import { isMfaRequiredForAdmin } from "@/lib/authContext";
import { createEnrollToken } from "@/lib/mfa-enroll";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import bcrypt from "bcryptjs";

const GENERIC_FAILURE = {
  success: false,
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid credentials or user not found.",
  },
};

async function handleLogin(req: NextRequest) {
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

    const { login, email, password, mfa_challenge, totp_code, recovery_code } = body as Record<string, unknown>;
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

    const userRes = await query(
      `SELECT * FROM users 
       WHERE (
         LOWER(email) = LOWER($1) 
         OR UPPER(unique_id) = UPPER($1) 
         OR LOWER(login_identifier) = LOWER($1) 
         OR LOWER(handle) = LOWER($1)
       )
       LIMIT 1`,
      [identifier]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const user = userRes.rows[0];

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
    if (!passwordValid && (user.pin_hash || user.initial_pin_hash)) {
      passwordValid = await verifyPassword(rawPassword, user.pin_hash || user.initial_pin_hash);
    }

    if (!passwordValid) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }
    // ── MFA Verification & Enrollment Enforcement ─────────────────
    const requiresMfa =
      (user.role === "sysadmin" || user.role === "admin") &&
      (await isMfaRequiredForAdmin());

    if (requiresMfa) {
      if (!user.two_factor_enabled) {
        // Not yet enrolled — issue limited enrollment token, do NOT grant session
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

      // User is enrolled — check for second-leg credentials
      const presentedTotp = totp_code ? String(totp_code).trim() : null;
      const presentedRecovery = recovery_code ? String(recovery_code).trim() : null;

      if (!presentedTotp && !presentedRecovery) {
        // Step 1: Issue short-lived challenge for 2nd factor prompt
        const challengeId = crypto.randomUUID();
        const service = getSupabaseServiceClient();
        await service.from("mfa_login_challenges").insert({
          id: challengeId,
          user_id: user.id,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

<<<<<<< Updated upstream
=======
    const requiresMfa = ((user.role === "sysadmin" || user.role === "admin") && (await isMfaRequiredForAdmin())) || user.two_factor_enabled;
    const mfaSecret = user.totp_secret || user.two_factor_secret;
    if (requiresMfa && mfaSecret) {
      if (!body.totp_code) {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

      // Step 2: Validate challenge if provided
      const service = getSupabaseServiceClient();
      if (mfa_challenge) {
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
            { success: false, error: { code: "INVALID_CHALLENGE", message: "MFA challenge expired or invalid." } },
            { status: 400 }
          );
        }
      }

      if (presentedRecovery) {
        const codes: string[] = Array.isArray(user.two_factor_recovery_codes)
          ? user.two_factor_recovery_codes
          : [];
        let matchIdx = -1;
        for (let i = 0; i < codes.length; i++) {
          if (bcrypt.compareSync(presentedRecovery, codes[i])) {
            matchIdx = i;
            break;
          }
        }

        if (matchIdx === -1) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_MFA_CODE", message: "Invalid recovery code." } },
            { status: 401 }
          );
        }

        // Burn the recovery code
        const remaining = [...codes];
        remaining.splice(matchIdx, 1);
        await service
          .from("users")
          .update({ two_factor_recovery_codes: remaining })
          .eq("id", user.id);

        await addAudit({
          action: "MFA_RECOVERY_CODE_USED",
          userId: user.id,
          userName: user.name,
          role: user.role,
          details: `Recovery code used for login. Remaining: ${remaining.length}`,
        });
      } else if (presentedTotp) {
        const { verifyTOTPCode } = await import("@/lib/totp");
        const rawSecret = user.two_factor_secret || user.totp_secret || "";
        let secret = rawSecret;
        try {
          const { decryptSecret } = await import("@/lib/mfa-secret");
          secret = decryptSecret(rawSecret);
        } catch {
          secret = rawSecret;
        }
        const totpValid = verifyTOTPCode(secret, presentedTotp);

        if (!totpValid) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_MFA_CODE", message: "Invalid two-factor authentication code." },
            },
            { status: 401 }
          );
        }

        await addAudit({
          action: "MFA_LOGIN_SUCCESS",
          userId: user.id,
          userName: user.name,
          role: user.role,
          details: "2FA TOTP code verified successfully",
        });
      }
    }

    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      account_status: user.status,
      name: user.name,
    });

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
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
          status: user.status,
          department_id: user.department_id,
          gate_id: user.gate_id,
        },
      },
    });

    response.cookies.set("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600,
      path: "/",
    });

    response.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Login processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error during authentication.",
        },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleLogin, {
  keyPrefix: "login",
  maxRequests: 20,
  windowMs: 60 * 1000,
});

