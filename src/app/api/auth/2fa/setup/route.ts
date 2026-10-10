import { NextRequest, NextResponse } from "next/server";
import { generateBase32Secret } from "@/lib/totp";
import { findUserById, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorizationPreMfa } from "@/middleware/authorization";
import { verifyEnrollToken } from "@/lib/mfa-enroll";
import { encryptSecret } from "@/lib/mfa-secret";

async function handlePost(req: NextRequest) {
  let userId = req.headers.get("x-user-id");

  // Bootstrap path: authenticated session yet. valid short-lived
  // mfa_enroll JWT (issued by /api/auth/mfa/bootstrap) mint setup
  // secret exactly one target sysadmin.
  const enrollToken = req.headers.get("x-mfa-enroll-token");
  if (!userId && enrollToken) {
    userId = await verifyEnrollToken(enrollToken);
  }

  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const secret = generateBase32Secret(20);
    const appName = "GateMonitor";
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email || user.name)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    // Store secret temporarily directly in database
    const supabase = getSupabaseServiceClient();
    await supabase.from("users").update({ two_factor_secret: encryptSecret(secret) }).eq("id", userId);

    /* await addAudit({
      userId,
      action: "2FA_SETUP_INITIATED",
      details: { timestamp: new Date().toISOString() },
    }); */

    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl,
        message: "Scan code or enter secret in authenticator app",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(withAuthorizationPreMfa(handlePost), { keyPrefix: "2fa_setup", maxRequests: 10, windowMs: 60 * 1000 });