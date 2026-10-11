import { getSupabaseServiceClient } from '@/lib/dbClient';
import { query } from '@/lib/postgres';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function checkLockout(identifier: string): Promise<{ locked: boolean; until?: Date }> {
  const cleanId = identifier.trim().toLowerCase();
  try {
    const res = await query(
      `SELECT locked_until, failed_count FROM public.login_attempts WHERE identifier = $1 LIMIT 1`,
      [cleanId]
    );
    const row = res.rows?.[0];
    if (row?.locked_until && new Date(row.locked_until) > new Date()) {
      return { locked: true, until: new Date(row.locked_until) };
    }
    return { locked: false };
  } catch {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('login_attempts')
      .select('locked_until, failed_count')
      .eq('identifier', cleanId)
      .maybeSingle();

    if (error || !data) return { locked: false };
    if (data.locked_until && new Date(data.locked_until) > new Date()) {
      return { locked: true, until: new Date(data.locked_until) };
    }
    return { locked: false };
  }
}

export async function recordFailedAttempt(identifier: string, channel: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  try {
    await query(
      `INSERT INTO public.login_attempts (identifier, failed_count, last_channel, last_attempt_at, locked_until)
       VALUES ($1, 1, $2, NOW(), NULL)
       ON CONFLICT (identifier)
       DO UPDATE SET
         failed_count = login_attempts.failed_count + 1,
         last_channel = EXCLUDED.last_channel,
         last_attempt_at = NOW(),
         locked_until = CASE
           WHEN login_attempts.failed_count + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
           ELSE login_attempts.locked_until
         END`,
      [cleanId, channel]
    );
  } catch {
    const supabase = getSupabaseServiceClient();
    const { data: current } = await supabase
      .from('login_attempts')
      .select('failed_count')
      .eq('identifier', cleanId)
      .maybeSingle();

    const newCount = (current?.failed_count ?? 0) + 1;
    const lockedUntil = newCount >= MAX_FAILURES 
      ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
      : null;

    await supabase
      .from('login_attempts')
      .upsert({
        identifier: cleanId,
        failed_count: newCount,
        last_channel: channel,
        last_attempt_at: new Date().toISOString(),
        locked_until: lockedUntil
      }, { onConflict: 'identifier' });
  }
}

export async function clearLockout(identifier: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  try {
    await query(
      `UPDATE public.login_attempts SET failed_count = 0, locked_until = NULL WHERE identifier = $1`,
      [cleanId]
    );
  } catch {
    const supabase = getSupabaseServiceClient();
    await supabase
      .from('login_attempts')
      .update({ failed_count: 0, locked_until: null })
      .eq('identifier', cleanId);
  }
}
