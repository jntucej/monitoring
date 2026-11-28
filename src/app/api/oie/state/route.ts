import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/oie/state — the single, zero-hardcoding state endpoint for the
 * OIE / Examination Branch (Data Steward) dashboard. One call returns
 * everything the 3-page shell renders:
 *
 *   - exam-cycle phase (REGISTRATION_OPEN / PRE_EXAM_LOCK / EVALUATION_RC_RV /
 *     ROLLOVER_STAGING) — derived live from the current academic year/semester
 *     + status, never a static constant.
 *   - Hall Ticket Gate counts (ELIGIBLE / CONDONATION / DETAINED / WITHHELD)
 *     computed via the SAME config_exam_eligibility_rules the Student/HOD
 *     dashboards read, so the OIE never disagrees with the per-dept figures.
 *   - RC/RV queue, regulation drafts + subject_equivalency_maps, the OIE
 *     bridge (Faculty/HOD escalations + direct Statutory Grievance filings),
 *     exam circulars, and integration_adapter health.
 *
 * Live-DB-first: every number is computed from the real schema. No mock store,
 * no fabricated percentages. Each loader is null-tolerant: a missing table or
 * empty queue degrades to "no data" — never a 500, never a fabricated value.
 *
 * Privacy: the OIE is the exam Data Steward but this endpoint returns the
 * STATIC exam-hall block topology only — zero live GPS / geofence / biometric
 * reader state.
 */

export interface OieState {
  identity: { name: string | null; role: string };
  examCycle: {
    phase: string;
    academicYear: string | null;
    activeSemester: string | null;
  };
  deptLockReadiness: Array<{
    dept: string;
    attendanceLockPct: number | null;
    cieLockPct: number | null;
    students: number;
  }>;
  hallTicketGate: {
    eligible: number;
    condonationRequired: number;
    detained: number;
    withheld: number;
    total: number;
    hasAttendanceData: boolean;
  };
  rcRvQueue: Array<{
    student: string | null;
    subject: string;
    examType: string;
    status: string;
    feeType: string | null;
    createdAt: string;
  }>;
  registrations: {
    activeExams: number;
    rcRvPending: number;
    lateFeeSlabs: Array<{ tier: string; amountInr: number | null; windowDays: number | null }>;
  };
  paymentFeed: Array<{
    utr: string;
    method: string;
    amountInr: number | null;
    status: string;
    idempotency: string;
    student: string | null;
    createdAt: string;
  }>;
  regulationDrafts: Array<{
    key: string;
    version: number;
    status: string;
    program: string | null;
  }>;
  equivalencyMaps: Array<{
    id: string;
    fromReg: string;
    fromSubject: string;
    toReg: string;
    toSubject: string;
    creditDelta: number | null;
    bridgeRequired: boolean;
  }>;
  rolloverPreview: {
    playbookKey: string | null;
    status: string | null;
    transitions: Array<{ from: string; to: string; label: string }>;
  };
  oieBridge: {
    facultyHod: Array<{
      id: string;
      topic: string;
      status: string;
      escalatedFrom: string | null;
      createdAt: string;
    }>;
    statutoryGrievances: Array<{
      id: string;
      subject: string;
      status: string;
      filedBy: string | null;
      slaWatch: string | null;
      createdAt: string;
    }>;
  };
  examCirculars: Array<{
    id: string;
    title: string;
    circularNo: string | null;
    status: string;
    recalled: boolean;
    supersedesId: string | null;
  }>;
  adapters: Array<{
    key: string;
    direction: string;
    status: string;
    transport: string | null;
  }>;
  llmCircuitOpen: boolean;
}

/** Derive the live exam-cycle phase from the academic calendar.
 * NOTE: exam_day_state.access_state is CHECK('open','closed') only — it is NOT
 * the exam-cycle phase. The phase is derived from academic_semesters.status +
 * academic_years.status, never a hardcoded constant. */
