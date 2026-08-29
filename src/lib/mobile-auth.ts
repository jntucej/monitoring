import { SignJWT, jwtVerify } from "jose";
import { Person } from "@/lib/types";
import { findPersonByUniqueId } from "@/lib/db";
import { getEnv } from "@/lib/env";

export interface MobileSession {
  token: string;
  person: Person;
  expiresAt: string;
}

const MOBILE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * HMAC signing secret for mobile session tokens.
 */
function getSigningKey(): Uint8Array {
  const env = getEnv();
  const secret = env.mobileTokenSecret || (env.isProduction ? null : "default_dev_mobile_token_secret_must_be_32_chars_long");
  if (!secret || secret.length < 32) {
    throw new Error(
      "MOBILE_TOKEN_SECRET is not configured (must be >= 32 chars) — set MOBILE_TOKEN_SECRET environment variable"
    );
  }
  return new TextEncoder().encode(secret);
}

/** Issue a signed HS256 JWT bound to a person (30-day expiry). */
export async function generateMobileToken(personId: string, uniqueId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return await new SignJWT({ uniqueId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(personId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + MOBILE_TOKEN_TTL_SECONDS)
    .sign(getSigningKey());
}

/** Verify signature + expiry, then resolve the person. Returns null if invalid. */
export async function validateMobileToken(token: string): Promise<Person | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });

    const uniqueId = payload.uniqueId as string | undefined;
    if (!uniqueId || typeof payload.sub !== "string") return null;

    const person = await findPersonByUniqueId(uniqueId);
    // Bind the token to its subject: a valid JWT for another person is rejected.
    if (!person || person.id !== payload.sub) return null;

    return person;
  } catch (error) {
    console.error("Mobile token validation error:", error);
    return null;
  }
}
