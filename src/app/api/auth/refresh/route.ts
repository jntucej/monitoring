import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/postgres";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";

async function handleRefresh(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  try {
    let token = req.cookies.get("refresh_token")?.value || req.cookies.get("refresh-token")?.value;

    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      token = req.headers.get("x-refresh-token") || undefined;
    }

    if (!token) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object" && (body as Record<string, unknown>).refresh_token) {
        token = String((body as Record<string, unknown>).refresh_token);
      } else if (body && typeof body === "object" && (body as Record<string, unknown>).refreshToken) {
        token = String((body as Record<string, unknown>).refreshToken);
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_TOKEN", message: "No refresh token provided." },
        },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token." },
        },
        { status: 401 }
      );
    }

    const userRes = await query("SELECT * FROM users WHERE id = $1 AND status = 'ACTIVE' LIMIT 1", [
      payload.sub,
    ]);

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User is no longer active." },
        },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    // Refresh token rotation and reuse detection
    const oldTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const existingSession = await query(
      "SELECT id, revoked_at FROM sessions WHERE refresh_hash = $1 LIMIT 1",
      [oldTokenHash]
    ).catch(() => ({ rows: [] }));

    if (existingSession.rows.length > 0 && existingSession.rows[0].revoked_at) {
      // Reuse of revoked refresh token detected: revoke all user sessions
      await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1", [payload.sub]).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          error: { code: "TOKEN_REVOKED", message: "Refresh token has been revoked." },
        },
        { status: 401 }
      );
    }

    // Revoke old session token
    await query("UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = $1", [oldTokenHash]).catch(() => {});

    const access_token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      account_status: user.status,
      name: user.name,
      session_version: user.session_version ?? 0,
    });

    const refresh_token = await signRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Record new rotated session
    const newTokenHash = crypto.createHash("sha256").update(refresh_token).digest("hex");
    await query(
      "INSERT INTO sessions (id, user_id, refresh_hash, expires_at, created_at) VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW())",
      [crypto.randomUUID(), user.id, newTokenHash]
    ).catch(() => {});

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
  } catch (err: unknown) {
    console.error("[Refresh Route Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred during token refresh." },
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleRefresh, {
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: "refresh_limit",
});
