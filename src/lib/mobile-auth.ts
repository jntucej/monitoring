import { SignJWT, jwtVerify } from "jose";
import { Person } from "@/lib/types";
import { getEnv } from "@/lib/env";
import { findPersonByUniqueId } from "@/lib/db";

const MOBILE_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEV_FALLBACK_MOBILE = "dev-only-insecure-mobile-secret-32bytes-min";

function getSigningKey(): Uint8Array {
  const env = getEnv();
  const secret =
    process.env.MOBILE_TOKEN_SECRET ||
    env.mobileTokenSecret ||
    (env.isProduction ? null : DEV_FALLBACK_MOBILE);
  if (!secret || secret.length < 32) {
    throw new Error(
      "[mobile-auth] MOBILE_TOKEN_SECRET must be configured (>= 32 chars) in production."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a mobile app JWT token for a person
 */
export async function generateMobileToken(
  personId: string,
  uniqueId: string
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return await new SignJWT({ uniqueId, token_type: "mobile" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(personId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + MOBILE_TOKEN_TTL_SECONDS)
    .sign(getSigningKey());
}

/**
 * Verify mobile token signature and claims
 */
export async function verifyMobileToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    if (payload.token_type !== "mobile" || typeof payload.sub !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate a mobile token and return the associated Person
 */
export async function validateMobileToken(
  token: string
): Promise<Person | null> {
  try {
    const payload = await verifyMobileToken(token);
    if (!payload || !payload.sub || typeof payload.uniqueId !== "string") {
      return null;
    }

    const person = await findPersonByUniqueId(payload.uniqueId);
    if (!person) {
      return null;
    }

    // Verify token belongs to the right person
    if (person.id !== payload.sub && person.uniqueId !== payload.uniqueId) {
      return null;
    }

    return person;
  } catch {
    return null;
  }
}
