import { createHash } from 'crypto';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { Person } from "@/lib/types";
import { requireSecret } from "@/lib/env";
import { findPersonByUniqueId } from "@/lib/db";
import { getCached, setCached } from './cache';

const MOBILE_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const MOBILE_AUDIENCE = 'gate-mobile';
const MOBILE_ISSUER = 'gate-monitor';

let cachedKey: Uint8Array | null = null;
let cachedKeySource = '';

function getSigningKey(): Uint8Array {
  const secret = requireSecret("MOBILE_TOKEN_SECRET", 32);
  if (cachedKey && cachedKeySource === secret) return cachedKey;

  if (!secret || secret.length < 32) {
    throw new Error('MOBILE_TOKEN_SECRET must be at least 32 characters');
  }

  cachedKey = new TextEncoder().encode(secret);
  cachedKeySource = secret;
  return cachedKey;
}

export interface MobileTokenClaims extends JWTPayload {
  sub: string;
  uniqueId: string;
  token_type: "mobile";
  device_id?: string;
}

export function hashDeviceId(deviceId: string): string {
  // Short, deterministic. Not a security boundary — just tamper-evident.
  return createHash('sha256').update(deviceId).digest('hex').slice(0, 16);
}

/**
 * Generate mobile app JWT token for a person, bound to a device ID.
 */
export async function generateMobileToken(
  personId: string,
  uniqueId: string,
  deviceId: string
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    uniqueId,
    token_type: "mobile",
    device_id: hashDeviceId(deviceId),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", kid: "mobile-v1" })
    .setSubject(personId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + MOBILE_TOKEN_TTL_SECONDS)
    .setIssuer(MOBILE_ISSUER).setAudience(MOBILE_AUDIENCE).sign(getSigningKey());
}

/**
 * Validate mobile token and return associated Person, verifying device binding.
 * Uses caching to avoid repeated DB lookups.
 */
export async function validateMobileToken(
  token: string,
  presentedDeviceId?: string,
): Promise<Person | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });
    
    const claims = payload as MobileTokenClaims;

    if (claims.token_type !== 'mobile' || !claims.sub || !claims.uniqueId) return null;

    // ── Device binding is MANDATORY ──
    if (!claims.device_id) {
      console.warn('[mobile-auth] Token missing device_id — rejecting');
      return null;
    }
    if (!presentedDeviceId) {
      console.warn('[mobile-auth] Caller did not present device_id — rejecting');
      return null;
    }
    if (hashDeviceId(presentedDeviceId) !== claims.device_id) {
      console.warn('[mobile-auth] Device ID mismatch');
      return null;
    }

    // Cache person lookup to avoid DB hit on every request
    const cacheKey = `mobile-auth:person:${claims.sub}`;
    const cached = await getCached<Person>(cacheKey);
    if (cached) return cached;

    const person = await findPersonByUniqueId(claims.uniqueId);
    if (!person) return null;

    await setCached(cacheKey, person, 60); // Cache for 1 min
    return person;
  } catch {
    return null;
  }
}

/**
 * Verify mobile token signature and claims
 */
export async function verifyMobileToken(
  token: string
): Promise<MobileTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });

    if (payload.token_type !== 'mobile' || typeof payload.sub !== 'string') {
      return null;
    }
    return payload as unknown as MobileTokenClaims;
  } catch {
    return null;
  }
}
