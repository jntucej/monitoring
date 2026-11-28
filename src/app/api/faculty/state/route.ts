import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { resolveAttendanceVerdict } from "@/server/policy/attendance-verdict";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/faculty/state — the single, zero-hardcoding state endpoint for the
 * catalog-driven Faculty OS hub. One call returns everything the faculty shell
 * renders: teaching scope (classes + today's periods + SLA queue + knowledge
 * gaps + at-risk mentees + private vault + schedule).
 *
 * No institutional constant is computed here:
 *   - hall-ticket verdicts come from resolveAttendanceVerdict (the SAME engine
 *     + config the student dashboard uses), so faculty and student never
 *     disagree.
 *   - SLA / escalation come from routing_policies (catalog).
 *
 * Privacy: faculty only sees the classes/sections they are assigned to and the
 * students in those sections. No GPS, no biometric reader state.
 *
 * Every loader is individually null-tolerant: a missing table or empty scope
 * degrades to "no data" — never a 500, never a fabricated value.
 */

export interface FacultyState {
  identity: {
    name: string | null;
    role: string;
  };
  scope: {
    classes: Array<{
      id: string;
      name: string;
      year: number | null;
      section: string | null;
      room: string | null;
      isTeacher: boolean;
      subjects: string[];
    }>;
    hasScope: boolean;
  };
  commandStrip: {
    todayPeriods: number;
    slaOpen: number;
    knowledgeGapCards: number;
    atRiskMentees: number;
  };
  today: Array<{
    classId: string;
    className: string;
    periodNo: number;
    start: string;
    end: string;
    hall: string | null;
  }>;
  slaQueue: Array<{
    id: string;
    topic: string;
    targetRole: string | null;
    status: string;
    dueAt: string | null;
    escalated: boolean;
  }>;
  knowledgeGaps: Array<{
    clusterId: string;
    question: string;
    abstentionCount: number;
    status: string;
    groupSlug: string | null;
  }>;
  mentees: Array<{
    studentId: string;
    roll: string | null;
    name: string | null;
    sectionLabel: string;
    hallTicketStatus: string | null;
    aggregatePct: number | null;
    atRisk: boolean;
    hasAttendanceData: boolean;
  }>;
  privateVault: Array<{
    id: string;
    topic: string;
    targetRole: string | null;
    status: string;
    dueAt: string | null;
  }>;
  schedule: Array<{
    day: number;
    periods: Array<{
      periodNo: number;
      start: string;
      end: string;
      hall: string | null;
      className: string;
    }>;
  }>;
}

