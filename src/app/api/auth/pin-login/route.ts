/**
 * POST /api/auth/pin-login — Operator/kiosk PIN authentication.
 *
 * Flow:
 *  1. Rate limited per IP (5 / 15 min).
 *  2. Look up the ACTIVE user by login_identifier / employee_id.
 *  3. Verify the PIN against the bcrypt-hashed `initial_pin_hash`.
 *  4. On success, obtain a GENUINE Supabase session WITHOUT ever touching a
 *     password: the service role generates a single-use magic-link token and
 *     the server exchanges it via `verifyOtp`. Supabase remains the only
 *     issuer of access tokens — this endpoint never fabricates its own.
 *  5. Missing user and wrong PIN return identical responses (no oracle).
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient, createEphemeralSupabaseClient } from "@/lib/supabaseClient";

interface GenerateLinkProperties {
  action_link?: string;
  email_otp?: string;
  hashed_token?: string;
  token_hash?: string;
}

const INVALID_PIN = {
  success: false,
  error: { code: "INVALID_PIN", message: "Invalid PIN or user not found." },
} as const;

async function findPinUser(identifier: string) {
  const service = getSupabaseServiceClient();
  const columns = "id, email, name, role, employee_id, initial_pin_hash";

  const byLoginIdentifier = await service
    .from("users")
    .select(columns)
    .eq("login_identifier", identifier)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (byLoginIdentifier.data) return byLoginIdentifier.data;

  const byEmployeeId = await service
    .from("users")
    .select(columns)
    .eq("employee_id", identifier)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return byEmployeeId.data ?? null;
}

/** Exchange a service-generated magic-link token for a real Supabase session. */
async function mintSupabaseSession(email: string) {
  const service = getSupabaseServiceClient();
  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties) return null;

  const props = data.properties as GenerateLinkProperties;
  const tokenHash = props.token_hash || props.hashed_token;
  if (!tokenHash) return null;

  const otpClient = createEphemeralSupabaseClient();
  const { data: otpData, error: otpError } = await otpClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (otpError || !otpData?.session) return null;

  return otpData.session;
}

async function handlePinLogin(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { employeeId, pin } = body || {};

    if (
      typeof employeeId !== "string" || !employeeId.trim() ||
      typeof pin !== "string" || !pin
    ) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Employee/User ID and PIN are required." } },
        { status: 400 }
      );
    }

    const user = await findPinUser(employeeId.trim());

    // No user OR no PIN provisioned -> same generic failure (no oracle).
    if (!user?.initial_pin_hash) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    const isValid = await bcrypt.compare(pin, user.initial_pin_hash);
    if (!isValid) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    const session = await mintSupabaseSession(user.email);
    if (!session) {
      console.error("PIN login: failed to mint Supabase session");
      return NextResponse.json(
        { success: false, error: { code: "SESSION_ERROR", message: "Unable to establish a session. Please try password login." } },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          employeeId: user.employee_id,
          email: user.email,
          status: "ACTIVE",
        },
      },
    });
  } catch (error: any) {
    console.error("PIN Login API route error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal PIN authentication error." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePinLogin, {
  keyPrefix: "auth_pin_login",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});