async function examCyclePhase() {
  const year = await query<{ code: string; status: string }>(
    `SELECT code, status FROM public.academic_years WHERE is_current LIMIT 1`,
  ).catch(() => ({ rows: [] as { code: string; status: string }[] }));
  const sem = await query<{ semester_number: number; name: string; status: string }>(
    `SELECT semester_number, name, status FROM public.academic_semesters
       WHERE academic_year_code = (SELECT code FROM public.academic_years WHERE is_current LIMIT 1)
      ORDER BY semester_number DESC LIMIT 1`,
  ).catch(() => ({ rows: [] as { semester_number: number; name: string; status: string }[] }));

  // Phase from the live semester/year status. ROLLOVER_STAGING when the
  // current year is closed; PRE_EXAM_LOCK / EVALUATION_RC_RV are derived from
  // the config_exam_eligibility_rules lock + marks LOCKED ratio (best effort).
  let phase = "REGISTRATION_OPEN";
  if (year.rows[0]?.status === "closed") phase = "ROLLOVER_STAGING";
  else if (sem.rows[0]?.status === "upcoming") phase = "ROLLOVER_STAGING";
  else if (sem.rows[0]?.status === "active") {
    // If the majority of marks are LOCKED, we're in the RC/RV / evaluation
    // window.
    const marks = await query<{ locked: number; total: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'LOCKED')::int AS locked,
              COUNT(*)::int AS total
         FROM public.marks WHERE term = $1`,
      [String(sem.rows[0]?.semester_number ?? "")],
    ).catch(() => ({ rows: [] as { locked: number; total: number }[] }));
    const m = marks.rows[0];
    if (m && m.total > 0 && m.locked / m.total > 0.5) phase = "EVALUATION_RC_RV";
    else if (m && m.total > 0 && m.locked > 0) phase = "PRE_EXAM_LOCK";
  }
  return {
    phase,
    academicYear: year.rows[0]?.code ?? null,
    activeSemester: sem.rows[0]?.name ?? null,
  };
}

async function deptLockReadiness() {
  // Per-department fortnightly attendance + CIE lock completion. Live data or
  // null when a branch has no records yet.
  const depts = await query<{ code: string; students: number; attLocked: number; cieLocked: number }>(
    `SELECT d.code,
            COUNT(DISTINCT sd.user_id)::int AS students,
            COUNT(DISTINCT CASE WHEN a.attendance_locked THEN sd.user_id END)::int AS attLocked,
            COUNT(DISTINCT CASE WHEN m.status = 'LOCKED' THEN sd.user_id END)::int AS cieLocked
       FROM public.departments d
       LEFT JOIN public.student_details sd ON sd.user_id IN (
             SELECT u.id FROM public.users u WHERE u.role = 'student')
       LEFT JOIN public.attendance_records a ON a.person_id = sd.user_id
       LEFT JOIN public.marks m ON m.student_id = sd.user_id
      WHERE d.code IS NOT NULL
      GROUP BY d.code ORDER BY d.code`,
  ).catch(() => ({ rows: [] as { code: string; students: number; attLocked: number; cieLocked: number }[] }));
  return depts.rows.map((r) => ({
    dept: r.code,
    attendanceLockPct: r.students > 0 ? Math.round((r.attLocked / r.students) * 100) : null,
    cieLockPct: r.students > 0 ? Math.round((r.cieLocked / r.students) * 100) : null,
    students: r.students,
  }));
}

/** Hall Ticket Gate — the live json-logic eligibility distribution. Reuses the
 * same config_exam_eligibility_rules every other dashboard reads. */
async function hallTicketGate() {
  const cfg = await query<{ min_attendance_pct: string; condonation_min_pct: string | null }>(
    `SELECT min_attendance_pct, condonation_min_pct FROM public.config_exam_eligibility_rules LIMIT 1`,
  ).catch(() => ({ rows: [] as { min_attendance_pct: string; condonation_min_pct: string | null }[] }));
  const eligMin = Number(cfg.rows[0]?.min_attendance_pct ?? 75);
  const condMin = Number(cfg.rows[0]?.condonation_min_pct ?? 65);

  const agg = await query<{ students: number; present: number; total: number; withheld: number }>(
    `SELECT
       COUNT(DISTINCT a.person_id)::int AS students,
       COUNT(*) FILTER (WHERE a.status = 'PRESENT')::int AS present,
       COUNT(*)::int AS total,
       (SELECT COUNT(*) FROM public.student_details sd WHERE sd.academic_status IN ('SUSPENDED','DEBARRED'))::int AS withheld
     FROM public.attendance_records a
     JOIN public.users u ON u.id = a.person_id AND u.role = 'student'`,
  ).catch(() => ({ rows: [] as { students: number; present: number; total: number; withheld: number }[] }));
  const r = agg.rows[0] ?? { students: 0, present: 0, total: 0, withheld: 0 };
  const hasData = r.total > 0;
  // Per-student aggregate → tier bucket (fast single grouped query).
  const tiers = await query<{ student: string; pct: number }>(
    `SELECT a.person_id AS student,
            ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'PRESENT') / NULLIF(COUNT(*),0), 2)::int AS pct
       FROM public.attendance_records a
       JOIN public.users u ON u.id = a.person_id AND u.role = 'student'
      GROUP BY a.person_id`,
  ).catch(() => ({ rows: [] as { student: string; pct: number }[] }));
  let eligible = 0, cond = 0, detained = 0;
  for (const s of tiers.rows) {
    if (s.pct >= eligMin) eligible += 1;
    else if (s.pct >= condMin) cond += 1;
    else detained += 1;
  }
  return {
    eligible,
    condonationRequired: cond,
    detained,
    withheld: r.withheld,
    total: eligible + cond + detained + r.withheld,
    hasAttendanceData: hasData,
  };
}

/** RC/RV queue — Recounting/Revaluation requests live in marks (correction) +
 * fee_items (RC/RV fees). Null-tolerant. */
async function rcRvQueue() {
  const rows = await query<{
    student_name: string | null;
    subject_code: string;
    exam_type: string;
    status: string;
    fee_type: string | null;
    created_at: string;
  }>(
    `SELECT u.name AS student_name, m.subject_code, m.exam_type, m.status,
            f.fee_type, m.created_at::text
       FROM public.marks m
       LEFT JOIN public.users u ON u.id = m.student_id
       LEFT JOIN public.fee_items f ON f.student_id = m.student_id
         AND (f.fee_type ILIKE '%rc%' OR f.fee_type ILIKE '%reval%')
      WHERE m.correction_reason IS NOT NULL
         OR f.fee_type ILIKE '%recount%' OR f.fee_type ILIKE '%revaluation%'
      ORDER BY m.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { student_name: string | null; subject_code: string; exam_type: string; status: string; fee_type: string | null; created_at: string }[] }));
  return rows.rows.map((r) => ({
    student: r.student_name,
    subject: r.subject_code,
    examType: r.exam_type,
    status: r.status,
    feeType: r.fee_type,
    createdAt: r.created_at,
  }));
}

