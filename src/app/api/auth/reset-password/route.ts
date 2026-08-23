/**
 * POST /api/auth/reset-password — User-initiated password reset.
 *
 * Delegates entirely to Supabase Auth (`resetPasswordForEmail`), which sends
 * a secure, time-limited reset link. The response is deliberately identical
 * whether or not the address exists, preventing account enumeration.
 *
 * Rate limited: 3 requests / 15 min / IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleReset(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email } = body || {};

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_EMAIL", message: "A valid email address is required." } },
      { status: 400 }
    );
  }

  try {
    await supabase.auth.resetPasswordForEmail(email.trim());
  } catch (resetErr) {
    // Never surface whether the account exists.
    console.error("Password reset request error:", resetErr);
  }

  return NextResponse.json({
    success: true,
    data: { message: "If an account exists for that address, a reset link has been sent." },
  });
}

export const POST = withRateLimit(handleReset, {
  keyPrefix: "auth_reset",
  maxRequests: 3,
  windowMs: 15 * 60 * 1000,
});