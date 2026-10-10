import { NextRequest, NextResponse } from "next/server";
import { verifyTOTPCode } from "@/lib/totp";
import { decryptSecret } from "@/lib/mfa-secret";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorizationPreMfa } from "@/middleware/authorization";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

    if (!user || !user.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "2FA setup not initiated" } },
        { status: 400 }
      );
    }

    if (user.two_factor_enabled) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_ENABLED", message: "2FA is already enabled" } },
        { status: 400 }
      );
    }

    const secret = decryptSecret(user.two_factor_secret);
    const isValid = verifyTOTPCode(secret, String(token).trim());

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TOTP", message: "Invalid authenticator code" } },
        { status: 400 }
      );
    }

    // Generate 10 recovery codes & bcrypt hashes
    const recoveryCodes = Array.from({ length: 10 }, () => base64url(randomBytes(8)));
    const recoveryHashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, 10)));

    await supabase
      .from("users")
      .update({
        two_factor_enabled: true,
        two_factor_enrolled_at: new Date().toISOString(),
        two_factor_recovery_codes: recoveryHashes,
      })
      .eq("id", userId);

    // await addAudit({
      userId,
      action: "2FA_ENABLED",
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      recovery_codes: recoveryCodes,
    });
  } catch (error: unknown) {
    console.error("2FA verify error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(withAuthorizationPreMfa(handlePost), { keyPrefix: "2fa_verify", maxRequests: 10, windowMs: 60 * 1000 });
