import { NextRequest, NextResponse } from "next/server";
import { generateBase32Secret } from "@/lib/totp";
import { findUserById, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withRateLimit } from "@/lib/rate-limit";
import { verifyEnrollToken } from "@/lib/mfa-enroll";

async function handlePost(req: NextRequest) {
  let userId = req.headers.get("x-user-id");

  // Bootstrap path: no authenticated session yet. A valid short-lived
  // mfa_enroll JWT (issued by /api/auth/mfa/bootstrap) may mint a setup
  // secret for exactly one target sysadmin.
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

    // Store secret temporarily or directly in database
    const supabase = getSupabaseServiceClient();
    await supabase.from("users").update({ two_factor_secret: secret }).eq("id", userId);

    await addAudit({
      userId,
      action: "2FA_SETUP_INITIATED",
      details: { timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl,
        message: "Scan the QR code or enter secret into your authenticator app",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, { keyPrefix: "2fa_setup", maxRequests: 10 });
