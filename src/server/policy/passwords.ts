// src/server/policy/passwords.ts
// ─────────────────────────────────────────────────────────────────────────────
// Password policy enforcement. M3: role-aware rules via @/lib/password-policy
// (privileged roles: ≥ 20 chars + upper/lower/digit/symbol; standard:
// ≥ 12 chars). Throws with err.code = "PASSWORD_POLICY" and err.errors =
// the specific rule failures so callers can surface them in the UI.
// ─────────────────────────────────────────────────────────────────────────────

import { validatePassword } from "@/lib/password-policy";

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePasswordPolicy(
  password: string,
  role = "student",
  context?: { email?: string; name?: string },
): PasswordValidationResult & { errors?: string[] } {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must be at most 128 characters long." };
  }
  const result = validatePassword(password, role, context);
  if (!result.valid) {
    return { valid: false, error: result.errors[0], errors: result.errors };
  }
  return { valid: true };
}

export function assertPasswordPolicy(
  password: string,
  role = "student",
  context?: { email?: string; name?: string },
): void {
  const result = validatePasswordPolicy(password, role, context);
  if (!result.valid) {
    const err = new Error(result.error ?? "Password policy violation");
    (err as Error & { code: string; errors: string[] }).code = "PASSWORD_POLICY";
    (err as Error & { code: string; errors: string[] }).errors = result.errors ?? [];
    throw err;
  }
}
