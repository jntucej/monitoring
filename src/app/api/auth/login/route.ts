/**
 * POST /api/auth/login
 * Native PostgreSQL authentication — no Supabase dependency.
 * Credentials verified via bcrypt against password_hash stored in users table.
 * Issues JWT access token + opaque refresh token stored in sessions table.
 * Rate limited: 5 attempts / 15 min / IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { findUserByLoginIdentifier, createSession, query, verifyPassword } from "@/lib/db-postgres";
import { SignJWT } from "jose";
import { getSigningKey } from "@/lib/qr-token";
import { logAuditEvent } from "@/lib/audit";

const GENERIC_FAILURE = {
  success: false,
  error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials or user not found." },
};

async function resolveIdentifierToUser(login: string): Promise<any | null> {
  try {
    // Try login_identifier (employee ID, roll number, etc.)
    const user = await findUserByLoginIdentifier(login.toLowerCase().trim());
    if (user) return user;

    // Also try by unique_id (uppercase)
    const user2 = await findUserByLoginIdentifier(login.toUpperCase().trim());
    if (user2) return user2;

    // Also try by email
    const { rows } = await query(
      "SELECT u.*, ed.*, sd.* FROM users u LEFT JOIN employee_details ed ON u.id = ed.user_id LEFT JOIN student_details sd ON u.id = sd.user_id WHERE u.email = $1 AND u.status = 'ACTIVE'",
      [login.toLowerCase().trim()]
    );
    return rows[0] || null;
  } catch (resolveErr) {
    console.error("Identifier resolution error:", resolveErr);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json(GENERIC_FAILURE, { status: 400 });
    }

    // Normalize password (trim)
    const normalizedPassword = password.trim();
    if (!normalizedPassword) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Resolve user by identifier
    const profile = await resolveIdentifierToUser(login.trim());
    if (!profile) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Verify password against bcrypt hash stored in users table
    const passwordValid = await verifyPassword(profile.id, normalizedPassword);
    if (!passwordValid) {
      // Log failed attempt
      await logAuditEvent({
        action: "LOGIN_FAILED",
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        details: { reason: "invalid_password", login: login.trim() },
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      }).catch(() => {});
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    if (profile.status !== "ACTIVE") {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Generate tokens
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + 3600; // 1 hour
    const refreshToken = randomUUID();
    const refreshTokenExpiry = now + 60 * 60 * 24 * 30; // 30 days

    const tokenPayload = {
      sub: profile.id,
      email: profile.email || "",
      role: profile.role,
      iat: now,
      exp: accessTokenExpiry,
    };

    const signingKey = getSigningKey();
    const access_token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(signingKey);

    // Store session in database
    await createSession({
      user_id: profile.id,
      session_token: access_token,
      refresh_token: refreshToken,
      expires_at: new Date(accessTokenExpiry * 1000),
      created_at: new Date(now * 1000),
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    // Log successful login
    await logAuditEvent({
      action: "LOGIN",
      userId: profile.id,
      userName: profile.name,
      userRole: profile.role,
      details: { login: login.trim() },
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

    const response = NextResponse.json({
      success: true,
      data: {
        token: access_token,
        refreshToken: refreshToken,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
        },
      },
      expires_in: 3600,
      token_type: "Bearer",
    });

    response.cookies.set("session-token", access_token, cookieOptions);

    const refreshCookieOptions = { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }; // 30 days
    response.cookies.set("refresh-token", refreshToken, refreshCookieOptions);

    return response;
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}