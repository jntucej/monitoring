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
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  const columns = "id, email, name, role, unique_id, initial_pin_hash, gate_id";

  const byUniqueId = await service
    .from("users")
    .select(columns)
    .eq("unique_id", identifier)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (byUniqueId.data) return byUniqueId.data;

  const byEmail = await service
    .from("users")
    .select(columns)
    .eq("email", identifier)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return byEmail.data ?? null;
}

/**
 * Ensure the email exists in Supabase Auth AND is confirmed, with matching ID.
 * Seeded users live in public.users but may be missing from Auth, or exist
 * with mismatched IDs or as unconfirmed. Magic-link OTP fails for invalid state.
 */
async function ensureAuthUser(service: SupabaseClient, email: string, expectedId?: string): Promise<boolean> {
  const probe = await service.auth.admin.generateLink({ type: "magiclink", email });

  if (!probe.error && probe.data?.user) {
    if (expectedId && probe.data.user.id !== expectedId) {
      console.log(`Re-aligning auth user ID (${probe.data.user.id}) to match public.users.id (${expectedId}) for ${email}`);
      await service.auth.admin.deleteUser(probe.data.user.id).catch(() => {});
      const { error: createError } = await service.auth.admin.createUser({
        id: expectedId,
        email,
        email_confirm: true,
      });
      if (createError) {
        console.error("Re-creation of auth user error:", createError.message);
        return false;
      }
      return true;
    }

    // User exists and ID matches — confirm the email if it is not confirmed yet.
    if (!probe.data.user.email_confirmed_at) {
      const { error: confirmError } = await service.auth.admin.updateUserById(
        probe.data.user.id,
        { email_confirm: true }
      );
      if (confirmError) console.error("confirm user error:", confirmError.message);
    }
    return true;
  }

  const msg = (probe.error?.message ?? "").toLowerCase();
  if (msg.includes("user not found") || msg.includes("unable to find user") || probe.error?.status === 404) {
    // Missing from Auth entirely — provision a confirmed user with explicit expectedId.
    const { error: createError } = await service.auth.admin.createUser({
      id: expectedId,
      email,
      email_confirm: true,
    });
    if (createError) {
      console.error("createUser error:", createError.message);
      return false;
    }
    return true;
  }

  if (probe.error) console.error("generateLink probe error:", probe.error.message);
  return false;
}

/** Exchange a service-generated magic-link token for a real Supabase session. */
async function mintSupabaseSession(email: string, expectedId?: string) {
  const service = getSupabaseServiceClient();

  if (!(await ensureAuthUser(service, email, expectedId))) return null;

  // Fresh token AFTER the user exists and is confirmed.
  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties) {
    if (error) console.error("generateLink error:", error.message);
    return null;
  }

  const props = data.properties as GenerateLinkProperties;
  const tokenHash = props.token_hash || props.hashed_token;
  if (!tokenHash) return null;

  const otpClient = createEphemeralSupabaseClient();
  const { data: otpData, error: otpError } = await otpClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (otpError || !otpData?.session) {
    if (otpError) console.error("verifyOtp error:", otpError.message);
    return null;
  }

  return otpData.session;
}

async function handlePinLogin(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { employeeId, pin, verifyOnly } = body || {};

    if (
      typeof employeeId !== "string" || !employeeId.trim() ||
      typeof pin !== "string" || !pin
    ) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Employee/User ID and PIN are required." } },
        { status: 400 }
      );
    }

    // Convert to uppercase for consistency (in case client didn't)
    const cleanEmployeeId = employeeId.trim().toUpperCase();
    
    const user = await findPinUser(cleanEmployeeId);

    // No user OR no PIN provisioned -> same generic failure (no oracle).
    if (!user?.initial_pin_hash) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    const isValid = await bcrypt.compare(pin, user.initial_pin_hash);
    if (!isValid) {
      return NextResponse.json(INVALID_PIN, { status: 401 });
    }

    const session = await mintSupabaseSession(user.email, user.id);
    if (!session) {
      console.error("PIN login: failed to mint Supabase session");
      return NextResponse.json(
        { success: false, error: { code: "SESSION_ERROR", message: "Unable to establish a session. Please try password login." } },
        { status: 503 }
      );
    }

    // Generate unique session token for single active session enforcement (if not just verification)
    let currentSessionToken: string | undefined;
    if (verifyOnly !== true) {
      currentSessionToken = randomUUID();
      const service = getSupabaseServiceClient();
      const { error: sessionUpdateError } = await service
        .from("users")
        .update({ handle: currentSessionToken })
        .eq("id", user.id);

      if (sessionUpdateError) {
        console.error("Failed to update user session token during PIN login:", sessionUpdateError);
      }
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
          employeeId: user.unique_id,
          uniqueId: user.unique_id,
          email: user.email,
          status: "ACTIVE",
          currentSessionToken,
          gateId: user.gate_id,
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
