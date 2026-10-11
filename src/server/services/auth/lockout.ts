import { findByKey } from "@/server/repositories/login-attempts/findByKey";
import { upsert } from "@/server/repositories/login-attempts/findByKey";
import { AppError } from "@/server/http/errors";
import { MAX_FAILURES, LOCK_MINUTES, shouldLock, lockUntil, isLocked } from "@/server/policy/lockout";

export interface LockoutState {
  locked: boolean;
  lockedUntil?: Date;
  retryAfterSeconds?: number;
}

export async function checkLockout(identifier: string): Promise<LockoutState> {
  const row = await findByKey(identifier);
  if (!row || !row.locked_until) return { locked: false };
  const until = new Date(row.locked_until);
  if (!isLocked(row.locked_until)) return { locked: false };
  return {
    locked: true,
    lockedUntil: until,
    retryAfterSeconds: Math.ceil((until.getTime() - Date.now()) / 1000),
  };
}

export async function recordFailure(identifier: string, channel: string): Promise<LockoutState> {
  const existing = await findByKey(identifier);
  const nextCount = (existing?.failed_count ?? 0) + 1;
  const lockUntilDate = shouldLock(nextCount)
    ? lockUntil()
    : null;

  await upsert({
    identifier,
    failedCount: nextCount,
    lockedUntil: lockUntilDate?.toISOString() ?? null,
    lastChannel: channel,
  });

  if (lockUntilDate) {
    return {
      locked: true,
      lockedUntil: lockUntilDate,
      retryAfterSeconds: LOCK_MINUTES * 60,
    };
  }
  return { locked: false };
}

export async function clearLockout(identifier: string): Promise<void> {
  await upsert({
    identifier,
    failedCount: 0,
    lockedUntil: null,
    lastChannel: "web",
  });
}
