import { supabase } from "@/lib/dbClient";

export interface LoginAttemptRow {
  identifier: string;
  failed_count: number;
  locked_until: string | null;
  last_channel: string;
}

export async function findByKey(identifier: string): Promise<LoginAttemptRow | null> {
  const { data, error } = await supabase
    .from("login_attempts")
    .select("*")
    .eq("identifier", identifier)
    .single();

  if (error) return null;
  return data as LoginAttemptRow | null;
}
