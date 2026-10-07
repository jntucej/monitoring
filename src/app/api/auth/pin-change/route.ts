import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/postgres";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { verifyPassword } from "@/lib/auth-token";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const TRIVIAL_PINS = new Set([
  "1234", "12345", "123456", "1234567", "12345678",
  "0000", "00000", "000000", "0000000", "00000000",
  "1111", "11111", "111111", "1111111", "11111111",
  "9999", "99999", "999999", "9999999", "99999999",
]);

async function handlePinChange(req: NextRequest, context: { auth: AuthContext }) {
  // 1. CSRF Protection
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;

  const userId = context.auth.userId;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Request body must be JSON." } },
        { status: 400 }
      );
    }

    const { currentPin, newPin, pin } = body as Record<string, unknown>;
    const targetPin = String(newPin || pin || "").trim();
    const existingPin = currentPin ? String(currentPin).trim() : null;

    if (!targetPin) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "New PIN is required." } },
        { status: 400 }
      );
    }

    // Validate PIN format: 4 to 8 digits numeric
    if (!/^\d{4,8}$/.test(targetPin)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PIN_FORMAT", message: "PIN must be between 4 and 8 numeric digits." } },
        { status: 400 }
      );
    }

    // Reject trivially weak PINs
    if (TRIVIAL_PINS.has(targetPin)) {
      return NextResponse.json(
        { success: false, error: { code: "WEAK_PIN", message: "PIN is too common or easily guessed. Choose a different PIN." } },
        { status: 400 }
      );
    }

    // Fetch user PIN hashes
    const userRes = await query(
      `SELECT id, email, name, role, pin_hash, initial_pin_hash, pin_must_change FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    // If user has an existing established PIN and pin_must_change is FALSE, verify current PIN
    if (user.pin_hash && !user.pin_must_change) {
      if (!existingPin) {
        return NextResponse.json(
          { success: false, error: { code: "CURRENT_PIN_REQUIRED", message: "Current PIN is required to change PIN." } },
          { status: 400 }
        );
      }

      const validCurrent = await verifyPassword(existingPin, user.pin_hash);
      if (!validCurrent) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CURRENT_PIN", message: "Current PIN is incorrect." } },
          { status: 401 }
        );
      }
    }

    // Hash new PIN with bcrypt
    const newPinHash = await bcrypt.hash(targetPin, 10);

    // Update user record: set pin_hash, clear initial_pin_hash & pin_must_change, record actor & timestamp
    await query(
      `UPDATE users
          SET pin_hash = $1,
              initial_pin_hash = NULL,
              pin_must_change = FALSE,
              pin_set_at = NOW(),
              pin_set_by = $2
        WHERE id = $3`,
      [newPinHash, userId, userId]
    );

    await addAudit({
      action: "PIN_CHANGED",
      userId: user.id,
      userName: user.name || user.email,
      role: (user.role as Role) || "operator",
      details: {
        ip: extractClientIp(req),
        userAgent: req.headers.get("user-agent") || "unknown",
        changed_by: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "PIN updated successfully.",
    });
  } catch (err: unknown) {
    console.error("[PIN Change Route Error]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update PIN." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePinChange),
  { keyPrefix: "pin_change", maxRequests: 5, windowMs: 15 * 60 * 1000 }
);
