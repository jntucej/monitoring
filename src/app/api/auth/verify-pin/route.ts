import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/auth-token";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";

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

    // Identity is read ONLY from the trusted headers injected by
    // withAuthorization (server-validated token data). The Bearer-token
    // fallback below was removed: client-supplied x-user-* headers can no
    // longer spoof identity because withAuthorization always overwrites them.
    const callerId = req.headers.get("x-user-id");
    const callerRole = req.headers.get("x-user-role");

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

export const POST = withRateLimit(
  withAuthorization(handleVerifyPin, {
    requiredRole: ["student", "operator", "admin", "sysadmin", "supervisor", "staff", "faculty", "guardian", "parent"],
  }),
  {
    keyPrefix: "verify_pin",
    maxRequests: 15,
    windowMs: 60 * 1000,
  }
);
