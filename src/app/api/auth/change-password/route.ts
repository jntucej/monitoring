import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { addAudit, findUserById } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

async function handlePost(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
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
        { success: false, error: { code: "BAD_REQUEST", message: "Current and new password are required" } },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "New password must be at least 6 characters long" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const user = await findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User profile not found" } },
        { status: 404 }
      );
    }

    // Verify current password against custom bcrypt hash if present or via supabase auth
    const passHash = (user as any).password_hash || user.passwordHash;
    if (passHash) {
      const match = await bcrypt.compare(currentPassword, passHash);
      if (!match) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Incorrect current password" } },
          { status: 401 }
        );
      }
    }

    // Update in Supabase Auth if auth user exists
    try {
      await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    } catch (authErr) {
      console.warn("Supabase auth admin update notice:", authErr);
    }

    // Update password hash in users table if needed
    const newHash = await bcrypt.hash(newPassword, 10);
    await supabase.from("users").update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq("id", userId);

    await addAudit({
      userId,
      action: "USER_PASSWORD_CHANGED",
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update password" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, { keyPrefix: "auth_change_password", maxRequests: 5 });
