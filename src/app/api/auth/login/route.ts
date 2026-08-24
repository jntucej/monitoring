/**
 * POST /api/auth/login — Password authentication backed by Supabase Auth.
 *
 * Supabase Auth is the SOLE authentication authority:
 *  - Credentials are verified ONLY via `supabase.auth.signInWithPassword`.
 *  - This endpoint issues genuine Supabase access/refresh tokens; it never
 *    mints custom or opaque tokens of its own.
 *  - A matching ACTIVE profile in `public.users` is additionally required.
 *
 * Rate limited: 5 attempts / 15 min / IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase, getSupabaseServiceClient } from "@/lib/supabaseClient";

const GENERIC_FAILURE = {
  success: false,
  error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials or user not found." },
} as const;

/**
 * Resolve a login identifier (email | login_identifier | employee_id) to the
 * Supabase Auth email. Parameterized equality lookups only — no `.or()`
 * string interpolation, so untrusted input cannot inject PostgREST filters.
 */
async function resolveIdentifierToEmail(login: string): Promise<string | null> {
  if (login.includes("@")) return login.toLowerCase();

  const service = getSupabaseServiceClient();

  const byUniqueId = await service
    .from("users")
    .select("email")
    .eq("unique_id", login)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (byUniqueId.data?.email) return byUniqueId.data.email as string;

  const byLoginIdentifier = await service
    .from("users")
    .select("email")
    .eq("login_identifier", login)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return (byLoginIdentifier.data?.email as string) ?? null;
}

async function handleLogin(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { login, password } = body || {};

    if (
      typeof login !== "string" || !login.trim() ||
      typeof password !== "string" || !password
    ) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Login identifier and password are required." } },
        { status: 400 }
      );
    }

    // Convert to uppercase for consistency (in case client didn't)
    const cleanLogin = login.trim().toUpperCase();

    // 1. Resolve identifier -> Supabase Auth email (null when unknown).
    let email: string | null = null;
    try {
      email = await resolveIdentifierToEmail(cleanLogin);
    } catch (resolveErr) {
      console.error("Login identifier resolution error:", resolveErr);
    }

    // Unknown identifier and wrong password produce IDENTICAL responses
    // to prevent account enumeration.
    if (!email) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // 2. Authenticate with Supabase Auth — the only credential authority.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.session || !authData?.user) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // 3. Defense in depth: profile must exist AND be ACTIVE.
    const service = getSupabaseServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("id, name, role, employee_id, unique_id, gate_id, status")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!profile) {
      // Valid auth user without a provisioned profile — revoke immediately.
      await service.auth.admin.signOut(authData.user.id).catch(() => {});
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    if (profile.status !== "ACTIVE") {
      // Kill the session that was just created for a non-active account.
      await service.auth.admin.signOut(authData.user.id).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: "ACCOUNT_INACTIVE", message: "Account is not active." } },
        { status: 403 }
      );
    }

    // Generate unique session token for single active session enforcement
    const currentSessionToken = randomUUID();
    const { error: sessionUpdateError } = await service
      .from("users")
      .update({ handle: currentSessionToken })
      .eq("id", authData.user.id);

    if (sessionUpdateError) {
      console.error("Failed to update user session token:", sessionUpdateError);
    }

    // 4. Return the genuine Supabase session to the client.
    return NextResponse.json({
      success: true,
      data: {
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at
          ? new Date(authData.session.expires_at * 1000).toISOString()
          : null,
        user: {
          id: profile.id,
          name: profile.name,
          role: profile.role,
          employeeId: profile.employee_id,
          uniqueId: profile.unique_id,
          email,
          status: profile.status,
          currentSessionToken,
          gateId: profile.gate_id,
        },
      },
    });
  } catch (error: any) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal authentication error." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handleLogin, {
  keyPrefix: "auth_login",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});
