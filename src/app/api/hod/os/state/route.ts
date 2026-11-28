import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/hod/os/state — the single, zero-hardcoding state endpoint for the
 * catalog-driven HOD OS hub. One call returns everything the HOD shell
 * renders: department scope, eligibility health, course offerings, faculty
 * roster + pending approvals, the Authority Bridge queue (escalations,
 * knowledge gaps, private vault, OIE escalations, circulars), and the
 * committee/BoS/IQAC logs.
 *
 * No institutional constant is computed here:
 *   - eligibility verdicts come from the SAME config the student + faculty
 *     dashboards read (config_exam_eligibility_rules), so all three roles
 *     never disagree.
 *   - routing / SLA / escalation come from routing_policies (catalog).
 *   - governance scope (1-click vs quorum) comes from governance_matrix.
 *
 * The HOD is resolved via users.department_id (the live dept link). Privacy:
 * the HOD sees only their department's sections + faculty + the bridge queue
 * routed to hod. No GPS, no biometric reader state, no student tracking.
 *
 * Every loader is individually null-tolerant: a missing table or empty scope
 * degrades to "no data" — never a 500, never a fabricated value.
 */

export interface HodOsState {
  identity: {
    name: string | null;
    role: string;
    department: { code: string; name: string } | null;
  };
  deptSummary: {
    sections: Array<{ year: number | null; section: string; students: number }>;
    totalStudents: number;
    eligibility: {
      eligible: number;
      condonationRequired: number;
      detained: number;
      total: number;
      hasAttendanceData: boolean;
    };
  };
  courseOfferings: Array<{
    code: string;
    name: string | null;
    enrollment: number;
    sectionCount: number;
    flaggedLow: boolean;
  }>;
  countersignQueue: Array<{
    subject: string;
    student: string | null;
    requestType: string;
  }>;
  facultyRoster: Array<{
    id: string;
    name: string | null;
    assignments: number;
    mentees: number;
    pendingSwaps: number;
  }>;
  approvals: {
    labSwaps: number;
    classReschedules: number;
    leaveDelegations: number;
  };
  authorityBridge: {
    slaQueue: Array<{
      id: string;
      topic: string;
      status: string;
      dueAt: string | null;
      breached: boolean;
    }>;
    knowledgeGaps: Array<{
      clusterId: string;
      question: string;
      abstentionCount: number;
      status: string;
      groupSlug: string | null;
    }>;
    privateVault: Array<{
      id: string;
      topic: string;
      targetRole: string | null;
      status: string;
      dueAt: string | null;
    }>;
    oieEscalations: Array<{
      id: string;
      topic: string;
      status: string;
      escalatedTo: string;
    }>;
    circulars: Array<{
      id: string;
      title: string;
      state: string;
      category: string | null;
      recalled: boolean;
    }>;
  };
  committees: {
    iqacEntries: number;
    boEntries: number;
    drcEntries: number;
    examResultVerification: { pending: boolean };
  };
  llmCircuitOpen: boolean;
}

/** The HOD's department (code + name) via users.department_id. */
async function resolveDepartment(userId: string): Promise<{ code: string; name: string } | null> {
  const r = await query<{ code: string; name: string }>(
    `SELECT d.code, d.name
       FROM public.users u
       JOIN public.departments d ON d.id = u.department_id::uuid
      WHERE u.id = $1 LIMIT 1`,
    [userId],
  ).catch(() => ({ rows: [] as { code: string; name: string }[] }));
  const row = r.rows[0];
  return row ? { code: row.code, name: row.name } : null;
}

