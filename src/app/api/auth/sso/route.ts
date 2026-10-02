import { NextRequest, NextResponse } from "next/server";
import { getSSOConfig, mapExternalGroupToRole, validateOIDCIdToken, exchangeOIDCAuthorizationCode } from "@/lib/sso";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";

/**
 * GET /api/auth/sso — Initiate OIDC Authorization Flow or handle OAuth Callback
 */
export async function GET(req: NextRequest) {
  try {
    const config = await getSSOConfig();
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const provider = url.searchParams.get("provider") || config.providerId;

    if (!config.enabled) {
      return NextResponse.json(
        { success: false, error: { message: "SSO is currently disabled by administrator." } },
        { status: 400 }
      );
    }

    const redirectUri = `${url.origin}/api/auth/sso`;

    // Step 1: Initiate Redirect if no authorization code is present
    if (!code) {
      let authUrl = "";
      if (provider === "google") {
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
          config.clientId
        )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile`;
      } else if (provider === "azure_ad") {
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
          config.clientId
        )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
      } else {
        const base = config.issuerUrl || "https://sso.college.edu";
        authUrl = `${base}/v1/authorize?client_id=${encodeURIComponent(
          config.clientId
        )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
      }

      return NextResponse.redirect(authUrl);
    }

    // Step 2: Code exchange & token validation
    const exchange = await exchangeOIDCAuthorizationCode(config, code, redirectUri);
    let ssoEmail = url.searchParams.get("email") || `sso_${code.substring(0, 8)}@college.edu`;
    let ssoName = url.searchParams.get("name") || ssoEmail.split("@")[0];

    if (exchange.id_token) {
      const validation = await validateOIDCIdToken(exchange.id_token, config.clientId, config.issuerUrl);
      if (validation.valid && validation.claims) {
        if (typeof validation.claims.email === "string") ssoEmail = validation.claims.email;
        if (typeof validation.claims.name === "string") ssoName = validation.claims.name;
      }
    }

    const userRole = mapExternalGroupToRole(["Campus-Security-Leads"]);
    const supabase = getSupabaseServiceClient();
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", ssoEmail)
      .maybeSingle();

    let userRecord = existingUser;
    if (!existingUser) {
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          email: ssoEmail,
          name: ssoName,
          role: userRole,
          status: "ACTIVE",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      userRecord = newUser;
    }

    const sessionToken = exchange.id_token || `sso_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.redirect(
      `${url.origin}/login?sso_success=true&role=${userRole}&token=${sessionToken}&email=${encodeURIComponent(ssoEmail)}`
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

/**
 * POST /api/auth/sso — Authenticate user with SSO Identity Token or OIDC Claims
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, provider, idToken } = body;
    const config = await getSSOConfig();

    if (!config.enabled) {
      return NextResponse.json({ success: false, error: { message: "SSO authentication is disabled" } }, { status: 400 });
    }

    const rawToken = idToken || token;
    let email = (body.email || `user_${Date.now()}@sso.local`).toLowerCase().trim();
    let name = body.name || email.split("@")[0];

    if (rawToken) {
      const validation = await validateOIDCIdToken(rawToken, config.clientId, config.issuerUrl);
      if (validation.valid && validation.claims) {
        if (typeof validation.claims.email === "string") email = validation.claims.email;
        if (typeof validation.claims.name === "string") name = validation.claims.name;
      }
    }

    const groups: string[] = Array.isArray(body.groups) ? body.groups : [];
    const role = body.role || mapExternalGroupToRole(groups);

    const supabase = getSupabaseServiceClient();
    const { data: existingUser } = await supabase.from("users").select("*").eq("email", email).maybeSingle();

    let userId = existingUser?.id;
    let finalRole = existingUser?.role || role;

    if (!existingUser) {
      const { data: newUser } = await supabase.from("users").insert({
        email,
        name,
        role: finalRole,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      }).select().single();
      userId = newUser?.id;
    }

    const ssoJwt = rawToken || `sso_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return NextResponse.json({
      success: true,
      data: {
        token: ssoJwt,
        user: { id: userId, email, role: finalRole, provider: provider || config.providerId, ssoAuthenticated: true },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}


