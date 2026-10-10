/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { query, verifyPassword, updatePasswordHash } from "@/lib/db-postgres";
import { logAuditEvent } from "@/lib/audit";

async function handlePost(req: NextRequest, { auth }: { auth: any }) {
  const userId = auth?.userId || auth?.user?.id || req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { currentPassword, newPassword } = await req.json().catch(() => ({}));

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Current and new password required" } },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "New password must be at least 6 characters long" } },
        { status: 400 }
      );
    }

    // Verify current password against hash stored in users table
    const passwordValid = await verifyPassword(userId, currentPassword);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Incorrect current password" } },
        { status: 401 }
      );
    }

    // Hash new password and update in database
    const hashedPassword = await (await import("bcryptjs")).default.hash(newPassword, 12);
    await updatePasswordHash(userId, hashedPassword);
    await query(`UPDATE users SET last_password_change = NOW(), updated_at = NOW() WHERE id = $1`, [userId]).catch(() => {});

    await logAuditEvent({
      action: "PASSWORD_CHANGED",
      userId: userId,
      userName: null,
      userRole: null,
      details: { timestamp: new Date().toISOString() },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Password successfully changed",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(withAuthorization(handlePost));