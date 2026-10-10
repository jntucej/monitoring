// src/server/policy/lockout.ts — pure
export const MAX_FAILURES = 5;
export const LOCK_MINUTES = 15;

export function shouldLock(failedCount: number): boolean {
  return failedCount >= MAX_FAILURES;
}

export function lockUntil(now: Date = new Date()): Date {
  return new Date(now.getTime() + LOCK_MINUTES * 60_000);
}

export function isLocked(lockedUntil: string | null, now: Date = new Date()): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now.getTime();
}
