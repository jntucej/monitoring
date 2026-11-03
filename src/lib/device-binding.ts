// src/lib/device-binding.ts
// ─────────────────────────────────────────────────────────────────────────────
// M4 — Session device binding. The access JWT carries a `dh` claim: the
// SHA-256 of the random `device_id` cookie set at login. Every
// authenticated request presents its own `device_id` cookie, which is
// hashed and compared against the claim. A stolen access_token used from
// a different browser/device (different cookie) is rejected.
//
// Kiosk sessions carry no device cookie (headless operator consoles);
// the auth layer skips the check when the cookie is absent AND the JWT
// has no dh claim — this is the M4d exemption.
//
// The same hash is also stored on the session row (sessions.device_hash)
// so the refresh-rotation path can re-issue the cookie on new access
// tokens.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { isRequestSecure } from "@/lib/cookies";

const COOKIE = "device_id";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/** SHA-256 of the raw device-id cookie value. */
export function hashDeviceId(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Generate a fresh device-id cookie value (raw, base64url). Call this at
 * login, set the cookie with the returned opts, and embed
 * `hashDeviceId(raw)` in the access JWT as the `dh` claim.
 */
export function newDeviceId(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashDeviceId(raw) };
}

/** Options for setting the device-id cookie. `secure` mirrors the request
 *  scheme exactly like secureCookieOptions does (a production-over-https
 *  request gets secure=true; the HTTP loopback test path does not). */
export function deviceCookieOptions(
  raw: string,
  req?: { headers: Headers; url?: string; nextUrl?: { protocol: string } | string },
): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  let secure = process.env.NODE_ENV === "production";
  if (req) {
    secure = isRequestSecure(req);
  }
  return {
    name: COOKIE,
    value: raw,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  };
}

/**
 * Verify a presented device-id cookie value against the `dh` JWT claim.
 * Both sides are hashed with SHA-256 before the constant-time compare.
 *
 * @returns "ok" | "mismatch" | "skip"
 *   - ok:       cookie present and matches the claim
 *   - mismatch: cookie present but differs → caller should 401 + revoke
 *   - skip:     either side absent → kiosk / legacy token, no binding
 */
export function checkDeviceBinding(
  presentedCookie: string | undefined | null,
  jwtDhClaim: string | undefined | null,
): "ok" | "mismatch" | "skip" {
  if (!presentedCookie || !jwtDhClaim) return "skip";
  const presented = Buffer.from(hashDeviceId(presentedCookie));
  const expected = Buffer.from(jwtDhClaim, "hex");
  if (presented.length !== expected.length) return "mismatch";
  if (!timingSafeEqual(presented, expected)) return "mismatch";
  return "ok";
}
