import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit } from "@/lib/rate-limit";
import { signAccessToken, signRefreshToken, verifyPassword } from "@/lib/auth-token";

const INVALID_PIN = {
  success: false,
  error: { code: "INVALID_CREDENTIALS", message: "Invalid identifier or PIN" },
};

async function handlePinLogin(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be JSON." } },
        { status: 400 }
      );
    }

    const { employeeId, login, identifier, pin } = body as Record<string, unknown>;
    const rawId = (employeeId || login || identifier || "") as string;
    const rawPin = (pin || "") as string;

    if (!rawId.trim() || !rawPin.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_FIELDS", message: "Both identifier and PIN are required." },
        },
        { status: 400 }
      );
    }

    const cleanId = rawId.trim();
    const cleanPin = rawPin.trim();

    // Query active user
    const userRes = await query(
      `SELECT * FROM users 
       WHERE (
         UPPER(unique_id) = UPPER($1) 
         OR LOWER(email) = LOWER($1) 
         OR LOWER(login_identifier) = LOWER($1)
         OR LOWER(handle) = LOWER($1)
       ) 
       AND status = 'ACTIVE' 
       LIMIT 1`,
      [cleanId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    const user = userRes.rows[0];

    // Verify PIN against pin_hash, initial_pin_hash, or password_hash
    let pinValid = false;
    if (user.pin_hash) {
      pinValid = await verifyPassword(cleanPin, user.pin_hash);
    }
    if (!pinValid && user.initial_pin_hash) {
      pinValid = await verifyPassword(cleanPin, user.initial_pin_hash);
    }
    if (!pinValid && user.password_hash) {
      pinValid = await verifyPassword(cleanPin, user.password_hash);
    }


    if (!pinValid) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    // Generate tokens
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
