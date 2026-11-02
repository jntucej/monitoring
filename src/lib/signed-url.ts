import { createHmac, timingSafeEqual } from "crypto";
import { requireSecret } from "@/lib/env";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/**
 * Sign a document URL for a permission ticket. The signature binds
 * (ticket, document kind, expiry) so a leaked URL for one ticket cannot be
 * replayed against another. Missing or short secret is a hard failure —
 * callers get a 503 at the route level, never a silent degradation.
 */
export function signDocumentUrl(
  ticket: string,
  kind: "original" | "signed",
  ttlSeconds = DEFAULT_TTL_SECONDS,
): { path: string; expires: number } {
  const secret = requireSecret("DOCUMENT_URL_SECRET", 32);
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${ticket}:${kind}:${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return {
    path: `/api/permissions/${encodeURIComponent(ticket)}/document?kind=${kind}&exp=${expires}&sig=${sig}`,
    expires,
  };
}

export function verifyDocumentUrl(
  ticket: string,
  kind: string,
  exp: number,
  sig: string,
): boolean {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (kind !== "original" && kind !== "signed") return false;
  const secret = requireSecret("DOCUMENT_URL_SECRET", 32);
  const payload = `${ticket}:${kind}:${exp}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
