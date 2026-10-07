import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import {
  getSSOConfig,
  mapExternalGroupToRole,
  validateOIDCIdToken,
  exchangeOIDCAuthorizationCode,
  getAuthorizationUrl,
  type SSOProvider,
} from "@/lib/sso";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { signAccessToken, signRefreshToken } from "@/lib/auth-token";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const config = await getSSOConfig();
  if (!config.enabled) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=disabled`);
  }

  // ── Step 1: initiate the flow ──────────────────────────────
  if (!code) {
    const nonce = base64url(randomBytes(16));
    const stateId = base64url(randomBytes(24));
    const { verifier, challenge } = pkcePair();

    const service = getSupabaseServiceClient();
    const { error: insertErr } = await service.from("sso_authorization_states").insert({
      state: stateId,
      nonce,
      code_verifier: verifier,
      provider_id: config.providerId,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    });
    if (insertErr) {
      console.error("[sso] failed to persist state:", insertErr);
      return NextResponse.redirect(`${url.origin}/login?sso_error=state_persist`);
    }

    const redirectUri = `${url.origin}/api/auth/sso`;
    const authUrl = getAuthorizationUrl(config, redirectUri, stateId, nonce, challenge);
    return NextResponse.redirect(authUrl);
  }

  // ── Step 2: callback ───────────────────────────────────────

  // 2a. IdP-reported error
  if (error) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=${encodeURIComponent(error)}`);
  }

  // 2b. State must be present and must match an unconsumed, unexpired row
  if (!state) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=missing_state`);
  }

  const service = getSupabaseServiceClient();
  const { data: stateRow, error: stateErr } = await service
    .from("sso_authorization_states")
    .select("state, nonce, code_verifier, provider_id, expires_at, consumed_at, redirect_to")
    .eq("state", state)
    .maybeSingle();

  if (stateErr || !stateRow) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=invalid_state`);
  }
  if (stateRow.consumed_at) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=state_reused`);
  }
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=state_expired`);
  }

  // Burn state atomically — prevents replay/race
  const { data: burned } = await service
    .from("sso_authorization_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state", state)
    .is("consumed_at", null)
    .select("state");

  if (!burned || (Array.isArray(burned) && burned.length === 0)) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=state_reused`);
  }
  // 2c. Exchange code for tokens (with PKCE verifier)
  const redirectUri = `${url.origin}/api/auth/sso`;
  const exchange = await exchangeOIDCAuthorizationCode(
    code,
    stateRow.provider_id,
    redirectUri,
    stateRow.code_verifier
  );
  if (!exchange.success || !exchange.idToken) {
    await addAudit({
      action: "SSO_LOGIN_FAILED",
      userId: "system",
      userName: "SSO",
      role: "sysadmin",
      details: { reason: "token_exchange_failed", provider: stateRow.provider_id },
    });
    return NextResponse.redirect(`${url.origin}/login?sso_error=token_exchange`);
  }

  // 2d. Validate the id_token — fail closed.
  const validation = await validateOIDCIdToken(exchange.idToken, {
    provider: stateRow.provider_id as SSOProvider,
    clientId: config.clientId,
    nonce: stateRow.nonce,
    issuerUrl: config.issuerUrl,
  });
  if (!validation.valid || !validation.claims) {
    await addAudit({
      action: "SSO_LOGIN_FAILED",
      userId: "system",
      userName: "SSO",
      role: "sysadmin",
      details: { reason: "id_token_invalid", detail: validation.error },
    });
    return NextResponse.redirect(`${url.origin}/login?sso_error=invalid_id_token`);
  }

  const claims = validation.claims;

  // 2e. Email must be present and verified.
  if (!claims.email || claims.email_verified === false) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=email_unverified`);
  }
  const email = claims.email.toLowerCase();

  // 2f. Resolve role from ACTUAL groups (from the id_token).
  const groups = Array.isArray(claims.groups) ? claims.groups : [];
  const role = mapExternalGroupToRole(groups);
  if (!role) {
    await addAudit({
      action: "SSO_LOGIN_DENIED",
      userId: "system",
      userName: "SSO",
      role: "sysadmin",
      details: { email, groups, reason: "no_role_mapping" },
    });
    return NextResponse.redirect(`${url.origin}/login?sso_error=no_access`);
  }

  // 2g. Look up by (provider, sub) first — stable across email changes.
  const ssoSubject = claims.sub;
  let user: { id: string; role: Role; status: string; unique_id?: string; name?: string; email?: string } | null = null;

  const { data: bySubject } = await service
    .from("users")
    .select("id, role, status, unique_id, name, email, sso_provider, sso_subject")
    .eq("sso_provider", stateRow.provider_id)
    .eq("sso_subject", ssoSubject)
    .maybeSingle();

  if (bySubject) {
    user = bySubject;
  } else {
    // Fallback: match by email only if the account is not already SSO-bound.
    const { data: byEmail } = await service
      .from("users")
      .select("id, role, status, unique_id, name, email, sso_subject, sso_provider")
      .eq("email", email)
      .maybeSingle();

    if (byEmail && !byEmail.sso_subject) {
      // Bind the existing local account to this SSO identity.
      await service
        .from("users")
        .update({ sso_provider: stateRow.provider_id, sso_subject: ssoSubject })
        .eq("id", byEmail.id);
      user = byEmail;
    } else if (byEmail && byEmail.sso_subject && byEmail.sso_subject !== ssoSubject) {
      // Same email, different subject — account is bound to a different IdP identity.
      return NextResponse.redirect(`${url.origin}/login?sso_error=identity_conflict`);
    }
  }

  // 2h. JIT provisioning — PENDING (unless autoApproveSsoUsers is enabled).
  if (!user) {
    const uniqueId = `SSO-${ssoSubject.slice(0, 12).toUpperCase()}`;
    const handle = `sso_${base64url(randomBytes(8)).toLowerCase()}`;
    const jitStatus = config.autoApproveSsoUsers ? "ACTIVE" : "PENDING";

    const { data: created, error: createErr } = await service
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        unique_id: uniqueId,
        handle,
        name: claims.name || email.split("@")[0],
        email,
        role,
        status: jitStatus,
        sso_provider: stateRow.provider_id,
        sso_subject: ssoSubject,
        created_at: new Date().toISOString(),
      })
      .select("id, role, status, unique_id, name, email, sso_provider, sso_subject")
      .single();

    if (createErr || !created) {
      console.error("[sso] JIT provision failed:", createErr);
      return NextResponse.redirect(`${url.origin}/login?sso_error=provision_failed`);
    }
    user = created;

    await addAudit({
      action: "SSO_USER_PROVISIONED",
      userId: user.id,
      userName: user.name,
      role: role as Role,
      details: { email, provider: stateRow.provider_id, sub: ssoSubject, status: jitStatus },
    });

    if (jitStatus === "PENDING") {
      return NextResponse.redirect(`${url.origin}/login?sso_pending=1`);
    }
  }

  if (!user) {
    return NextResponse.redirect(`${url.origin}/login?sso_error=user_resolution_failed`);
  }

  // 2i. Existing account must be ACTIVE.
  if (user.status !== "ACTIVE") {
    return NextResponse.redirect(`${url.origin}/login?sso_error=account_${user.status.toLowerCase()}`);
  }

  // ── Step 3: issue OUR tokens, not the IdP's ────────────────
  const access_token = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    account_status: user.status,
    name: user.name,
  });
  const refresh_token = await signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  await addAudit({
    action: "SSO_LOGIN_SUCCESS",
    userId: user.id,
    userName: user.name,
    role: (user.role as Role) || "staff",
    details: { provider: stateRow.provider_id, email },
  });

  // ── Step 4: set cookies, redirect to clean destination ─────────
  const dest = stateRow.redirect_to && stateRow.redirect_to.startsWith("/")
    ? stateRow.redirect_to
    : "/";
  const response = NextResponse.redirect(`${url.origin}${dest}`);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  response.cookies.set("access_token", access_token, { ...cookieOpts, maxAge: 3600 });
  response.cookies.set("refresh_token", refresh_token, { ...cookieOpts, maxAge: 30 * 24 * 3600 });
  return response;
}

