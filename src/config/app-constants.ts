// src/config/app-constants.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central config. Fixes audit issue #13 (hardcoded polling intervals) and
// centralizes magic numbers that were duplicated across dashboards.
// ─────────────────────────────────────────────────────────────────────────────

export const POLL_INTERVALS = {
  realtime:    5_000,
  fast:       15_000,
  normal:     30_000,
  slow:       60_000,
  background: 300_000,
} as const;

export type PollProfile = keyof typeof POLL_INTERVALS;

export function pollMs(profile: PollProfile | number): number {
  return typeof profile === "number" ? profile : POLL_INTERVALS[profile];
}

export const RATE_LIMITS = {
  auth:      { windowMs: 15 * 60_000, maxRequests: 10  },
  mutation:  { windowMs:      60_000, maxRequests: 60  },
  read:      { windowMs:      60_000, maxRequests: 600 },
  sensitive: { windowMs: 60 * 60_000, maxRequests: 20  },
  admin:     { windowMs:      60_000, maxRequests: 300 },
  PERMISSION_CREATE: {
    windowMs: 60_000,
    maxRequests: 30,
  },
  PERMISSION_DIRECT_GENERATE: {
    windowMs: 60_000,
    maxRequests: 10,
  },
} as const;

export const LIMITS = {
  TEXT_SHORT:  200,
  TEXT_MEDIUM: 2_000,
  TEXT_LONG:   10_000,
  MAX_UPLOAD_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_IMPORT_ROWS:  5_000,
  MAX_PAGE_SIZE:    200,
  DEFAULT_PAGE_SIZE: 50,
} as const;

export const TIME = {
  SESSION_TTL_MS:        60 * 60 * 1000,
  REFRESH_TTL_MS:  7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET_TTL_MS: 60 * 60 * 1000,
  LOCKOUT_DURATION_MS:  15 * 60 * 1000,
  MAX_FAILED_LOGINS:     5,
} as const;

export const IST_TIMEZONE = "Asia/Kolkata" as const;
