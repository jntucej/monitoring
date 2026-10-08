import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyPassword, verifyAccessToken } from "@/lib/auth-token";
import { assertCsrf } from "@/lib/csrf";

const INVALID_PIN = {
  success: false,
  verified: false,
  error: { code: "INVALID_CREDENTIALS", message: "Invalid identifier or PIN" },
};

async function handleVerifyPin(req: NextRequest) {
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

    let callerId = req.headers.get("x-user-id");
    let callerRole = req.headers.get("x-user-role");

    if (!callerId) {
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.headers.get("x-session-token");
      if (bearerToken) {
        const payload = await verifyAccessToken(bearerToken);
        if (payload?.sub) {
          callerId = payload.sub;
          callerRole = payload.role;
        }
      }
    }

    if (!callerId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required to verify PIN." } },
        { status: 401 }
      );
    }

    const { employeeId, login, identifier, pin } = body as Record<string, unknown>;
    const rawId = (employeeId || login || identifier || callerId || "") as string;
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
      `SELECT id, unique_id, email, pin_hash, initial_pin_hash, password_hash, status FROM users 
       WHERE (
         id::text = $1
         OR UPPER(unique_id) = UPPER($1) 
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

    const isPrivileged = callerRole === "operator" || callerRole === "admin" || callerRole === "sysadmin" || callerRole === "supervisor";
    if (!isPrivileged && callerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot verify PIN for another user." } },
        { status: 403 }
      );
    }

    // Verify PIN against pin_hash or initial_pin_hash (never password_hash)
    let pinValid = false;
    if (user.pin_hash) {
      pinValid = await verifyPassword(cleanPin, user.pin_hash);
    }
    if (!pinValid && user.initial_pin_hash) {
      pinValid = await verifyPassword(cleanPin, user.initial_pin_hash);
    }

    if (!pinValid) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    // Return verification result ONLY — do not issue new auth tokens
    return NextResponse.json(
      {
        success: true,
        verified: true,
        userId: user.id,
        message: "PIN verified successfully.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleVerifyPin, {
  keyPrefix: "verify_pin",
  maxRequests: 15,
  windowMs: 60 * 1000,
});