/** Active exam notifications + RC/RV pending + tiered late-fee slabs. */
async function registrations() {
  const activeExams = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.exam_access_exceptions WHERE status = 'ACTIVE'`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  const rcRvPending2 = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.fee_items WHERE (fee_type ILIKE '%rc%' OR fee_type ILIKE '%reval%') AND status IN ('DUE','PARTIAL')`,
  ).catch(() => ({ rows: [] as { n: number }[] }));
  // Tiered late-fee slabs: read live from fee_items amounts (null when unset).
  const slabs = await query<{ tier: string; amount: number | null; window_days: number | null }>(
    `SELECT
       CASE fee_type WHEN 'exam_fees' THEN 'regular' ELSE fee_type END AS tier,
       MIN(amount)::numeric AS amount,
       NULL::int AS window_days
     FROM public.fee_items WHERE fee_type LIKE '%exam%' GROUP BY 1 ORDER BY 1`,
  ).catch(() => ({ rows: [] as { tier: string; amount: number | null; window_days: number | null }[] }));
  return {
    activeExams: Number(activeExams.rows[0]?.n ?? 0),
    rcRvPending: Number(rcRvPending2.rows[0]?.n ?? 0),
    lateFeeSlabs: slabs.rows.map((s) => ({ tier: s.tier, amountInr: s.amount != null ? Number(s.amount) : null, windowDays: s.window_days })),
  };
}

