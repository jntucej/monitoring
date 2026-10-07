// QR token generation and validation for self-hosted system
// Uses JWS (JSON Web Signature) with HS256 algorithm

import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from './env';
import { getUserById } from './auth';

/**
 * QR token generation for guest verification
 */
export async function generateQrToken(roll: string): Promise<string> {
  const signingKey = getSigningKey();

  if (!signingKey) {
    throw new Error('JWT signing key not available');
  }

  return await new SignJWT({
    payload: {
      roll,
      purpose: 'qr_verification',
      exp: Math.floor(Date.now() / 1000) + 45, // 45 seconds validity
    },
    k: signingKey,
  }).sign(signingKey);
}

/**
 * QR token validation
 */
export async function validateQrToken(token: string): Promise<string | null> {
  const signingKey = getSigningKey();

  if (!signingKey) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, signingKey, {
      algorithms: ['HS256'],
    });

    if (!payload?.roll) return null;

    const user = await getUserById(payload.roll);
    if (!user) return null;

    return user;
  } catch {
    return null;
  }
}

function getSigningKey(): Uint8Array {
  const secret = getEnv().jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT signing key not available');
  }
  return new TextEncoder().encode(secret);
}
