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

/**
 * Timezone-boundary-safe "last N days" helper. Returns a list of IST
 * YYYY-MM-DD day strings for the N most recent calendar days (oldest →
 * newest), ending today. Use anywhere a *list of days* feeds `WHERE
 * date IN (...)` or `WHERE date = ANY(...)`, so the window stays aligned
 * with the DB triggers (which bucket on Asia/Kolkata).
 *
 * Offender pattern this replaces: `out.push(d.toISOString().slice(0, 10))`
 * in a loop that starts from `new Date() - n*24h`. In the 00:00–05:30 IST
 * window, `toISOString().slice(0, 10)` for "today" returns YESTERDAY's IST
 * day, silently shifting the whole report by one calendar day.
 */
export function lastIstDayStrings(n: number, now: Date = new Date()): string[] {
  // Anchor on today's IST date (NOT on now - n days in UTC), then walk
  // backwards n-1 days in local calendar arithmetic.
  const today = getIstDateString(now);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    // Subtract i days in UTC (date-level arithmetic is timezone-agnostic);
    // then format in IST. For i=0 this is today's IST day; for i>0 it's
    // the corresponding earlier calendar day.
    d.setUTCDate(d.getUTCDate() - i);
    out.push(getIstDateString(d));
  }
  // De-dup while preserving order (in case the walk crosses a DST-less but
  // month-length edge that formats the same string twice — defensive).
  return Array.from(new Set(out));
}

/**
 * The UTC date string (YYYY-MM-DD) of an arbitrary moment, in IST.
 * Replaces the `new Date(ts).toISOString().slice(0, 10)` pattern at any
 * site where the date feeds a `WHERE date =` clause against a table whose
 * day-bucketing uses Asia/Kolkata (movement_logs → daily_stats, mess_days,
 * attendance_records, etc.).
 */
export function istDateOf(date: Date = new Date()): string {
  return getIstDateString(date);
}
