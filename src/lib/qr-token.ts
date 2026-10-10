import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { requireSecret } from '@/lib/env';

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
}

export async function generateQrToken(
  roll: string,
  userId: string,
  ttlSeconds = 300,   // 5 minutes
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: userId,
    roll: roll.toUpperCase().trim(),
    purpose: 'qr_verification',
  })
    .setProtectedHeader({ alg: "HS256", kid: "qr-v1" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setIssuer('gate-monitor')
    .setAudience('gate-scanner')
    .sign(getSigningKey());
}

export async function validateQrToken(token: string): Promise<QrTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: 'gate-monitor',
      audience: 'gate-scanner',
      algorithms: ['HS256'],
    });

    if (payload.purpose !== 'qr_verification') {
      console.warn('[qr-token] Wrong purpose:', payload.purpose);
      return null;
    }
    if (typeof payload.sub !== 'string' || typeof payload.roll !== 'string') {
      return null;
    }
    return payload as QrTokenClaims;
  } catch (err) {
    // Log class of failure without leaking the token
    const name = (err as Error).name;
    if (name === 'JWTExpired') console.warn('[qr-token] Expired token used');
    else if (name === 'JWSSignatureVerificationFailed') console.warn('[qr-token] Signature failed');
    return null;
  }
}
