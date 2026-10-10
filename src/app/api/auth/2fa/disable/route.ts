import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { decryptSecret } from "@/lib/mfa-secret";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorizationPreMfa } from "@/middleware/authorization";

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  const actorRole = req.headers.get("x-user-role") || "";

  if (!actorId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { targetUserId, token, reason } = await req.json().catch(() => ({}));
    const userIdToDisable = targetUserId || actorId;

    const isSelf = actorId === userIdToDisable;
    const isSysAdmin = actorRole === "sysadmin";

    if (!isSelf && !isSysAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only sysadmin can disable 2FA for other users" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, two_factor_secret, two_factor_enabled")
      .eq("id", userIdToDisable)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!targetUser.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_DISABLED", message: "2FA is already disabled for this user" } },
        { status: 400 }
      );
    }

    if (isSelf) {
      // Self-disable always requires a valid TOTP code
      if (!token) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TOTP", message: "Current 6-digit TOTP code required to disable 2FA" } },
          { status: 400 }
        );
      }
      const secret = decryptSecret(targetUser.two_factor_secret || "");
      if (!verifyTOTPCode(secret, String(token).trim())) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TOTP", message: "Invalid authenticator code" } },
          { status: 400 }
        );
      }
    } else {
      // Admin disabling another user's 2FA: require explicit reason
      if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: { code: "REASON_REQUIRED", message: "A valid reason (min 10 chars) is required for administrator-initiated 2FA removal" } },
          { status: 400 }
        );
      }
    }

    await supabase
      .from("users")
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_enrolled_at: null,
        two_factor_recovery_codes: null,
      })
      .eq("id", userIdToDisable);

    // await addAudit({
      userId: actorId,
      action: "2FA_DISABLED",
      details: {
        targetUserId: userIdToDisable,
        disabledBy: isSelf ? "self" : "admin",
        reason: isSelf ? "User initiated" : reason,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error: unknown) {
    console.error("2FA disable error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(withAuthorizationPreMfa(handlePost), { keyPrefix: "2fa_disable", maxRequests: 10, windowMs: 60 * 1000 });
