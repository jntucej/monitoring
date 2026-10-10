import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { decryptSecret } from "@/lib/mfa-secret";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorizationPreMfa } from "@/middleware/authorization";

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
        { success: false, error: { code: "BAD_REQUEST", message: "6-digit TOTP token required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, two_factor_secret, two_factor_enabled")
      .eq("id", userId)
      .maybeSingle();

    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "2FA is not enabled" } },
        { status: 400 }
      );
    }

    const secret = decryptSecret(user.two_factor_secret);
    if (!verifyTOTPCode(secret, String(token).trim())) {
      await addAudit({
        userId,
        action: "2FA_DISABLED",
        details: { reason: "invalid_totp", self: true },
      });
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOTP", message: "Invalid authenticator code" } },
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
      .eq("id", userId);

    await addAudit({
      userId,
      action: "2FA_DISABLED",
      details: { reason: "user initiated", self: true, timestamp: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, message: "2FA disabled successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Internal server error" } }, { status: 500 });
  }
}

export const POST = withRateLimit(withAuthorizationPreMfa(handlePost), { keyPrefix: "2fa_disable_self", maxRequests: 5, windowMs: 60 * 1000 });
