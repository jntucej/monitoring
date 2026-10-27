import crypto from "crypto";

/**
 * Gate-claim code primitives.
 *
 * A supervisor mints a 6-digit gate-claim code (OTP-style, e.g. "482913") and
 * hands it to an operator. The operator enters it at the kiosk / operator
 * console to claim that gate. Only the SHA-256 hash is persisted; the
 * plaintext is returned exactly once so it can be shown / copied / read aloud.
 *
 * The code is a short, memorable 6-digit string (10^6 possible values) that a
 * supervisor can read aloud on a phone call. It is single-use, expires within
 * its TTL window, and is hashed at rest — so the short space is safe here:
 * an attacker would need the plaintext (one-time, hand-delivered) AND to
 * race it before expiry/revocation, which the one-use + expiry model blocks.
 */

const CODE_LENGTH = 6;

export function normalizeClaimCode(raw: string): string {
  // Accept "123456" and "123 456" and "12-34-56" — keep only digits.
  return raw.replace(/\D+/g, "").trim();
}

export function formatClaimCode(raw: string): string {
  return normalizeClaimCode(raw).slice(0, CODE_LENGTH);
}

/** A 6-digit claim code from a CSPRNG (000000–999999), zero-padded. */
export function generateClaimCode(): string {
  const n = crypto.randomInt(0, 10 ** CODE_LENGTH);
  return n.toString().padStart(CODE_LENGTH, "0");
}

export function hashClaimCode(raw: string): string {
  return crypto.createHash("sha256").update(normalizeClaimCode(raw)).digest("hex");
}

/**
 * Mint a claim code. Returns the plaintext (show-once) plus the persisted
 * fields. `ttlMinutes` defaults to 1440 (24 h).
 */
export function mintClaimCode(ttlMinutes = 1440) {
  const plaintext = generateClaimCode();
  const codeHash = hashClaimCode(plaintext);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  return { plaintext, codeHash, expiresAt };
}
