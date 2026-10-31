import { supabase } from "@/lib/dbClient";

export interface UpsertLoginAttemptInput {
  identifier: string;
  failedCount: number;
  lockedUntil: string | null;
  lastChannel: string;
}

export async function upsert(input: UpsertLoginAttemptInput): Promise<void> {
  const { identifier, failedCount, lockedUntil, lastChannel } = input;

  await supabase
    .from("login_attempts")
    .upsert(
      {
        identifier,
        failed_count: failedCount,
        locked_until: lockedUntil,
        last_channel: lastChannel,
      },
      { onConflict: "identifier" }
    );
}