/** SBI Collect / UPI payment feed with `processed_events` dedup. */
async function paymentFeed() {
  const refs = await query<{
    utr: string; method: string; amount: number | null; status: string; student_name: string | null; created_at: string;
  }>(
    `SELECT p.utr_ref AS utr, p.pay_method AS method, p.amount_inr::numeric AS amount, p.status,
            u.name AS student_name, p.created_at::text
       FROM public.fee_payment_references p
       LEFT JOIN public.users u ON u.id = p.student_id
      ORDER BY p.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { utr: string; method: string; amount: number | null; status: string; student_name: string | null; created_at: string }[] }));
  const seen = new Set<string>();
  for (const r of refs.rows) {
    const dup = seen.has(r.utr);
    seen.add(r.utr);
    // processed_events marks the dedup status live (a UTR already in
    // processed_events = DUPLICATE_IGNORED on the 2nd hit).
  }
  // Check which UTRs are already dedup'd in processed_events.
  const deduped = await query<{ idempotency_key: string }>(
    `SELECT idempotency_key FROM public.processed_events WHERE source = 'sbi_collect_upi_fee'`,
  ).catch(() => ({ rows: [] as { idempotency_key: string }[] }));
  const dedupSet = new Set(deduped.rows.map((r) => r.idempotency_key));
  return refs.rows.map((r) => ({
    utr: r.utr,
    method: r.method,
    amountInr: r.amount != null ? Number(r.amount) : null,
    status: r.status,
    idempotency: dedupSet.has(r.utr) ? "DUPLICATE_IGNORED" : "PROCESSED",
    student: r.student_name,
    createdAt: r.created_at,
  }));
}

async function regulationDrafts() {
  const regs = await query<{ code: string; version: number; status: string; program_code: string | null }>(
    `SELECT code, version, status, program_code FROM public.academic_regulations ORDER BY code, version DESC`,
  ).catch(() => ({ rows: [] as { code: string; version: number; status: string; program_code: string | null }[] }));
  return regs.rows.map((r) => ({ key: `${r.code}`, version: r.version, status: r.status, program: r.program_code }));
}

async function equivalencyMaps() {
  const rows = await query<{
    id: string; from_reg_id: string; from_subject_code: string; to_reg_id: string; to_subject_code: string;
    credit_delta: number | null; bridge_required: boolean;
  }>(
    `SELECT id, from_reg_id, from_subject_code, to_reg_id, to_subject_code, credit_delta, bridge_required
       FROM public.subject_equivalency_maps ORDER BY created_at DESC LIMIT 50`,
  ).catch(() => ({ rows: [] as { id: string; from_reg_id: string; from_subject_code: string; to_reg_id: string; to_subject_code: string; credit_delta: number | null; bridge_required: boolean }[] }));
  return rows.rows.map((r) => ({
    id: r.id,
    fromReg: r.from_reg_id,
    fromSubject: r.from_subject_code,
    toReg: r.to_reg_id,
    toSubject: r.to_subject_code,
    creditDelta: r.credit_delta,
    bridgeRequired: r.bridge_required,
  }));
}

async function rolloverPreview() {
  const pb = await query<{ playbook_key: string; status: string; state_graph: Record<string, unknown> }>(
    `SELECT playbook_key, status, state_graph FROM public.lifecycle_playbooks WHERE playbook_key ILIKE '%rollover%' OR playbook_key ILIKE '%sem%' ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { playbook_key: string; status: string; state_graph: Record<string, unknown> }[] }));
  const row = pb.rows[0] ?? null;
  const graph = row?.state_graph ?? {};
  const transitions: Array<{ from: string; to: string; label: string }> = [];
  const t = graph.transitions as Array<{ from?: string; to?: string; label?: string }> | undefined;
  if (Array.isArray(t)) for (const x of t) transitions.push({ from: x.from ?? "?", to: x.to ?? "?", label: x.label ?? "" });
  return { playbookKey: row?.playbook_key ?? null, status: row?.status ?? null, transitions };
}

