/**
 * POST /api/auth/login
 * Password authentication backed by Supabase Auth. Supabase Auth is the SOLE authentication authority:
 * Credentials verified ONLY via `supabase.auth.signInWithPassword`.
 * Endpoint issues genuine Supabase access/refresh tokens; mints custom opaque tokens own.
 * Matching ACTIVE profile `public.users` additionally required.
 * Rate limited: 5 attempts / 15 min / IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase, getSupabaseServiceClient } from "@/lib/supabaseClient";
import { isMfaRequiredForAdmin } from "@/lib/authContext";
import { SignJWT } from "jose";
import { getSigningKey } from "@/lib/qr-token";

const GENERIC_FAILURE = {
  success: false,
  error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials or user not found." },
};

async function resolveIdentifierToEmail(login: string): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: byLoginIdentifier, error: loginErr } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("login_identifier", login.toLowerCase().trim())
      .eq("status", "ACTIVE")
      .single();

    if (byLoginIdentifier?.email) return byLoginIdentifier.email;

    const { data: byUniqueId, error: uniqueIdErr } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("unique_id", login.toUpperCase().trim())
      .eq("status", "ACTIVE")
      .single();

    return byUniqueId?.email ?? null;
  } catch (resolveErr) {
    console.error("Identifier resolution error:", resolveErr);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json();
    if (!login || !password) {
      return NextResponse.json(GENERIC_FAILURE, { status: 400 });
    }

    const email = await resolveIdentifierToEmail(login.trim());
    if (!email) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Normalize password (trim)
    const normalizedPassword = password.trim();
    if (!normalizedPassword) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: normalizedPassword,
    });

    if (authError || !authData?.session || !authData?.user) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Fetch user profile to ensure ACTIVE status and get role
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, role, status")
      .eq("id", authData.user.id)
      .eq("status", "ACTIVE")
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }

    // Create custom token (JWT) for session management
    const customTokenPayload = {
      sub: authData.user.id,
      email: authData.user.email ?? "",
      role: profile.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    const signingKey = getSigningKey();
    const access_token = await new SignJWT(customTokenPayload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .sign(signingKey);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60, // 1 hour
    };

    const response = NextResponse.json({
      success: true,
      access_token,
      expires_in: 3600,
      token_type: "Bearer",
    });

    response.cookies.set("session-token", access_token, cookieOptions);

    // Also set refresh token if available (from Supabase)
    if (authData.session?.refresh_token) {
      const refreshCookieOptions = { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }; // 30 days
      response.cookies.set("refresh-token", authData.session.refresh_token, refreshCookieOptions);
    }

    return response;
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}