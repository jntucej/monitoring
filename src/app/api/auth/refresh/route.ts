import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { query, findUserById, getSessionByRefreshToken, invalidateSessions } from "@/lib/db-postgres";
import { SignJWT } from "jose";
import { getSigningKey } from "@/lib/qr-token";
import { logAuditEvent } from "@/lib/audit";

const GENERIC_FAILURE = {
  success: false,
  error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
};

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    
    if (!refreshToken) {
      return NextResponse.json(GENERIC_FAILURE, { status: 400 });
    }

    // Validate refresh token and get associated session
    const session = await getSessionByRefreshToken(refreshToken);
    if (!session) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Get user profile
    const user = await findUserById(session.user_id);
    if (!user) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Generate new access token (1 hour expiry)
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + 3600;

    const tokenPayload = {
      sub: user.id,
      email: user.email || "",
      role: user.role,
      iat: now,
      exp: accessTokenExpiry,
    };

    const signingKey = getSigningKey();
    const access_token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(signingKey);

    // Generate new refresh token for future use
    const newRefreshToken = randomUUID();
    const newRefreshTokenExpiry = now + 60 * 60 * 24 * 30; // 30 days

    // Update session with new refresh token
    await query(
      `UPDATE sessions SET refresh_token = $1, expires_at = $2 WHERE session_token = $3`,
      [newRefreshToken, new Date(newRefreshTokenExpiry * 1000), session.session_token]
    );

    // Log refresh token usage
    await logAuditEvent({
      action: "SESSION_REFRESHED",
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: { oldToken: refreshToken, newToken: newRefreshToken },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    }).catch(() => {});

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60, // 1 hour
    };

    const refreshCookieOptions = { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }; // 30 days

    const response = NextResponse.json({
      success: true,
      data: {
        token: access_token,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      expires_in: 3600,
      token_type: "Bearer",
    });

    response.cookies.set("session-token", access_token, cookieOptions);
    response.cookies.set("refresh-token", newRefreshToken, refreshCookieOptions);
    
    return response;
  } catch (err) {
    console.error("Refresh route error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}