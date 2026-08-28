import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { addAudit } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  try {
    const { userId, token } = await req.json().catch(() => ({}));

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "User ID and TOTP token are required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: user } = await supabase.from("users").select("id, two_factor_secret, two_factor_enabled").eq("id", userId).maybeSingle();

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "2FA is not enabled for this user" } },
        { status: 400 }
      );
    }

    const isValid = verifyTOTPCode(user.two_factor_secret, token);

    if (!isValid) {
      await addAudit({
        userId,
        action: "2FA_AUTHENTICATION_FAILED",
        details: { timestamp: new Date().toISOString() },
      });

      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOTP", message: "Invalid 2FA code" } },
        { status: 401 }
      );
    }

    await addAudit({
      userId,
      action: "2FA_AUTHENTICATION_SUCCESS",
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "2FA authentication successful",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, { keyPrefix: "2fa_auth", maxRequests: 10 });
