import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { verifyAuthToken, signAccessToken, signRefreshToken } from "@/lib/auth-token";

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get("refresh_token")?.value;

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
      if (body && typeof body === "object" && body.refresh_token) {
        token = String(body.refresh_token);
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

    const payload = await verifyAuthToken(token);
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
  } catch (err: any) {
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
