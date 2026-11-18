import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { rpID, assertProductionWebAuthnConfig } from "@/lib/webauthn";
import { withRateLimit, extractClientIp } from "@/lib/rate-limit";

/**
 * Pre-auth WebAuthn authentication options. Anyone can call this to begin
 * a passkey sign-in — but an abuse test showed unthrottled calls let an
 * attacker burn challenge-cookie quota and DoS legitimate users.
 * Rate-limited per client IP: 30 requests / 60 s.
 */
async function handlePost() {
  assertProductionWebAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    // allowCredentials empty → discoverable (usernameless) sign-in
  });
  const store = await cookies();
  store.set("auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return NextResponse.json(options);
}

export const POST = withRateLimit(handlePost, {
  keyPrefix: "webauthn_auth_options",
  maxRequests: 30,
  windowMs: 60_000,
});
