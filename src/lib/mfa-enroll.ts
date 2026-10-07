/**
 * Short-lived enrollment tokens for sysadmin MFA bootstrap.
 * Reuses repo-standard jose HS256 pattern.
 */
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

const ENROLL_TTL_SECONDS = 10 * 60; // 10 minutes
const DEV_FALLBACK_MFA = "dev-only-insecure-mfa-secret-32bytes-min";

function getSigningKey(): Uint8Array {
  const env = getEnv();
  const secret =
    process.env.MFA_ENROLL_SECRET ||
    env.mfaEnrollSecret ||
    (env.isProduction ? null : DEV_FALLBACK_MFA);
  if (!secret || secret.length < 32) {
    throw new Error(
      "[mfa-enroll] MFA_ENROLL_SECRET must be configured (>= 32 chars) in production."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Issue 10-minute single-purpose JWT permitting 2FA setup for one user id. */
export async function createEnrollToken(userId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return await new SignJWT({ purpose: "mfa_enroll", token_type: "mfa_enroll" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ENROLL_TTL_SECONDS)
    .sign(getSigningKey());
}

/** Verify enrollment token; returns target userId or null. */
export async function verifyEnrollToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    if (
      (payload.purpose !== "mfa_enroll" && payload.token_type !== "mfa_enroll") ||
      typeof payload.sub !== "string"
    ) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
