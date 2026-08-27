import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withRateLimit } from "@/lib/rate-limit";

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
    const { targetUserId, token } = await req.json().catch(() => ({}));
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
    const { data: targetUser } = await supabase.from("users").select("id, two_factor_secret, two_factor_enabled").eq("id", userIdToDisable).single();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Self disabling requires valid TOTP token or password verification unless sysadmin override
    if (isSelf && !isSysAdmin && targetUser.two_factor_enabled) {
      if (!token || !verifyTOTPCode(targetUser.two_factor_secret || "", token)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TOTP", message: "Valid 6-digit TOTP code required to disable 2FA" } },
          { status: 400 }
        );
      }
    }

    await supabase
      .from("users")
      .update({ two_factor_enabled: false, two_factor_secret: null })
      .eq("id", userIdToDisable);

    await addAudit({
      userId: actorId,
      action: "2FA_DISABLED",
      details: { disabledForUserId: userIdToDisable, sysadminOverride: !isSelf },
    });

    return NextResponse.json({
      success: true,
      message: `2FA disabled for user ${userIdToDisable}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, { keyPrefix: "2fa_disable", maxRequests: 10 });
