// src/lib/telegram-deep-link.ts
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Telegram deep-link enrollment verification.
 *
 * Flow: candidate taps `t.me/<bot>?start=<TOKEN>` → Telegram sends
 * `/start <TOKEN>` to the bot webhook → the route verifies the token
 * hash against telegram_deep_links and records the candidate's
 * Telegram identity on their user row.
 *
 * The token is a 24-char hex string (12 random bytes). Only its
 * SHA-256 hash is stored at rest; the plaintext lives exclusively in
 * the deep-link URL.
 */

/** Generate an opaque one-time token (24 hex chars, within the 64-char limit). */
export function generateDeepLinkToken(): string {
  return randomBytes(12).toString("hex");
}

/** SHA-256 hex digest of the token — the value stored in telegram_deep_links.token_hash. */
export function hashDeepLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Build the `t.me/<bot>?start=<token>` URL shown to the candidate (QR + text). */
export function buildTelegramDeepLink(botUsername: string, token: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

/**
 * Constant-time compare of a candidate-supplied /start token against the
 * stored hash. `suppliedHash` must be the SHA-256 of the raw token text
 * Telegram delivered — computed by the caller with hashDeepLinkToken.
 */
export function deepLinkTokenMatches(
  storedHash: string,
  suppliedHash: string,
): boolean {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(suppliedHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
