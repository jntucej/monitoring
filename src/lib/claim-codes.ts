import crypto from "crypto";

/**
 * Gate-claim code primitives.
 *
 * A supervisor mints a human-readable claim string (NOT a bare numeric PIN —
 * a 16-char Crockford-safe token grouped with dashes) and hands it to an
 * operator. Only the SHA-256 hash is persisted; the plaintext is returned
 * exactly once so it can be shown / copied / read aloud.
 *
 * Crockford-safe alphabet (no 0, 1, I, L, O, U, ambiguous digits):
 *   2 3 4 5 6 7 8 9 A B C D E F H J K M N P Q R S T V W X Y Z
 */
const CROCKFORD = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_GROUPS = 4; // 4 groups × 4 chars, dash-separated → 16 chars total

export function normalizeClaimCode(raw: string): string {
  // Accept "GATE-2A3B-9XYZ" and "GATE 2A3B 9XYZ" and bare "GATE2A3B9XYZ".
  return raw.toUpperCase().replace(/[\s-]+/g, "").trim();
}

export function formatClaimCode(raw: string): string {
  const n = normalizeClaimCode(raw);
  const out: string[] = [];
  for (let i = 0; i < n.length; i += CODE_GROUPS) {
    out.push(n.slice(i, i + CODE_GROUPS));
  }
  return out.join("-");
}

/** 28-byte (224-bit) claim code from a CSPRNG, Crockford-safe. */
export function generateClaimCode(): string {
  const bytes = crypto.randomBytes(16);
  let raw = "";
  for (const b of bytes) {
    raw += CROCKFORD[b % CROCKFORD.length];
  }
  return formatClaimCode(raw);
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
