import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { addAudit, findUserById } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import bcrypt from "bcryptjs";

async function handlePost(req: NextRequest, { auth }: { auth: any }) {
  const userId = auth?.user?.id || req.headers.get("x-user-id");
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

    const supabase = getSupabaseServiceClient();
    const user = await findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User profile not found" } },
        { status: 404 }
      );
    }

    // Verify current password against custom bcrypt hash in supabase auth
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update Supabase Auth user password
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: hashedPassword }
    );

    if (authError) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: authError.message || "Failed to update password" } },
        { status: 500 }
      );
    }

    await addAudit({
      userId,
      action: "PASSWORD_CHANGED",
      details: { timestamp: new Date().toISOString() },
    });

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