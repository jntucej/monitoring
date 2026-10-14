import { getSupabaseServiceClient } from "@/lib/dbClient";

export const GOAL_SETTER = "goal_setter";
export const ACHIEVER = "achiever";
export const EVENT_PARTICIPATION = "event_participation";
export const FIRST_ATTENDANCE = "first_attendance";

export const AUTO_AWARD_TRIGGERS = {
  GOAL_SETTER,
  ACHIEVER,
  EVENT_PARTICIPATION,
  FIRST_ATTENDANCE,
} as const;

/**
 * Idempotently award an achievement to a user.
 *
 * The UNIQUE constraint on (user_id, achievement_code) makes ON CONFLICT DO
 * NOTHING a safe, repeatable write. `already` reports whether the row already
 * existed before this call; `awarded` is true when the row is guaranteed to
 * exist after this call.
 */
export async function awardAchievement(
  userId: string,
  code: string
): Promise<{ awarded: boolean; already: boolean }> {
  const supabase = getSupabaseServiceClient();

  // Check pre-existence so callers can distinguish "newly awarded" from
  // "already had it" without an extra query after the insert.
  const { data: existing, error: exErr } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_code", code)
    .maybeSingle();
  if (exErr) {
    console.error("awardAchievement existence check failed:", exErr);
    return { awarded: false, already: false };
  }

  // upsert + ignoreDuplicates → ON CONFLICT (user_id, achievement_code) DO NOTHING
  const { error } = await supabase
    .from("user_achievements")
    .upsert(
      { user_id: userId, achievement_code: code },
      { onConflict: "user_id,achievement_code", ignoreDuplicates: true }
    );
  if (error) {
    console.error("awardAchievement upsert failed:", error);
    return { awarded: false, already: false };
  }

  return { awarded: true, already: !!existing };
}

/** Count of achievement rows for a user. */
export async function countUserAchievements(userId: string): Promise<number> {
  const supabase = getSupabaseServiceClient();

  const { count, error } = await supabase
    .from("user_achievements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("countUserAchievements failed:", error);
    return 0;
  }
  return count ?? 0;
}