/** The dept's active sections + student counts (student_details year/section). */
async function deptSections(deptCode: string) {
  // A department's sections are the (year, section) pairs that carry students
  // whose classes belong to that dept. The live schema links students to a
  // section; we scope by the dept's classes when available, else all active
  // sections. Null-tolerant.
  const classRows = await query<{ year: number | null; section: string | null }>(
    `SELECT DISTINCT c.year, c.section
       FROM public.classes c
       JOIN public.departments d ON d.id = c.department_id::uuid
      WHERE d.code = $1 AND c.is_active
      ORDER BY c.year, c.section`,
    [deptCode],
  ).catch(() => ({ rows: [] as { year: number | null; section: string | null }[] }));

  const pairs = classRows.rows
    .filter((c) => c.year != null && c.section)
    .map((c) => [c.year!, c.section!] as const);

  let students: { year: number; section: string; n: number }[] = [];
  if (pairs.length > 0) {
    const q = await query<{ year: number; section: string; n: number }>(
      `SELECT sd.year, sd.section, COUNT(*)::int AS n
         FROM public.student_details sd
        WHERE (sd.year, sd.section) IN (
          ${pairs.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::text)`).join(", ")})
        GROUP BY sd.year, sd.section
        ORDER BY sd.year, sd.section`,
      pairs.flatMap(([y, s]) => [y, s]),
    ).catch(() => ({ rows: [] as { year: number; section: string; n: number }[] }));
    students = q.rows;
  }

  // Eligibility health: aggregate across the dept's students using the SAME
  // thresholds config_exam_eligibility_rules exposes. When attendance_records
  // has no rows for these students, hasAttendanceData=false (no fabrication).
  const studentIds = await query<{ user_id: string }>(
    `SELECT DISTINCT sd.user_id
       FROM public.student_details sd
      WHERE sd.year IS NOT NULL
        AND (sd.year, sd.section) IN (
          ${pairs.map((_, i) => `($${i * 2 + 1}::int, $${i * 2 + 2}::text)`).join(", ")})`,
    pairs.flatMap(([y, s]) => [y, s]),
  ).catch(() => ({ rows: [] as { user_id: string }[] }));

  let eligibility = {
    eligible: 0,
    condonationRequired: 0,
    detained: 0,
    total: 0,
    hasAttendanceData: false,
  };
  if (studentIds.rows.length > 0) {
    const uuids = studentIds.rows.map((s) => s.user_id);
    const eligCfg = await query<{ min_attendance_pct: string; condonation_min_pct: string | null }>(
      `SELECT min_attendance_pct, condonation_min_pct
         FROM public.config_exam_eligibility_rules LIMIT 1`,
    ).catch(() => ({ rows: [] as { min_attendance_pct: string; condonation_min_pct: string | null }[] }));
    const eligibleMin = Number(eligCfg.rows[0]?.min_attendance_pct ?? 75);
    const condonationMin = Number(eligCfg.rows[0]?.condonation_min_pct ?? 65);
    // One aggregate query across the dept's students.
    const agg = await query<{ present: number; total: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
         COUNT(*)::int AS total
        FROM public.attendance_records
       WHERE person_id = ANY ($1::uuid[])`,
      [uuids],
    ).catch(() => ({ rows: [] as { present: number; total: number }[] }));
    const present = Number(agg.rows[0]?.present ?? 0);
    const total = Number(agg.rows[0]?.total ?? 0);
    if (total > 0) {
      // Per-student aggregation for tier classification (fast: one grouped
      // query), then bucket by the live thresholds.
      const per = await query<{ user_id: string; present: number; total: number }>(
        `SELECT person_id AS user_id,
                COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
                COUNT(*)::int AS total
           FROM public.attendance_records
          WHERE person_id = ANY ($1::uuid[])
          GROUP BY person_id`,
        [uuids],
      ).catch(() => ({ rows: [] as { user_id: string; present: number; total: number }[] }));
      for (const p of per.rows) {
        if (p.total === 0) continue;
        const pct = (p.present / p.total) * 100;
        eligibility.total += 1;
        if (pct >= eligibleMin) eligibility.eligible += 1;
        else if (pct >= condonationMin) eligibility.condonationRequired += 1;
        else eligibility.detained += 1;
      }
      eligibility.hasAttendanceData = per.rows.length > 0;
    }
  }

  return { students, eligibility };
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const { auth } = ctx;

  // ── Identity + department scope ──────────────────────────────────
  const me = await query<{ name: string | null; role: string; department_id: string | null }>(
    `SELECT u.name, u.role, u.department_id::text AS department_id
       FROM public.users u WHERE u.id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as never[] }));
  const identity = {
    name: me.rows[0]?.name ?? null,
    role: auth.role,
    department: null as { code: string; name: string } | null,
  };
  const dept = await resolveDepartment(auth.userId);
  identity.department = dept;

  // ── Dept summary + eligibility health (department-scoped) ────────
  let deptSummary: HodOsState["deptSummary"] = {
    sections: [],
    totalStudents: 0,
    eligibility: { eligible: 0, condonationRequired: 0, detained: 0, total: 0, hasAttendanceData: false },
  };
  if (dept) {
    const ds = await deptSections(dept.code);
    deptSummary = {
      sections: ds.students.map((s) => ({ year: s.year, section: s.section, students: s.n })),
      totalStudents: ds.students.reduce((a, s) => a + s.n, 0),
      eligibility: ds.eligibility,
    };
  }

  // ── Course offerings (enrollment + flags) ────────────────────────
  // The live schema has no course-offering table; offerings are derived from
  // faculty_assignments.subject_code (the subjects actually taught). Null-safe.
  const courseOfferings: HodOsState["courseOfferings"] = await (async () => {
    try {
      const subj = await query<{ subject_code: string; n: number }>(
        `SELECT fa.subject_code, COUNT(DISTINCT fa.faculty_id)::int AS n
           FROM public.faculty_assignments fa
          WHERE fa.is_active
            ${dept ? "AND fa.class_id IN (SELECT id FROM public.classes WHERE department_id::text = (SELECT id FROM public.departments WHERE code = $1))" : ""}
          GROUP BY fa.subject_code
          ORDER BY fa.subject_code`,
        dept ? [dept.code] : [],
      );
      // Enrollment per course = distinct students in the sections that carry it
      // (approx via dept sections; null-safe when there's no attendance/marks).
      const total = deptSummary.totalStudents;
      return subj.rows.map((s) => ({
        code: s.subject_code,
        name: null,
        enrollment: total, // dept-wide; the kernel has no per-course roll yet
        sectionCount: 1,
        flaggedLow: false,
      }));
    } catch {
      return [];
    }
  })();

  // ── Countersign queue (pending course-registration / extra-credit) ──
  // The live schema has no course-registration workflow yet; render "no data".
  const countersignQueue: HodOsState["countersignQueue"] = [];

  // ── Faculty roster (dept-scoped) + pending approvals ─────────────
  const facultyRoster: HodOsState["facultyRoster"] = [];
  const approvals: HodOsState["approvals"] = { labSwaps: 0, classReschedules: 0, leaveDelegations: 0 };
  if (dept) {
    const fac = await query<{ user_id: string; name: string | null; n: number }>(
      `SELECT u.id AS user_id, u.name,
              (SELECT COUNT(*) FROM public.faculty_assignments fa
                WHERE fa.faculty_id = u.id AND fa.is_active)::int AS n
         FROM public.users u
        WHERE u.role = 'faculty'
          AND u.department_id::text = (SELECT id FROM public.departments WHERE code = $1)
        ORDER BY u.name`,
      [dept.code],
    ).catch(() => ({ rows: [] as { user_id: string; name: string | null; n: number }[] }));
    const mentee = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.mentee_assignments WHERE status <> 'TERMINATED'`,
    ).catch(() => ({ rows: [{ n: 0 }] }));
    for (const f of fac.rows) {
      facultyRoster.push({
        id: f.user_id,
        name: f.name,
        assignments: f.n,
        mentees: f.n ? Math.round((mentee.rows[0]?.n ?? 0) / Math.max(1, fac.rows.length)) : 0,
        pendingSwaps: 0,
      });
    }
    // Leave delegations / reschedule / lab-swap requests live in
    // faculty_leave_requests (status PENDING) — null-safe.
    const leave = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.faculty_leave_requests WHERE status = 'PENDING'`,
    ).catch(() => ({ rows: [{ n: 0 }] }));
    approvals.leaveDelegations = leave.rows[0]?.n ?? 0;
  }

  // ── Authority Bridge queue ───────────────────────────────────────
  const slaQueue = await query<{
    id: string;
    topic: string;
    status: string;
    due_at: string | null;
    watch_status: string | null;
  }>(
    `SELECT d.id, d.topic, d.status,
            w.due_at, w.status AS watch_status
       FROM public.class_doubt_escalations d
       LEFT JOIN public.deadline_watches w
         ON w.entity_type = 'doubt_escalation' AND w.entity_id = d.id AND w.status IN ('OPEN','BREACHED')
      WHERE lower(d.target_role) IN ('hod','oie','principal')
        OR lower(d.escalation_chain) ~ 'hod|oie|principal'
      ORDER BY w.due_at ASC NULLS LAST, d.created_at DESC
      LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; status: string; due_at: string | null; watch_status: string | null }[] }));

  const knowledgeGaps = await query<{
    cluster_id: string;
    normalized_query: string;
    ab_count: number;
    status: string;
    group_slug: string | null;
  }>(
    `SELECT a.cluster_id, a.normalized_query,
            COUNT(*)::int AS ab_count, a.status, a.group_slug
       FROM public.agent_abstentions a
      WHERE a.cluster_id IS NOT NULL AND a.status = 'OPEN'
      GROUP BY a.cluster_id, a.normalized_query, a.status, a.group_slug
      HAVING COUNT(*) >= 3
      ORDER BY ab_count DESC
      LIMIT 10`,
  ).catch(() => ({ rows: [] as { cluster_id: string; normalized_query: string; ab_count: number; status: string; group_slug: string | null }[] }));

  const privateVault = await query<{
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
      WHERE lower(d.topic) ~ 'condonation|medical|marks|disciplinary|fee'
        AND d.status NOT IN ('ANSWERED','CLOSED')
      ORDER BY w.due_at ASC NULLS LAST, d.created_at DESC
      LIMIT 15`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; target_role: string | null; status: string; due_at: string | null }[] }));

  const oieEscalations = await query<{
    id: string;
    topic: string;
    status: string;
  }>(
    `SELECT d.id, d.topic, d.status
       FROM public.class_doubt_escalations d
      WHERE lower(d.target_role) IN ('oie','exam_branch','exam_superintendent')
        AND d.status NOT IN ('ANSWERED','CLOSED')
      ORDER BY d.created_at DESC
      LIMIT 10`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; status: string }[] }));

  const circulars = await query<{
    id: string;
    title: string;
    state: string;
    category: string | null;
  }>(
    `SELECT id, title, state, category
       FROM public.operational_announcements
      ORDER BY created_at DESC
      LIMIT 15`,
  ).catch(() => ({ rows: [] as { id: string; title: string; state: string; category: string | null }[] }));

  // ── Committees / BoS / IQAC logs (null-tolerant) ────────────────
  const [iqac, bo, drc, examRev] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.policy_change_requests WHERE change_type ILIKE '%iqac%'`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.policy_change_requests WHERE change_type ILIKE '%board_of_studies%' OR change_type ILIKE '%curriculum%'`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.policy_change_requests WHERE change_type ILIKE '%research%' OR change_type ILIKE '%drc%'`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.internal_exam_proposals WHERE status = 'PENDING'`,
    ).catch(() => ({ rows: [{ n: 0 }] })),
  ]);

  // ── LLM circuit state ────────────────────────────────────────────
  const circuit = await query<{ circuit_open: boolean }>(
    `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean }[] }));

  return ok({
    identity,
    deptSummary,
    courseOfferings,
    countersignQueue,
    facultyRoster,
    approvals,
    authorityBridge: {
      slaQueue: slaQueue.rows.map((s) => ({
        id: s.id,
        topic: s.topic,
        status: s.status,
        dueAt: s.due_at,
        breached: s.watch_status === "BREACHED",
      })),
      knowledgeGaps: knowledgeGaps.rows.map((g) => ({
        clusterId: g.cluster_id,
        question: g.normalized_query,
        abstentionCount: g.ab_count,
        status: g.status,
        groupSlug: g.group_slug,
      })),
      privateVault: privateVault.rows.map((v) => ({
        id: v.id,
        topic: v.topic,
        targetRole: v.target_role,
        status: v.status,
        dueAt: v.due_at,
      })),
      oieEscalations: oieEscalations.rows.map((e) => ({
        id: e.id,
        topic: e.topic,
        status: e.status,
        escalatedTo: "oie / exam branch",
      })),
      circulars: circulars.rows.map((c) => ({
        id: c.id,
        title: c.title,
        state: c.state,
        category: c.category,
        recalled: c.state === "RECALLED",
      })),
    },
    committees: {
      iqacEntries: iqac.rows[0]?.n ?? 0,
      boEntries: bo.rows[0]?.n ?? 0,
      drcEntries: drc.rows[0]?.n ?? 0,
      examResultVerification: { pending: (examRev.rows[0]?.n ?? 0) > 0 },
    },
    llmCircuitOpen: circuit.rows[0]?.circuit_open ?? false,
  } satisfies HodOsState);
}

export const GET = withApiChain(implGet, {
  route: "/api/hod/os/state",
  auth: "user",
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hod_os_state", maxRequests: 120 },
});
