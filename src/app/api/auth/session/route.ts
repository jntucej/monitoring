import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { verifyAuthToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";
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

    let refreshToken = req.cookies.get("refresh_token")?.value || req.headers.get("x-refresh-token") || undefined;

    let payload = token ? await verifyAuthToken(token) : null;
    let newToken: string | undefined;
    let newRefreshToken: string | undefined;

    // If access token is expired/invalid, try refreshing using refresh token
    if (!payload && refreshToken) {
      const refreshPayload = await verifyAuthToken(refreshToken);
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
          error: { code: "UNAUTHORIZED", message: "Authentication required or session expired." },
        },
        { status: 401 }
      );
    }

    const userRes = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [payload.sub]);

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User profile not found." },
        },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ACCOUNT_INACTIVE", message: `Account status is ${user.status}.` },
        },
        { status: 403 }
      );
    }

    const responseUser = {
      id: user.id,
      uniqueId: user.unique_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department_id,
      photoUrl: user.photo_url,
    };

    const finalToken = newToken || token || "";
    const finalRefreshToken = newRefreshToken || refreshToken || null;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          token: finalToken,
          refreshToken: finalRefreshToken,
          user: responseUser,
        },
        user: responseUser,
      },
      { status: 200 }
    );

    if (newToken) {
      response.cookies.set("access_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });
    }

    if (newRefreshToken) {
      response.cookies.set("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 3600,
      });
    }

    return response;
  } catch (err: any) {
    console.error("[Session Route Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to verify session." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleSessionCheck, {
  windowMs: 60 * 1000,
  maxRequests: 120,
  keyPrefix: "session_check",
});
