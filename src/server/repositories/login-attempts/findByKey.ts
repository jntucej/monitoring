import { getSupabaseServiceClient } from "@/lib/dbClient";

export interface LoginAttemptRow {
  id: string;
  identifier: string;
  failed_count: number;
  last_channel: string | null;
  locked_until: string | null;
}

export async function findByKey(identifier: string): Promise<LoginAttemptRow | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from("login_attempts")
    .select("*")
    .eq("identifier", identifier)
    .maybeSingle();
  if (error || !data) return null;
  return data as LoginAttemptRow;
}

export async function upsert(input: {
  identifier: string;
  failedCount: number;
  lockedUntil: string | null;
  lastChannel: string;
}): Promise<void> {
  const { error } = await getSupabaseServiceClient()
    .from("login_attempts")
    .upsert({
      identifier: input.identifier,
      failed_count: input.failedCount,
      locked_until: input.lockedUntil,
      last_channel: input.lastChannel,
      last_attempt_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function clear(identifier: string): Promise<void> {
  const { error } = await getSupabaseServiceClient()
    .from("login_attempts")
    .update({ failed_count: 0, locked_until: null })
    .eq("identifier", identifier);
  if (error) throw error;
}