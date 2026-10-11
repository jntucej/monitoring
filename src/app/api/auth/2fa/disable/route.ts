import { NextRequest, NextResponse } from "next/server";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorizationPreMfa } from "@/middleware/authorization";

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  if (!actorId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { targetUserId, reason } = await req.json().catch(() => ({}));
    
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "targetUserId is required" } },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: { code: "REASON_REQUIRED", message: "A valid reason (min 10 chars) is required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, two_factor_enabled")
      .eq("id", targetUserId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!targetUser.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_DISABLED", message: "2FA is already disabled" } },
        { status: 400 }
      );
    }

    await supabase
      .from("users")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_enrolled_at: null,
        two_factor_recovery_codes: null,
      })
      .eq("id", targetUserId);

    await addAudit({
      userId: actorId,
      action: "2FA_DISABLED",
      details: {
        targetUserId,
        disabledBy: "admin",
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, message: "Two-factor authentication disabled successfully" });
  } catch (error: unknown) {
    console.error("2FA admin disable error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message } }, { status: 500 });
  }
}

export const POST = withRateLimit(
  withAuthorizationPreMfa(handlePost, { requiredRole: ["admin", "sysadmin"] }), 
  { keyPrefix: "2fa_disable_admin", maxRequests: 5, windowMs: 60 * 1000 }
);
