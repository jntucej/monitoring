// SimpleWebAuthn server-side configuration for passkey registration/authentication.
// L1: MFA — WebAuthn passkeys + TOTP fallback.
//
// The reference implementation is SimpleWebAuthn v13 (already installed).
// The challenge is stored server-side in an httpOnly cookie (≤5 min),
// never in localStorage.
//
// NOTE: Replaces the hand-rolled validator that was previously in this file
// (which had a broken `createVerify` import and no real signature check).
// No route currently imports the old functions — verified by grep before
// this rewrite.

export const rpName = process.env.WEBAUTHN_RP_NAME ?? "Gate Monitor";
export const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
export const origin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

// L1: WebAuthn configuration. The production-https check is enforced lazily
// (only when a passkey route is actually called), not at module-eval time —
// a top-level throw would abort Next.js's production build during page-data
// collection even when WEBAUTHN_ORIGIN is intentionally left at the default
// for local / CI environments.
export function assertProductionWebAuthnConfig(): void {
  if (process.env.NODE_ENV === "production" && origin.startsWith("http:")) {
    throw new Error("WEBAUTHN_ORIGIN must be https in production");
  }
}
