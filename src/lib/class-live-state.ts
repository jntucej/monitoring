// src/lib/class-live-state.ts
// Live class-session state resolver — the "what's happening in classes right
// now" view, scoped to the caller's authority.
//
// Pure on (timetable + confirmation + attendance):
//   - today's sessions (periods) for the in-scope faculty
//   - each session's confirmation state (PENDING / CONFIRMED / NO_SHOW / SUBSTITUTED)
//   - whether the faculty is actually IN-campus right now (attendance = evidence)
//   - a per-session "live" classification: LIVE (in progress + confirmed),
//     UPCOMING, MISSED (ended + no attendance), SUBSTITUTED
//
// Scope is enforced server-side from the caller's role, not the client's
// `?scope=` param — a HOD requesting scope=campus gets department scope.

import { query } from "@/lib/postgres";
import { toISTDateForCron } from "@/lib/class-session";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/roles";

export type LiveSessionState = "LIVE" | "UPCOMING" | "MISSED" | "SUBSTITUTED" | "ENDED";

export interface LiveSession {
  sessionId: string;
  classId: string;
  className: string;
  subjectCode: string | null;
  periodNo: number;
  facultyId: string | null;
  facultyName: string | null;
  departmentId: string | null;
  hall: string | null;
  startAt: string;
  endAt: string;
  state: LiveSessionState;
  confirmation: string | null; // PENDING / CONFIRMED / NO_SHOW / SUBSTITUTED
  facultyOnCampus: boolean | null; // null = no attendance signal
}

export interface LiveScope {
  /** faculty the caller is allowed to see; null = all, [] = none */
  facultyIds: string[] | null;
  departmentId?: string;
  /** a student's own class(es) — the student-facing scope (their MyDay). */
  classIds?: string[];
}

const ACADEMIC_ROLES: readonly string[] = ["faculty", "hod", "vice_principal", "principal"];

/**
 * Resolve a STUDENT's live-class scope: the class(es) they're enrolled in.
 * The enrollment key is student_details.department = classes.department_id
 * (the same join the whole app uses: register.ts, attendance/overview,
 * me/class). section + year narrow to the exact class. A student sees only
 * their own timetable, never the faculty-wide view. Returns [] when the
 * student has no enrolled class (the dashboard then shows no live classes).
 */
export async function resolveStudentClassIds(userId: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `SELECT c.id
       FROM public.student_details sd
       JOIN public.classes c ON c.department_id::text = sd.department::text
      WHERE sd.user_id = $1::uuid
        AND c.section = COALESCE(sd.section, '')
        AND c.year = COALESCE(sd.year, 0)`,
    [userId],
  );
  return rows.map((r) => r.id);
}

/** Resolve the caller's live-class scope from their role. Server-authoritative. */
export function resolveLiveScope(auth: AuthContext): LiveScope {
  switch (auth.role as Role) {
    case "principal":
    case "admin":
    case "sysadmin":
      return { facultyIds: null };
    case "vice_principal":
      return { facultyIds: null }; // VP sees the whole academic surface
    case "hod":
      return { facultyIds: null, departmentId: auth.departmentId ?? undefined };
    case "faculty":
      return { facultyIds: [auth.userId] };
    default:
      return { facultyIds: [] };
  }
}

interface SessionRow {
  session_id: string;
  class_id: string;
  class_name: string;
  subject_code: string | null;
  period_no: number;
  faculty_id: string | null;
  faculty_name: string | null;
  department_id: string | null;
  hall: string | null;
  start_at: string;
  end_at: string;
  confirmation_status: string | null;
  on_campus: boolean | null;
}

/**
 * Resolve today's live class sessions for the given scope.
 * State is derived from (confirmation × time × on-campus attendance):
 *   now < start                          → UPCOMING
 *   start ≤ now ≤ end + 15min grace:
 *     CONFIRMED or SUBSTITUTED          → LIVE
 *     NO_SHOW                           → MISSED
 *     PENDING / none                    → UPCOMING (still can confirm)
 *   now > end + grace:
 *     SUBSTITUTED                       → ENDED
 *     faculty on-campus               → ENDED (held the class)
 *     else                              → MISSED
 */
