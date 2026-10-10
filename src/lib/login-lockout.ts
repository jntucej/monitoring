import { getSupabaseServiceClient } from '@/lib/dbClient';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function checkLockout(identifier: string): Promise<{ locked: boolean; until?: Date }> {
  const cleanId = identifier.trim().toLowerCase();
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

export async function recordFailedAttempt(identifier: string, channel: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  const supabase = getSupabaseServiceClient();

  // Fetch current state to perform increment
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

export async function clearLockout(identifier: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from('login_attempts')
    .update({ failed_count: 0, locked_until: null })
    .eq('identifier', identifier.trim().toLowerCase());
}
