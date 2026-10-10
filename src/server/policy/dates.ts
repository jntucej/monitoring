/**
 * Returns today's date in the campus operating timezone (Asia/Kolkata).
 * Kept in policy/ because every analytics surface must use the same
 * day boundary as the DB triggers (update_daily_stats_on_movement).
 */
export function getIstDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