export async function getLiveSessions(
  scope: LiveScope,
  opts?: { now?: Date },
): Promise<LiveSession[]> {
  const now = opts?.now ?? new Date();
  const today = toISTDateForCron(now);
  // class_periods.day_of_week is 1-indexed 1=Mon..7=Sun (DB CHECK constraint).
  // getUTCDay() is 0=Sun..6=Sat → convert: ((dow+6)%7)+1 gives 1=Mon..7=Sun.
  const gdc = new Date(`${today}T00:00:00Z`).getUTCDay();
  const dowIST = ((gdc + 6) % 7) + 1;

  const clause: string[] = ["c.is_active = TRUE", "cp.day_of_week = $2"];
  const params: unknown[] = [today, dowIST];
  // Use a running param counter for the conditionally-added scope clauses so
  // the $N positions always line up with the params array (a student scope has
  // only classIds → $3; a HOD has facultyIds+departmentId → $3,$4; etc.).
  let n = params.length;
  if (scope.facultyIds) {
    if (scope.facultyIds.length === 0) {
      clause.push("1=0"); // empty scope → nothing
    } else {
      n += 1;
      clause.push(`cp.faculty_id = ANY($${n}::uuid[])`);
      params.push(scope.facultyIds);
    }
  }
  if (scope.departmentId) {
    n += 1;
    clause.push(`c.department_id::text = $${n}`);
    params.push(scope.departmentId);
  }
  if (scope.classIds) {
    if (scope.classIds.length === 0) {
      clause.push("1=0"); // student with no enrolled class → nothing to show
    } else {
      n += 1;
      clause.push(`cp.class_id = ANY($${n}::uuid[])`);
      params.push(scope.classIds);
    }
  }

  const rows = await query<SessionRow>(
    `WITH base AS (
       SELECT
         md5(concat('live::', cp.class_id::text, '::', COALESCE(cp.hall,'none'), '::', $1, '::', cp.period_no)) AS session_id,
         cp.class_id::text AS class_id,
         c.name AS class_name,
         cp.hall AS subject_code,
         cp.period_no,
         cp.faculty_id::text AS faculty_id,
         u.name AS faculty_name,
         c.department_id::text AS department_id,
         cp.hall,
         cp.start_time::text AS start_at,
         cp.end_time::text AS end_at
       FROM public.class_periods cp
       JOIN public.classes c ON c.id = cp.class_id
       LEFT JOIN public.users u ON u.id = cp.faculty_id
      WHERE ${clause.join(" AND ")}
     ),
     confirmed AS (
       SELECT cc.session_id, max(cc.updated_at) AS latest
         FROM public.class_confirmations cc
        WHERE cc.session_date = $1::date
        GROUP BY cc.session_id
     )
     SELECT
       b.session_id, b.class_id, b.class_name, b.subject_code, b.period_no,
       b.faculty_id, b.faculty_name, b.department_id, b.hall, b.start_at, b.end_at,
       cc.status AS confirmation_status,
       (
         SELECT co.current_status = 'IN' FROM public.campus_occupancy co
          WHERE co.user_id = b.faculty_id::uuid
       ) AS on_campus
     FROM base b
     LEFT JOIN (
       SELECT cc.session_id, cc.status FROM public.class_confirmations cc
       JOIN confirmed cf ON cf.session_id = cc.session_id AND cf.latest = cc.updated_at
     ) cc ON cc.session_id = b.session_id
     ORDER BY b.start_at`,
    params,
  );

  const nowMin = istMinutesOfDay(now);
  return rows.rows.map((r) => ({
    sessionId: r.session_id,
    classId: r.class_id,
    className: r.class_name,
    subjectCode: r.subject_code,
    periodNo: r.period_no,
    facultyId: r.faculty_id,
    facultyName: r.faculty_name,
    departmentId: r.department_id,
    hall: r.hall,
    startAt: r.start_at,
    endAt: r.end_at,
    confirmation: r.confirmation_status,
    facultyOnCampus: r.on_campus,
    state: classify(r, nowMin),
  }));
}

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function istMinutesOfDay(d: Date): number {
  const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return ist.getHours() * 60 + ist.getMinutes();
}

function classify(r: SessionRow, nowMin: number): LiveSessionState {
  const start = timeToMin(r.start_at);
  const end = timeToMin(r.end_at);
  const grace = 15;
  if (nowMin < start) return "UPCOMING";
  if (nowMin <= end + grace) {
    if (r.confirmation_status === "SUBSTITUTED") return "SUBSTITUTED";
    if (r.confirmation_status === "NO_SHOW") return "MISSED";
    if (r.confirmation_status === "CONFIRMED") return "LIVE";
    return "UPCOMING"; // still within the confirm window
  }
  // ended
  if (r.confirmation_status === "SUBSTITUTED") return "ENDED";
  if (r.on_campus) return "ENDED"; // faculty was there
  return "MISSED";
}
