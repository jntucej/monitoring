import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { Person } from "@/lib/types";
import { getEnv } from "@/lib/env";
import { findPersonByUniqueId } from "@/lib/db";

const MOBILE_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours (Guide §4.3)
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

export interface MobileTokenClaims extends JWTPayload {
  sub: string;
  uniqueId: string;
  token_type: "mobile";
  device_id?: string;
}

/**
 * Generate mobile app JWT token for a person, optionally bound to a device ID.
 */
export async function generateMobileToken(
  personId: string,
  uniqueId: string,
  deviceId?: string
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    uniqueId,
    token_type: "mobile",
    ...(deviceId ? { device_id: deviceId } : {}),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "mobile-v1" })
    .setSubject(personId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + MOBILE_TOKEN_TTL_SECONDS)
    .sign(getSigningKey());
}

/**
 * Verify mobile token signature and claims
 */
export async function verifyMobileToken(
  token: string
): Promise<MobileTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });

    if (payload.token_type !== "mobile" || typeof payload.sub !== "string") {
      return null;
    }
    return payload as unknown as MobileTokenClaims;
  } catch {
    return null;
  }
}

/**
 * Validate mobile token and return associated Person, verifying device binding.
 */
export async function validateMobileToken(
  token: string,
  presentedDeviceId?: string
): Promise<Person | null> {
  try {
    const payload = await verifyMobileToken(token);
    if (!payload || !payload.sub || typeof payload.uniqueId !== "string") {
      return null;
    }

    // Device binding verification
    if (payload.device_id && presentedDeviceId && payload.device_id !== presentedDeviceId) {
      return null;
    }
    if (payload.device_id && !presentedDeviceId) {
      return null;
    }

    const person = await findPersonByUniqueId(payload.uniqueId);
    if (!person) {
      return null;
    }

    // Verify token belongs to right person
    if (person.id !== payload.sub && person.uniqueId !== payload.uniqueId) {
      return null;
    }

    return person;
  } catch {
    return null;
  }
}
