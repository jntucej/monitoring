import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID } from "crypto";
import { requireSecret } from "@/lib/env";
import { query } from "@/lib/postgres";

export function getSigningKey(): Uint8Array {
  return new TextEncoder().encode(requireSecret("QR_TOKEN_SECRET", 32));
}

export interface QrTokenClaims extends JWTPayload {
  sub: string;
  roll: string;
  purpose: "qr_verification";
  jti: string;
}

export async function generateQrToken(
  roll: string,
  userId: string,
  ttlSeconds = 300,
): Promise<string> {
  const jti = randomUUID();
  return new SignJWT({ roll, purpose: "qr_verification", jti })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("gate-monitor")
    .setAudience("qr-verification")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(getSigningKey());
}

export async function validateQrToken(
  token: string,
): Promise<QrTokenClaims | null> {
  let claims: QrTokenClaims;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: "gate-monitor",
      audience: "qr-verification",
    });
    claims = payload as QrTokenClaims;
  } catch {
    return null;
  }
  if (claims.purpose !== "qr_verification") return null;
  if (!claims.jti || !claims.exp) return null;
  // Atomic single-use nonce insert. rowCount === 0 means this jti
  // was already consumed — treat as replay.
  try {
    const insert = await query<{ jti: string }>(
      `INSERT INTO scan_nonces (jti, expires_at)
       VALUES ($1, to_timestamp($2))
       ON CONFLICT (jti) DO NOTHING
       RETURNING jti`,
      [claims.jti, claims.exp],
    );
    if (insert.rowCount === 0) return null;
  } catch {
    return null;
  }
  return claims;
}
