import { query } from '@/lib/postgres';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function checkLockout(identifier: string): Promise<{ locked: boolean; until?: Date }> {
  const cleanId = identifier.trim().toLowerCase();
  const { rows } = await query<{ locked_until: string | null; failed_count: number }>(
    `SELECT locked_until, failed_count FROM public.login_attempts WHERE identifier = $1`,
    [cleanId],
  );
  const row = rows[0];
  if (!row) return { locked: false };
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { locked: true, until: new Date(row.locked_until) };
  }
  return { locked: false };
}

export async function recordFailedAttempt(identifier: string, channel: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  await query(
    `INSERT INTO public.login_attempts (identifier, failed_count, last_channel, last_attempt_at)
     VALUES ($1, 1, $2, NOW())
     ON CONFLICT (identifier) DO UPDATE SET
       failed_count = public.login_attempts.failed_count + 1,
       locked_until = CASE
         WHEN public.login_attempts.failed_count + 1 >= $3
           THEN NOW() + ($4 || ' minutes')::INTERVAL
         ELSE NULL
       END,
       last_channel = $2,
       last_attempt_at = NOW()`,
    [cleanId, channel, MAX_FAILURES, LOCK_MINUTES],
  );
}

export async function clearLockout(identifier: string): Promise<void> {
  await query(
    `UPDATE public.login_attempts SET failed_count = 0, locked_until = NULL WHERE identifier = $1`,
    [identifier.trim().toLowerCase()],
  );
}
