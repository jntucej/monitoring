import { createHmac, timingSafeEqual } from "crypto";

/**
 * Secure Bootstrap Link Token Utilities
 *
 * Generates and verifies short-lived HMAC-signed tokens for the /bootstrap
 * page. These tokens are scoped to a single user and expire after a set time
 * (e.g., 24 hours), preventing "link sharing" attacks where a user tries to
 * access another user's account.
 */

const SECRET = process.env.QR_TOKEN_SECRET || process.env.INTERNAL_MW_SECRET || "fallback-secret-change-me";

/**
 * Create a signed bootstrap token.
 * @param userId - The user ID this link is for.
 * @param ttlMs - Token lifetime in milliseconds (default 24h).
 */
export function createBootstrapToken(userId: string, ttlMs = 24 * 60 * 60 * 1000): string {
  const expires = Date.now() + ttlMs;
  const payload = `${userId}:${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);
  return `${payload}:${sig}`;
}

/**
 * Verify a bootstrap token.
 * @param token - The raw token string.
 * @returns The userId if valid and not expired, otherwise null.
 */
export function verifyBootstrapToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(":");
  if (parts.length !== 3) return null;

  const [userId, expiresStr, sig] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() > expires) return null;

  const payload = `${userId}:${expires}`;
  const expectedSig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);

  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return userId;
}
