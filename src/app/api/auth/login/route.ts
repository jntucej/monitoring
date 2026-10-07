import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth-token";
import { isMfaRequiredForAdmin } from "@/lib/authContext";

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
    if (!passwordValid && user.password_hash === rawPassword) {
      passwordValid = true;
    }

    if (!passwordValid) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const requiresMfa = (user.role === "sysadmin" || user.role === "admin") && (await isMfaRequiredForAdmin());
    if (requiresMfa && user.totp_secret && !body.totp_code) {
      return NextResponse.json(
        {
          success: true,
          mfa_required: true,
          user_id: user.id,
          message: "TOTP 2FA verification required.",
        },
        { status: 200 }
      );
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

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    const response = NextResponse.json(
      {
        success: true,
        data: {
          token: access_token,
          refreshToken: refresh_token,
          user: {
            id: user.id,
            uniqueId: user.unique_id,
            name: user.name,
            email: user.email,
            role: user.role,
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

    response.cookies.set("access_token", access_token, { ...cookieOptions, maxAge: 3600 });
    response.cookies.set("session-token", access_token, { ...cookieOptions, maxAge: 3600 });
    response.cookies.set("refresh_token", refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 3600 });
    response.cookies.set("refresh-token", refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 3600 });

    return response;
  } catch (err: any) {
    console.error("[Login Route Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleLogin, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "login_limit",
});
