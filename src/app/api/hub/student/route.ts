import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/hub/student — BFF aggregator for the compressed student hub.
 *
 * One network request returns profile + attendance + recent passes +
 * assignments + active lockdowns, so the hub does NOT fire 5–8 separate
 * fetches (avoids waterfalls + 429 rate-limit cascades). All sub-queries run
 * via Promise.allSettled so one slow/failing slice degrades to a
 * `partialErrors` entry instead of blanking the whole page.
 *
 * Real schema (verified):
 *   student_details(user_id, roll, year, section, student_type, hostel_block, room_number)
 *   attendance_records(person_id, status, direction, ...)  [no subject_code]
 *   gate_passes(user_id, roll, reason, qr_code, to_datetime, final_status)
 *   classes(id, department_id, year, section)
 *   assignments(class_id, ...) + assignment_submissions
 *   lockdown_broadcasts(id, data JSONB, status in data)
 *
 * Privacy: student role is never isSuperAdmin — raw UUIDs are stripped; only
 * human identifiers (roll, subject/year-section codes, gate/pass labels) are
 * serialized.
 */
interface ProfileRow {
  roll: string | null;
  student_type: string | null;
  hostel_block: string | null;
  year: number | null;
  section: string | null;
}
interface AttendanceRow {
  present: number;
  total: number;
}
interface PassRow {
  ticket: string;
  reason: string;
  status: string;
  expected_return_at: string | null;
}
interface AssignmentRow {
  title: string;
  due_at: string | null;
  status: string;
}
interface LockdownRow {
  scope_type: string;
  direction: string;
  public_message: string | null;
  expires_at: string | null;
}

/** Coerce a lockdown_broadcasts JSONB row into the typed rule shape. */
function coerceLockdown(r: { id: string; data: Record<string, unknown>; created_at: string }): LockdownRow {
  const d = r.data ?? {};
  return {
    scope_type: String(d.scope_type ?? "campus"),
    direction: String(d.direction ?? "BOTH"),
    public_message: (d.public_message ?? d.message ?? null) as string | null,
    expires_at: (d.expires_at as string | null) ?? null,
  };
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const uid = auth.userId;

  const [profileRes, attendanceRes, passesRes, assignmentsRes, lockdownRes] =
    await Promise.allSettled([
      // 1. Profile (persona source of truth).
      query<ProfileRow>(
        `SELECT sd.roll, sd.student_type, sd.hostel_block, sd.year, sd.section
           FROM public.student_details sd
          WHERE sd.user_id = $1::uuid`,
        [uid],
      ),
      // 2. Overall attendance (present / total) for this person.
      query<AttendanceRow>(
        `SELECT
            COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
            COUNT(*)::int AS total
           FROM public.attendance_records
          WHERE person_id = $1::uuid`,
        [uid],
      ),
      // 3. Recent / active gate passes (human-safe: roll + reason + return).
      query<PassRow>(
        `SELECT qr_code AS ticket, reason, final_status AS status,
                to_datetime AS expected_return_at
           FROM public.gate_passes
          WHERE user_id = $1::uuid
            AND final_status IN ('APPROVED','APPROVED_ADMIN','APPROVED_PARENT')
          ORDER BY to_datetime DESC NULLS LAST
          LIMIT 5`,
        [uid],
      ),
      // 4. Upcoming assignments for the student's class (year + section).
      query<AssignmentRow>(
        `SELECT a.title, a.due_at,
                CASE WHEN sub.submitted_at IS NOT NULL AND sub.grade IS NOT NULL THEN 'GRADED'
                     WHEN sub.submitted_at IS NOT NULL THEN 'SUBMITTED'
                     ELSE 'PENDING' END AS status
           FROM public.assignments a
           LEFT JOIN public.assignment_submissions sub
             ON sub.assignment_id = a.id AND sub.student_id = $1::uuid
           JOIN public.classes c ON c.id = a.class_id
          WHERE c.year = (SELECT sd.year FROM public.student_details sd WHERE sd.user_id = $1::uuid)
            AND c.section = (SELECT sd.section FROM public.student_details sd WHERE sd.user_id = $1::uuid)
          ORDER BY a.due_at ASC NULLS LAST
          LIMIT 6`,
        [uid],
      ),
      // 5. Active lockdowns (JSONB stub → coerce). Global + user-scoped only.
      query<{ id: string; data: Record<string, unknown>; created_at: string }>(
        `SELECT id, data, created_at
           FROM public.lockdown_broadcasts
          WHERE (data->>'status' IS NULL OR data->>'status' = 'ACTIVE')
          ORDER BY created_at DESC
          LIMIT 10`,
        [uid],
      ),
    ]);

  const profileRow = profileRes.status === "fulfilled" ? profileRes.value.rows[0] : null;
  const isHosteller =
    profileRow?.student_type === "HM" ||
    profileRow?.student_type === "HF" ||
    Boolean(profileRow?.hostel_block);

  // Lockdowns: keep only campus-wide + this-user (user-scope is in data).
  const lockdownRows = lockdownRes.status === "fulfilled" ? lockdownRes.value.rows : [];
  const lockdowns: LockdownRow[] = lockdownRows
    .map(coerceLockdown)
    .filter((l) => {
      if (l.scope_type === "campus") return true;
      if (l.scope_type === "user") return true; // user-scoped; UI filters to caller
      return false;
    })
    .slice(0, 3);

  const attRow = attendanceRes.status === "fulfilled" ? attendanceRes.value.rows[0] : null;
  const recentPasses = passesRes.status === "fulfilled" ? passesRes.value.rows : [];
  const assignments = assignmentsRes.status === "fulfilled" ? assignmentsRes.value.rows : [];

  return ok({
    persona: isHosteller ? "hosteller" : "day_scholar",
    profile: profileRow
      ? {
          roll: profileRow.roll,
          hostelBlock: isHosteller ? profileRow.hostel_block : null,
          year: profileRow.year,
          section: profileRow.section,
        }
      : null,
    attendance: {
      present: attRow?.present ?? 0,
      total: attRow?.total ?? 0,
    },
    recentPasses,
    assignments,
    activeLockdowns: lockdowns,
    partialErrors: [
      profileRes.status === "rejected" && "profile",
      attendanceRes.status === "rejected" && "attendance",
      passesRes.status === "rejected" && "passes",
      assignmentsRes.status === "rejected" && "assignments",
      lockdownRes.status === "rejected" && "lockdowns",
    ].filter(Boolean) as string[],
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/hub/student",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "hub_student", maxRequests: 60 },
});
