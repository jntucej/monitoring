/**
 * Short-lived enrollment tokens for sysadmin MFA bootstrap.
 * Reuses repo-standard jose HS256 pattern.
 */
import { SignJWT, jwtVerify } from "jose";
import { requireSecret } from "@/lib/env";

const ENROLL_TTL_SECONDS = 10 * 60; // 10 minutes

function getSigningKey(): Uint8Array {
  return new TextEncoder().encode(requireSecret("MFA_ENROLL_SECRET"));
}

/** Issue 10-minute single-purpose JWT permitting 2FA setup for one user id. */
export async function createEnrollToken(userId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  return await new SignJWT({ purpose: "mfa_enroll", token_type: "mfa_enroll" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "mfa-v1" })
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
