/**
 * Short-lived enrollment tokens for sysadmin MFA bootstrap.
 * Reuses the repo-standard jose HS256 pattern from mobile-auth.ts.
 */
import { SignJWT, jwtVerify } from "jose";

const ENROLL_TTL_SECONDS = 10 * 60;

function getSigningKey(): Uint8Array {
  const secret = process.env.MFA_ENROLL_SECRET || process.env.MOBILE_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MFA_ENROLL_SECRET (or MOBILE_TOKEN_SECRET fallback) must be configured (>= 32 chars)");
  }
  return new TextEncoder().encode(secret);
}

/** Issue a 10-minute single-purpose JWT permitting 2FA setup for one user id. */
export async function createEnrollToken(userId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return await new SignJWT({ purpose: "mfa_enroll" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ENROLL_TTL_SECONDS)
    .sign(getSigningKey());
}

/** Verify an enrollment token; returns the target userId or null. */
export async function verifyEnrollToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== "mfa_enroll" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}
