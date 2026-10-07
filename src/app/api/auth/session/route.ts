import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { verifyAccessToken, verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { withRateLimit } from "@/lib/rate-limit";

async function handleSessionCheck(req: NextRequest) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      token = req.cookies.get("access_token")?.value;
    }

    if (!token) {
      token = req.headers.get("x-session-token") || undefined;
    }

    const refreshToken =
      req.cookies.get("refresh_token")?.value ||
      req.headers.get("x-refresh-token") ||
      undefined;

    let payload = token ? await verifyAccessToken(token) : null;
    let newToken: string | undefined;
    let newRefreshToken: string | undefined;

    // If access token is expired/invalid, try refreshing using refresh token
    if (!payload && refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload && refreshPayload.sub) {
        payload = refreshPayload;
        newToken = await signAccessToken({
          sub: refreshPayload.sub,
          email: refreshPayload.email,
          role: refreshPayload.role,
        });
        newRefreshToken = await signRefreshToken({
          sub: refreshPayload.sub,
          email: refreshPayload.email,
          role: refreshPayload.role,
        });
      }
    }

    if (!payload || !payload.sub) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or missing session." },
        },
        { status: 401 }
      );
    }

    const userRes = await query(
      "SELECT id, unique_id, email, name, role, status, department_id, photo_url, supervised_gates, assigned_hostel FROM users WHERE id = $1 LIMIT 1",
      [payload.sub]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User account not found." },
        },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ACCOUNT_INACTIVE", message: `User account is ${user.status}.` },
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        uniqueId: user.unique_id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        departmentId: user.department_id,
        photoUrl: user.photo_url,
        supervisedGates: user.supervised_gates,
        assignedHostel: user.assigned_hostel,
      },
      ...(newToken ? { accessToken: newToken } : {}),
      ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
    });

    if (newToken) {
      const isProd = process.env.NODE_ENV === "production";
      response.cookies.set("access_token", newToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
      if (newRefreshToken) {
        response.cookies.set("refresh_token", newRefreshToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 3600,
        });
      }
    }

    return response;
  } catch (error: unknown) {
    console.error("[Auth:Session] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to validate session." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleSessionCheck, {
  keyPrefix: "auth_session",
  maxRequests: 120,
  windowMs: 60 * 1000,
});