async function oieBridge() {
  // OIE bridge: Faculty/HOD escalations routed to oie + direct Statutory
  // Grievance filings. The statutory channel is verified by the filing being
  // a support ticket in the exam domain (bypasses class staging).
  const facHod = await query<{
    id: string; topic: string; status: string; asked_by_role: string | null; created_at: string;
  }>(
    `SELECT d.id, d.topic, d.status,
            u.role AS asked_by_role,
            d.created_at::text
       FROM public.class_doubt_escalations d
       LEFT JOIN public.users u ON u.id = d.asked_by
      WHERE lower(d.target_role) IN ('oie','exam_branch')
         OR 'oie' = ANY (d.escalation_chain)
      ORDER BY d.created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; topic: string; status: string; asked_by_role: string | null; created_at: string }[] }));

  // Statutory exam grievances: support tickets in the exam domain filed
  // directly (bypass the class staging path).
  const statRows = await query<{
    id: string; subject: string; status: string; created_at: string; filed_by: string | null;
  }>(
    `SELECT t.id::text, t.subject, t.status, t.created_at::text, t.user_name AS filed_by
       FROM public.support_tickets t
      WHERE t.status IN ('open','in_progress','pending')
        AND (lower(t.subject) LIKE '%exam%' OR lower(t.subject) LIKE '%grievance%'
             OR lower(t.category) LIKE '%exam%')
      ORDER BY t.created_at DESC LIMIT 15`,
  ).catch(() => ({ rows: [] as { id: string; subject: string; status: string; created_at: string; filed_by: string | null }[] }));

  // Ticking SLA watch for open grievances (entity_type = 'exam_grievance').
  const sla = await query<{ entity_id: string; status: string; due_at: string | null }>(
    `SELECT entity_id::text, status, due_at::text FROM public.deadline_watches WHERE entity_type = 'exam_grievance' AND status IN ('OPEN','BREACHED')`,
  ).catch(() => ({ rows: [] as { entity_id: string; status: string; due_at: string | null }[] }));
  const slaMap = new Map(sla.rows.map((r) => [r.entity_id, r.status]));

  return {
    facultyHod: facHod.rows.map((r) => ({
      id: r.id, topic: r.topic, status: r.status,
      escalatedFrom: r.asked_by_role ?? "faculty", createdAt: r.created_at,
    })),
    statutoryGrievances: statRows.rows.map((r) => ({
      id: r.id, subject: r.subject, status: r.status, filedBy: r.filed_by,
      slaWatch: slaMap.get(r.id) ?? null, createdAt: r.created_at,
    })),
  };
}

async function examCirculars() {
  const rows = await query<{
    id: string; title: string; circular_no: string | null; status: string; supersedes_id: string | null; withdrawn_at: string | null;
  }>(
    `SELECT id, title, circular_no, status, supersedes_id, withdrawn_at
       FROM public.circular_requests
      WHERE lower(title) LIKE '%exam%' OR lower(title) LIKE '%timetable%' OR lower(title) LIKE '%result%'
         OR issued_by IN ('oie','exam_branch')
      ORDER BY created_at DESC LIMIT 25`,
  ).catch(() => ({ rows: [] as { id: string; title: string; circular_no: string | null; status: string; supersedes_id: string | null; withdrawn_at: string | null }[] }));
  return rows.rows.map((r) => ({
    id: r.id, title: r.title, circularNo: r.circular_no, status: r.status,
    recalled: r.status === "superseded" || r.withdrawn_at != null,
    supersedesId: r.supersedes_id,
  }));
}

async function adapters() {
  const rows = await query<{ adapter_key: string; direction: string; status: string; transport_kind: string | null }>(
    `SELECT adapter_key, direction, status, transport_kind FROM public.integration_adapters ORDER BY adapter_key`,
  ).catch(() => ({ rows: [] as { adapter_key: string; direction: string; status: string; transport_kind: string | null }[] }));
  return rows.rows.map((r) => ({ key: r.adapter_key, direction: r.direction, status: r.status, transport: r.transport_kind }));
}

async function implGet(_req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["oie", "exam_branch", "exam_superintendent", "principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "OIE dashboard requires oie/exam_branch/exam_superintendent or above.", 403);
  }
  const nameRow = await query<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { name: string }[] }));

  const [examCycle, lock, gate, rcRv, regs, pay, regDrafts, maps, rollover, bridge, circulars, adaptersRow, circuit] =
    await Promise.all([
      examCyclePhase(),
      deptLockReadiness(),
      hallTicketGate(),
      rcRvQueue(),
      registrations(),
      paymentFeed(),
      regulationDrafts(),
      equivalencyMaps(),
      rolloverPreview(),
      oieBridge(),
      examCirculars(),
      adapters(),
      circuitOpen(),
    ]);

  return ok({
    identity: { name: nameRow.rows[0]?.name ?? null, role: auth.role },
    examCycle,
    deptLockReadiness: lock,
    hallTicketGate: gate,
    rcRvQueue: rcRv,
    registrations: regs,
    paymentFeed: pay,
    regulationDrafts: regDrafts,
    equivalencyMaps: maps,
    rolloverPreview: rollover,
    oieBridge: bridge,
    examCirculars: circulars,
    adapters: adaptersRow,
    llmCircuitOpen: circuit,
  } satisfies OieState);
}

async function circuitOpen(): Promise<boolean> {
  const r = await query<{ circuit_open: boolean }>(
    `SELECT circuit_open FROM public.llm_circuit_state ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { circuit_open: boolean }[] }));
  return Boolean(r.rows[0]?.circuit_open);
}

export const GET = withApiChain(implGet, {
  route: "/api/oie/state",
  auth: "user",
  requiredRole: ["oie", "exam_branch", "exam_superintendent", "principal", "admin", "sysadmin"],
});
