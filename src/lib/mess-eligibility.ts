// src/lib/mess-eligibility.ts
//
// The single definition of "who should have a mess token for this meal day,
// and why." Pure + testable — the same function is called from:
//   1. /api/cron/mess-finalize  (decides who gets issued a token)
//   2. /api/mess/meal-counts    (expected/issued/served breakdown + reasons)
//   3. /api/mess/my-token        (the student's empty-state reason)
//
// It reconciles the signals that exist today but were never combined:
//   - residential status   (student_details.hostel_block: hosteller vs day scholar)
//   - meal opt-out         (mess_preferences.will_be_present = FALSE)
//   - approved leave       (leave_requests in WARDEN_APPROVED+/ covering the meal window)
//   - campus presence      (attendance_seen: in / out / returned-today)
//
// The core fix: a hosteller on APPROVED leave that covers the meal window is
// EXCLUDED from token issuance, so they are not later billed for food they
// did not eat (the billing was computed from served/NO_SHOW tokens).

export type MessEligibilityReason =
  | "HOSTELLER_IN_CAMPUS"
  | "HOSTELLER_OUT_CAMPUS_RETURNING"
  | "HOSTELLER_ON_LEAVE"
  | "HOSTELLER_OPTED_OUT"
  | "DAY_SCHOLAR"
  | "NO_PREFERENCE"
  | "SUSPENDED"
  | "GRADUATED";

export interface MessEligibilityInput {
  /** student_details: hostel_block non-null → hosteller; null → day scholar. */
  isHosteller: boolean;
  /** users.status: 'ACTIVE' vs 'SUSPENDED' vs 'GRADUATED'. */
  userStatus: string;
  /** mess_preferences.will_be_present (the student's own selection, if any). */
  optedOut: boolean;
  /** True when an approved leave spans this meal day's window. */
  onApprovedLeave: boolean;
  /** Campus presence: 'in' | 'out' | 'returned_today' | 'unknown'. */
  presence: "in" | "out" | "returned_today" | "unknown";
  /** Did the student (or their default) register a preference for this day? */
  hasPreference: boolean;
}

export interface MessEligibility {
  eligible: boolean;
  reason: MessEligibilityReason;
  /** A human one-liner for the student/verifier empty-state. */
  explanation: string;
}

/**
 * Resolve whether a student should receive a mess token for a meal day.
 *
 * Decision order matters — the first matching rule wins:
 *   1. Suspended / graduated            → never eligible
 *   2. Day scholar                      → not a mess student (no token)
 *   3. On approved leave covering meal  → excluded (the billing-safety fix)
 *   4. Opted out                        → no token
 *   5. Hosteller IN, or OUT-but-returning → eligible (they will eat)
 *   6. No preference / unknown presence → fallback to the day's default
 */
export function resolveMessEligibility(input: MessEligibilityInput): MessEligibility {
  const { isHosteller, userStatus, optedOut, onApprovedLeave, presence, hasPreference } = input;

  // 1. Status gates — a suspended/graduated account never gets a token.
  const up = userStatus.toUpperCase();
  if (up === "SUSPENDED" || up === "GRADUATED" || up === "INACTIVE" || up === "TERMINATED") {
    return {
      eligible: false,
      reason: up === "GRADUATED" ? "GRADUATED" : "SUSPENDED",
      explanation: up === "GRADUATED" ? "No longer a student." : "Account is not active.",
    };
  }

  // 2. Day scholars are not mess students.
  if (!isHosteller) {
    return {
      eligible: false,
      reason: "DAY_SCHOLAR",
      explanation: "Day scholars do not receive mess tokens.",
    };
  }

  // 3. APPROVED leave covering the meal window → excluded. This is the fix:
  //    a leave-holder who will not be on campus for this meal is not billed.
  if (onApprovedLeave) {
    return {
      eligible: false,
      reason: "HOSTELLER_ON_LEAVE",
      explanation: "On approved leave covering this meal — no token issued.",
    };
  }

  // 4. The student explicitly opted out of this meal.
  if (optedOut) {
    return {
      eligible: false,
      reason: "HOSTELLER_OPTED_OUT",
      explanation: "You opted out of this meal.",
    };
  }

  // 5. In-campus hostellers, or hostellers OUT but returning before the meal
  //    (returned_today) → they will eat → eligible.
  if (presence === "in" || presence === "returned_today") {
    return {
      eligible: true,
      reason: presence === "in" ? "HOSTELLER_IN_CAMPUS" : "HOSTELLER_OUT_CAMPUS_RETURNING",
      explanation: presence === "in"
        ? "Hosteller on campus — token valid."
        : "Returning to campus today — token valid until the meal window.",
    };
  }

  // 6. OUT + not-returning (or unknown) → the day's default decides. The
  //    finalize default is will_be_present=FALSE for hostellers who never
  //    selected, so a stale/unknown presence for a hosteller defaults to the
  //    stored preference if one exists, else ineligible.
  if (hasPreference) {
    return {
      eligible: true,
      reason: "HOSTELLER_OUT_CAMPUS_RETURNING",
      explanation: "A preference was recorded for this meal — token valid.",
    };
  }

  return {
    eligible: false,
    reason: "NO_PREFERENCE",
    explanation: "No preference recorded for this meal and no confirmed presence.",
  };
}

// ── SQL helpers (the per-student signal fetch for the finalize loop) ────────
//
// The finalize cron processes a day's hostellers one by one; these two
// queries give it the two non-trivial signals (leave + presence) for a user
// against a meal day's window. Kept here so the resolver stays pure and the
// DB access is isolated + testable.

import { query } from "@/lib/postgres";

/** True when the student has an APPROVED leave that spans the meal window. */
export async function isOnApprovedLeave(
  userId: string,
  windowOpensAt: string,
  windowClosesAt: string,
): Promise<boolean> {
  const { rows } = await query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM public.leave_requests
      WHERE student_id = $1::uuid
        AND status IN ('WARDEN_APPROVED','PARENT_ACKNOWLEDGED','GATE_ISSUED')
        AND from_ts <= $2::timestamptz
        AND to_ts   >= $3::timestamptz`,
    [userId, windowOpensAt, windowClosesAt],
  );
  return Number(rows[0]?.n ?? "0") > 0;
}

/**
 * Campus presence for a user at the meal day. 'returned_today' = the user was
 * OUT earlier but has an attendance_seen entry for the current day (they came
 * back). 'in' = active presence now; 'out' = no same-day entry + stale;
 * 'unknown' = no attendance_seen row at all.
 */
export async function campusPresence(
  userId: string,
  todayIST: string,
): Promise<"in" | "out" | "returned_today" | "unknown"> {
  const { rows } = await query<{ last_seen_at: string; block_key: string }>(
    `SELECT last_seen_at::text AS last_seen_at, block_key
       FROM public.attendance_seen
      WHERE user_id = $1::uuid
      ORDER BY last_seen_at DESC
      LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) return "unknown";
  const last = rows[0].last_seen_at;
  const lastDay = last.slice(0, 10);
  // A same-day sighting = present (in, or returned-today if the block key marks
  // a hostel entry after being out). We treat any same-day entry as "in".
  if (lastDay === todayIST) return "in";
  // A stale last-sighting (before today) = out.
  return "out";
}

/** The meal window in timestamptz strings for the leave check. */
export function mealDayWindows(day: {
  window_opens_at: string;
  window_closes_at: string;
}): { opensAt: string; closesAt: string } {
  return { opensAt: day.window_opens_at, closesAt: day.window_closes_at };
}
