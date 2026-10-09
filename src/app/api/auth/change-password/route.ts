import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { hashPassword, verifyPassword } from "@/lib/auth-token";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

async function handleChangePassword(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  try {
    const userId = auth?.userId || req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON." } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = body as Record<string, string>;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Both current and new password are required." } },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PASSWORD", message: "New password must be at least 6 characters long." } },
        { status: 400 }
      );
    }

    const userRes = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    const user = userRes.rows[0];

    let valid = false;
    if (user.password_hash) {
      valid = await verifyPassword(currentPassword, user.password_hash);
    }


    if (!valid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect." } },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    // Bug 104: changing a password must invalidate every existing session —
    // otherwise a compromised token keeps working for up to its TTL. Mirror the
    // proven /api/auth/reset-password pattern (bump session_version + revoke rows).
    await query(
      "UPDATE users SET password_hash = $1, session_version = COALESCE(session_version, 0) + 1, last_password_change = NOW() WHERE id = $2",
      [newHash, userId]
    );
    await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1", [userId]).catch(() => {});

    try {
      await addAudit({
        action: "PASSWORD_CHANGE",
        userId,
        details: { userId, email: user.email },
      });
    } catch (auditErr) {
      console.warn("Failed to write audit log for password change:", auditErr);
    }

    return NextResponse.json(
      { success: true, message: "Password updated successfully." },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[Change Password Error]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update password." } },
      { status: 500 }
    );
  }
}

export const POST = withAuthorization(
  withRateLimit(handleChangePassword, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: "change_pwd_limit",
  })
);
