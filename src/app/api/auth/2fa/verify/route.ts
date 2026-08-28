import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { findUserById, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withRateLimit } from "@/lib/rate-limit";

async function handlePost(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "6-digit TOTP token is required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: user } = await supabase.from("users").select("id, two_factor_secret, two_factor_enabled").eq("id", userId).maybeSingle();

    if (!user || !user.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "2FA setup has not been initiated" } },
        { status: 400 }
      );
    }

    const isValid = verifyTOTPCode(user.two_factor_secret, token);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOTP", message: "Invalid authenticator code" } },
        { status: 400 }
      );
    }

    await supabase.from("users").update({ two_factor_enabled: true }).eq("id", userId);

    await addAudit({
      userId,
      action: "2FA_ENABLED",
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Two-Factor Authentication (2FA) successfully enabled",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, { keyPrefix: "2fa_verify", maxRequests: 10 });
