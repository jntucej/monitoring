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

const inMemoryNonces = new Set<string>();

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
    if (typeof payload.sub !== 'string' || typeof payload.roll !== 'string' || typeof payload.jti !== 'string') {
      return null;
    }

    const expTime = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 300_000);

    // Atomically burn nonce to prevent replay
try {
    const res = await query(
      `INSERT INTO public.scan_nonces (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING`,
      [payload.jti, expTime]
    );

    if (res && typeof res.rowCount === "number" && res.rowCount === 0) {
      console.warn('[qr-token] Replay detected for jti:', payload.jti);
      return null;
    }
  } catch (dbErr) {
    if (inMemoryNonces.has(payload.jti)) {
      console.warn('[qr-token] Replay detected for jti (in-memory):', payload.jti);
      return null;
    }
    inMemoryNonces.add(payload.jti);
  }
return payload as QrTokenClaims;
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'JWTExpired') console.warn('[qr-token] Expired token used');
    else if (name === 'JWSSignatureVerificationFailed') console.warn('[qr-token] Signature failed');
    return null;
  }
}
