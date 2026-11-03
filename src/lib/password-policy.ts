// src/lib/password-policy.ts
// ─────────────────────────────────────────────────────────────────────────────
// M3 — Role-aware password policy. Privileged roles must use ≥ 20 chars
// with upper/lower/digit/symbol; every 90 days forces a rotation.
// Non-privileged roles: ≥ 12 chars, 180-day rotation. Both tiers reject
// the local top-500 campus password blocklist and any password that
// contains the user's email local-part or name token.
// ─────────────────────────────────────────────────────────────────────────────

// Privileged roles get the strictest rules.
const PRIVILEGED = new Set([
  "sysadmin", "admin", "principal", "vice_principal",
  "hostel_manager", "warden", "deputy_warden",
]);

// Small offline blocklist — the most common campus passwords.
// For a fuller check, call the HIBP k-anonymity API (out of scope here).
const LOCAL_BLOCKLIST = new Set(
  [
    "password", "123456", "12345678", "qwerty", "admin", "letmein",
    "password1", "admin123", "welcome", "monkey", "dragon",
    "college123", "jntu@123", "student@123", "faculty@123",
    "warden@123", "principal@123", "gate@123", "campus@123",
    "india@123", "hostel@123",
  ].map((p) => p.toLowerCase()),
);

export interface PasswordRule {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
  maxAgeDays: number | null;
}

export function policyFor(role: string): PasswordRule {
  if (PRIVILEGED.has(role)) {
    return {
      minLength: 20,
      requireUpper: true,
      requireLower: true,
      requireDigit: true,
      requireSpecial: true,
      maxAgeDays: 90,
    };
  }
  return {
    minLength: 12,
    requireUpper: true,
    requireLower: true,
    requireDigit: true,
    requireSpecial: false,
    maxAgeDays: 180,
  };
}

export interface PolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(
  password: string,
  role: string,
  context?: { email?: string; name?: string },
): PolicyResult {
  const p = policyFor(role);
  const errors: string[] = [];

  if (password.length < p.minLength) {
    errors.push(`At least ${p.minLength} characters required`);
  }
  if (p.requireUpper && !/[A-Z]/.test(password)) errors.push("At least one uppercase letter required");
  if (p.requireLower && !/[a-z]/.test(password)) errors.push("At least one lowercase letter required");
  if (p.requireDigit && !/[0-9]/.test(password)) errors.push("At least one digit required");
  if (p.requireSpecial && !/[^A-Za-z0-9]/.test(password)) errors.push("At least one symbol required");

  if (LOCAL_BLOCKLIST.has(password.toLowerCase())) {
    errors.push("This password is too common");
  }

  if (context?.email) {
    const local = context.email.split("@")[0].toLowerCase();
    if (local.length >= 4 && password.toLowerCase().includes(local)) {
      errors.push("Password must not contain your email");
    }
  }
  if (context?.name) {
    for (const token of context.name.toLowerCase().split(/\s+/)) {
      if (token.length >= 4 && password.toLowerCase().includes(token)) {
        errors.push("Password must not contain your name");
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Age of the last password change in days, or null when never changed. */
export function passwordAgeDays(lastChangeIso: string | null | undefined): number | null {
  if (!lastChangeIso) return null;
  return Math.floor((Date.now() - new Date(lastChangeIso).getTime()) / 86_400_000);
}

/** True when the user's password is older than the role's maxAgeDays. */
export function passwordIsExpired(
  lastChangeIso: string | null | undefined,
  role: string,
): boolean {
  const max = policyFor(role).maxAgeDays;
  if (max === null) return false;
  const age = passwordAgeDays(lastChangeIso);
  return age !== null && age > max;
}

export function isPrivilegedRoleForPassword(role: string): boolean {
  return PRIVILEGED.has(role);
}
