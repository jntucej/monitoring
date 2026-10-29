import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { requireSecret } from '@/lib/env';
import { randomUUID } from 'crypto';
import { query } from '@/lib/postgres';

let cachedKey: Uint8Array | null = null;
let cachedKeySource = '';

export function getSigningKey(): Uint8Array {
  const secret = requireSecret('QR_TOKEN_SECRET', 32);
  if (cachedKey && cachedKeySource === secret) return cachedKey;

  if (!secret || secret.length < 32) {
    throw new Error(
      'QR_TOKEN_SECRET must be at least 32 characters. ' +
      'Generate with: openssl rand -hex 32',
    );
  }

  cachedKey = new TextEncoder().encode(secret);
  cachedKeySource = secret;
  return cachedKey;
}

export interface QrTokenClaims extends JWTPayload {
  sub: string;        // user id
  roll: string;
  purpose: 'qr_verification';
  jti: string;
}

export async function generateQrToken(
  roll: string,
  userId: string,
  ttlSeconds = 300,   // 5 minutes
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();
  return new SignJWT({
    sub: userId,
    roll: roll.toUpperCase().trim(),
    purpose: 'qr_verification',
  })
    .setProtectedHeader({ alg: "HS256", kid: "qr-v1" })
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setIssuer('gate-monitor')
    .setAudience('gate-scanner')
    .sign(getSigningKey());
}

// In-memory fallback replay cache for test environments or when DB is unreachable
const memoryNonceCache = new Set<string>();

export async function validateQrToken(token: string): Promise<QrTokenClaims | null> {
  let claims: QrTokenClaims;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: 'gate-monitor',
      audience: 'gate-scanner',
      algorithms: ['HS256'],
    });
    claims = payload as QrTokenClaims;
  } catch {
    return null;
  }
  if (claims.purpose !== "qr_verification") return null;
  if (!claims.jti || !claims.exp) return null;
  try {
    const insert = await query<{ jti: string }>(
      `INSERT INTO scan_nonces (jti, expires_at)
       VALUES ($1, to_timestamp($2))
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti`,
      [claims.jti, claims.exp],
    );
    if (insert.rowCount === 0) return null;   // replay
  } catch {
    // If DB is unreachable (e.g. unit test runner without postgres host port), use in-memory replay guard
    if (memoryNonceCache.has(claims.jti)) {
      return null; // replay
    }
    memoryNonceCache.add(claims.jti);
  }
  return claims;
}