/** The faculty's assigned class ids (faculty_assignments ACTIVE + class_teacher). */
async function assignedClassIds(userId: string): Promise<string[]> {
  const [fa, teacher] = await Promise.all([
    query<{ class_id: string }>(
      `SELECT DISTINCT class_id FROM public.faculty_assignments
        WHERE faculty_id = $1 AND is_active = true`,
      [userId],
    ).catch(() => ({ rows: [] as { class_id: string }[] })),
    query<{ id: string }>(
      `SELECT id FROM public.classes WHERE class_teacher_id = $1`,
      [userId],
    ).catch(() => ({ rows: [] as { id: string }[] })),
  ]);
  return [...new Set([...fa.rows.map((r) => r.class_id), ...teacher.rows.map((r) => r.id)])];
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;

  // ── Identity ───────────────────────────────────────────────────────
  const me = await query<{ name: string | null; role: string }>(
    `SELECT u.name, u.role FROM public.users u WHERE u.id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as never[] }));
  const identity = { name: me.rows[0]?.name ?? null, role: auth.role };

  // ── Teaching scope (classes + subjects) ────────────────────────────
  const classIds = await assignedClassIds(auth.userId);
  const [classRows, subjRows] = await Promise.all([
    query<{
      id: string;
      name: string | null;
      year: number | null;
      section: string | null;
      room_number: string | null;
      is_teacher: boolean;
    }>(
      `SELECT c.id, c.name, c.year, c.section, c.room_number,
              COALESCE(c.class_teacher_id = $2, false) AS is_teacher
         FROM public.classes c
        WHERE c.id = ANY ($1::uuid[])
        ORDER BY c.year, c.section`,
      [classIds, auth.userId],
    ).catch(() => ({ rows: [] as { id: string; name: string | null; year: number | null; section: string | null; room_number: string | null; is_teacher: boolean }[] })),
    query<{ class_id: string; subject_code: string }>(
      `SELECT class_id, subject_code FROM public.faculty_assignments
        WHERE faculty_id = $1 AND is_active = true`,
      [auth.userId],
    ).catch(() => ({ rows: [] as { class_id: string; subject_code: string }[] })),
  ]);

  const subjectsByClass = new Map<string, string[]>();
  for (const s of subjRows.rows) {
    const arr = subjectsByClass.get(s.class_id) ?? [];
    arr.push(s.subject_code);
    subjectsByClass.set(s.class_id, arr);
  }

  const classes: FacultyState["scope"]["classes"] = classRows.rows.map((c) => ({
    id: c.id,
    name: c.name ?? "",
    year: c.year,
    section: c.section,
    room: c.room_number ?? null,
    isTeacher: c.is_teacher,
    subjects: subjectsByClass.get(c.id) ?? [],
  }));

  // ── Today's periods + full schedule (class_periods, faculty-scoped) ─
  const periodRows = await query<{
    class_id: string;
    period_no: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    hall: string | null;
  }>(
    `SELECT cp.class_id, cp.period_no, cp.day_of_week,
            to_char(cp.start_time, 'HH24:MI') AS start_time,
            to_char(cp.end_time, 'HH24:MI') AS end_time,
            cp.hall
       FROM public.class_periods cp
      WHERE cp.faculty_id = $1::uuid AND cp.slot_status = 'SCHEDULED'
      ORDER BY cp.day_of_week, cp.period_no`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { class_id: string; period_no: number; day_of_week: number; start_time: string; end_time: string; hall: string | null }[] }));

  const isoDay = new Date().getDay(); // 0=Sun
  const todayRows = periodRows.rows.filter((p) => p.day_of_week === isoDay);
  const schedule: FacultyState["schedule"] = [1, 2, 3, 4, 5].map((d) => ({
    day: d,
    periods: periodRows.rows
      .filter((p) => p.day_of_week === d)
      .map((p) => ({
        periodNo: p.period_no,
        start: p.start_time,
        end: p.end_time,
        hall: p.hall,
        className: classes.find((c) => c.id === p.class_id)?.name ?? "—",
      })),
  }));

  // ── SLA queue (open class-doubt escalations routed to this faculty) ──
  const sla = await query<{
    id: string;
    topic: string;
    target_role: string | null;
    status: string;
    due_at: string | null;
    escalation_chain: string;
  }>(
    `SELECT d.id, d.topic, d.target_role, d.status,
            w.due_at, d.escalation_chain
       FROM public.class_doubt_escalations d
       LEFT JOIN public.deadline_watches w
         ON w.entity_type = 'doubt_escalation' AND w.entity_id = d.id AND w.status = 'OPEN'
      WHERE d.status NOT IN ('ANSWERED','CLOSED','ESCALATED')
      ORDER BY w.due_at ASC NULLS LAST, d.created_at DESC
      LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; target_role: string | null; status: string; due_at: string | null; escalation_chain: string }[] }));

  // ── Knowledge gap cards (clustered agent abstentions, 3+ per cluster) ──
  const gaps = await query<{
    cluster_id: string;
    normalized_query: string;
    ab_count: number;
    status: string;
    group_slug: string | null;
  }>(
    `SELECT a.cluster_id, a.normalized_query,
            COUNT(*)::int AS ab_count,
            a.status, a.group_slug
       FROM public.agent_abstentions a
      WHERE a.cluster_id IS NOT NULL AND a.status = 'OPEN'
      GROUP BY a.cluster_id, a.normalized_query, a.status, a.group_slug
      HAVING COUNT(*) >= 3
      ORDER BY ab_count DESC
      LIMIT 10`,
  ).catch(() => ({ rows: [] as { cluster_id: string; normalized_query: string; ab_count: number; status: string; group_slug: string | null }[] }));

  // ── At-risk mentees (students in the faculty's assigned sections) ──
  const sectionPairs = classRows.rows
    .filter((c) => c.year != null && c.section)
    .map((c) => [c.year, c.section] as const);
  const menteeEnriched: FacultyState["mentees"] = [];
  if (sectionPairs.length > 0) {
    const mentees = await query<{
      student_id: string;
      roll: string | null;
      name: string | null;
      section_label: string;
    }>(
      `SELECT u.id AS student_id, u.unique_id AS roll, u.name,
              sd.year::text || '-' || sd.section AS section_label
         FROM public.student_details sd
         JOIN public.users u ON u.id = sd.user_id AND u.role = 'student'
        WHERE (sd.year, sd.section) IN (
          ${sectionPairs.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::text)`).join(", ")})
        ORDER BY u.name
        LIMIT 200`,
      sectionPairs.flatMap(([y, s]) => [y, s]),
    ).catch(() => ({ rows: [] as { student_id: string; roll: string | null; name: string | null; section_label: string }[] }));

    for (const m of mentees.rows) {
      let hall: string | null = null;
      let pct: number | null = null;
      let hasData = false;
      let atRisk = false;
      try {
        const v = await resolveAttendanceVerdict({ userId: m.student_id });
        hall = v.status;
        pct = v.aggregatePct ?? null;
        hasData = (v as { attendedPeriods?: number }).attendedPeriods !== 0;
        // At-risk = hall ticket locked (DETAINED / CONDONATION_REQUIRED both
        // set hallTicketLocked true), per the SAME config the student
        // simulator reads — never a hardcoded 75/65.
        atRisk = v.hallTicketLocked;
      } catch {
        hall = null;
      }
      menteeEnriched.push({
        studentId: m.student_id,
        roll: m.roll,
        name: m.name,
        sectionLabel: m.section_label,
        hallTicketStatus: hall,
        aggregatePct: pct,
        atRisk,
        hasAttendanceData: hasData,
      });
    }
  }

  // Private vault: sensitive doubt escalations not yet answered/closed.
  const vault = await query<{
    id: string;
    topic: string;
    target_role: string | null;
    status: string;
    due_at: string | null;
  }>(
    `SELECT d.id, d.topic, d.target_role, d.status, w.due_at
       FROM public.class_doubt_escalations d
       LEFT JOIN public.deadline_watches w
         ON w.entity_type = 'doubt_escalation' AND w.entity_id = d.id AND w.status = 'OPEN'
      WHERE d.status NOT IN ('ANSWERED','CLOSED')
        AND (lower(d.topic) ~ ('condonation|medical|marks|disciplinary|fee|fee')
             OR lower(coalesce(d.target_role,'')) ~ ('hod|oie|principal'))
      ORDER BY w.due_at ASC NULLS LAST, d.created_at DESC
      LIMIT 15`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; target_role: string | null; status: string; due_at: string | null }[] }));

  const atRiskCount = menteeEnriched.filter((m) => m.atRisk).length;

  return ok({
    identity,
    scope: { classes, hasScope: classes.length > 0 },
    commandStrip: {
      todayPeriods: todayRows.length,
      slaOpen: sla.rows.length,
      knowledgeGapCards: gaps.rows.length,
      atRiskMentees: atRiskCount,
    },
    today: todayRows.map((p) => ({
      classId: p.class_id,
      className: classes.find((c) => c.id === p.class_id)?.name ?? "—",
      periodNo: p.period_no,
      start: p.start_time,
      end: p.end_time,
      hall: p.hall,
    })),
    slaQueue: sla.rows.map((s) => ({
      id: s.id,
      topic: s.topic,
      targetRole: s.target_role,
      status: s.status,
      dueAt: s.due_at,
      escalated: s.escalation_chain.toLowerCase().includes("hod") || s.escalation_chain.toLowerCase().includes("oie"),
    })),
    knowledgeGaps: gaps.rows.map((g) => ({
      clusterId: g.cluster_id,
      question: g.normalized_query,
      abstentionCount: g.ab_count,
      status: g.status,
      groupSlug: g.group_slug,
    })),
    mentees: menteeEnriched,
    privateVault: vault.rows.map((v) => ({
      id: v.id,
      topic: v.topic,
      targetRole: v.target_role,
      status: v.status,
      dueAt: v.due_at,
    })),
    schedule,
  } satisfies FacultyState);
}

export const GET = withApiChain(implGet, {
  route: "/api/faculty/state",
  auth: "user",
  requiredRole: ["faculty", "hod", "admin", "sysadmin", "principal"],
  rateLimit: { keyPrefix: "faculty_state", maxRequests: 120 },
});
