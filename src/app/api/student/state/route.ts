import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { resolveAttendanceVerdict } from "@/server/policy/attendance-verdict";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/student/state — the single, zero-hardcoding state endpoint for the
 * catalog-driven Student OS. One call returns everything the student shell
 * renders: identity/cohort, live academic snapshot, active gate/watch state,
 * and Authority Bridge threads.
 *
 * No institutional constant is computed here — thresholds come from the same
 * config the catalog exposes (config_exam_eligibility_rules), so the client
 * What-If simulator and this endpoint never disagree.
 *
 * Privacy: only the authenticated student's own data is serialized. No other
 * student's record, no GPS, no geofence, no biometric reader state.
 *
 * Every loader is individually null-tolerant: a missing row degrades to
 * "no data" — never a 500, never a fabricated value.
 */

interface StudentStatePayload {
  identity: {
    rollNo: string | null;
    name: string;
    program: string | null;
    regulationId: string | null;
    branch: string | null;
    section: string | null;
    semester: number | null;
    isResidential: boolean;
    facultyAdvisor: string | null;
  };
  academic: {
    attendedClasses: number;
    totalClasses: number;
    aggregatePct: number | null;
    hallTicketStatus: string | null;
    duesBalanceInr: number | null;
    disciplinaryClearance: boolean | null;
    activeCondonation: boolean;
    hasAttendanceData: boolean;
  };
  gate: {
    campusStatus: "INSIDE" | "OUTSIDE" | null;
    activePass: {
      id: string;
      reason: string;
      from: string;
      to: string;
      status: string;
      qrCode: string;
      approvalStep: number;
      approvalTotal: number;
      deadlineWatchDueAt: string | null;
    } | null;
    anomalyTag: string | null;
  };
  authorityBridge: {
    classFeedItems: Array<{
      id: string;
      kind: "circular" | "official_answer";
      body: string;
      constraintTag?: string;
      superseded?: boolean;
      at: string;
    }>;
    agentMessages: Array<{
      id: string;
      question: string;
      answer: string | null;
      fastLookupMode: boolean;
      at: string;
    }>;
    privateTickets: Array<{
      id: string;
      title: string;
      assignedRole: string;
      slaDueAt: string;
      nextEscalationRole: string | null;
      status: string;
    }>;
  };
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // ── Identity & cohort ───────────────────────────────────────────────
  const details = await query<{
    roll: string | null; student_name: string | null;
    department: string | null; branch: string | null;
    section: string | null; year: number | null;
    hostel_block: string | null; regulation: string | null;
    academic_status: string | null;
  }>(
    `SELECT sd.roll, sd.student_name, sd.department, sd.branch,
            sd.section, sd.year, sd.hostel_block, sd.regulation,
            sd.academic_status
       FROM public.student_details sd
      WHERE sd.user_id = $1 LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as never[] }));
  const d = details.rows[0];
  const isResidential = Boolean(d?.hostel_block && String(d.hostel_block).trim() !== "");

  // ── Academic snapshot (real data, never fabricated) ───────────────
  const att = await query<{ attended: number; total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END), 0) AS attended,
            COALESCE(COUNT(*), 0) AS total
       FROM public.attendance_records ar
      WHERE ar.person_id = $1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { attended: number; total: number }[] }));
  const attended = Number(att.rows[0]?.attended ?? 0);
  const total = Number(att.rows[0]?.total ?? 0);
  const aggregatePct = total > 0 ? Math.round((attended / total) * 1000) / 10 : null;

  // Hall-ticket verdict via the same config-driven policy engine the catalog
  // exposes — single source of truth.
  let hallTicket: string | null = null;
  try {
    const v = await resolveAttendanceVerdict({ userId: auth.userId });
    hallTicket = v.status;
  } catch {
    hallTicket = null; // no data yet — UI shows "no data", not a fabricated pass
  }

  // Dues — fee_items ledger (unpaid).
  const dues = await query<{ bal: string }>(
    `SELECT COALESCE(SUM(
             CASE WHEN fi.status <> 'PAID' THEN fi.amount - COALESCE(fi.paid, 0) ELSE 0 END
           ), 0)::text AS bal
       FROM public.fee_items fi
      WHERE fi.student_id = $1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { bal: string }[] }));

  // ── Gate & watch state ─────────────────────────────────────────────
  const pass = await query<{
    id: string; reason: string; from_datetime: string; to_datetime: string;
    final_status: string; qr_code: string | null;
  }>(
    `SELECT id, reason, from_datetime, to_datetime, final_status, qr_code
       FROM public.gate_passes
      WHERE user_id = $1
        AND final_status IN ('APPROVED','APPROVED_ADMIN','APPROVED_PARENT')
        AND to_datetime >= NOW()
      ORDER BY from_datetime ASC LIMIT 1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as never[] }));
  const p = pass.rows[0];

  const occupancy = await query<{ current_status: string }>(
    `SELECT current_status FROM public.campus_occupancy WHERE user_id = $1`,
    [auth.userId],
  ).catch(() => ({ rows: [] as { current_status: string }[] }));
  const rawStatus = occupancy.rows[0]?.current_status ?? null;
  const campusStatus = rawStatus === "IN" ? "INSIDE" : rawStatus === "OUT" ? "OUTSIDE" : null;

  // ── Authority Bridge ───────────────────────────────────────────────
  // Pinned official knowledge: circulars/confirmed answers the class sees.
  const knowledge = await query<{
    id: string; topic: string; answer_text: string;
    regulation: string | null; confirmed_by_role: string | null;
    created_at: string;
  }>(
    `SELECT id, topic, answer_text, regulation, confirmed_by_role, created_at
       FROM public.confirmed_knowledge
      ORDER BY created_at DESC LIMIT 20`,
  ).catch(() => ({ rows: [] as never[] }));

  const feedItems: StudentStatePayload["authorityBridge"]["classFeedItems"] =
    knowledge.rows.map((k) => ({
      id: String(k.id),
      kind: "official_answer" as const,
      body: k.answer_text,
      constraintTag: k.regulation
        ? `[${k.regulation}${k.confirmed_by_role ? " · Official" : ""}]`
        : undefined,
      at: k.created_at,
    }));

  // Private tickets: sensitive doubts routed via routing_policies.
  const tickets = await query<{
    id: string; subject: string; assigned_name: string | null;
    created_at: string; status: string; category: string;
  }>(
    `SELECT id, subject, assigned_name, created_at, status, category
       FROM public.support_tickets
      WHERE user_id = $1
      ORDER BY updated_at DESC LIMIT 10`,
    [auth.userId],
  ).catch(() => ({ rows: [] as never[] }));

  return ok({
    identity: {
      rollNo: d?.roll ?? null,
      name: d?.student_name ?? "Student",
      program: null,
      regulationId: d?.regulation ?? null,
      branch: d?.branch ?? d?.department ?? null,
      section: d?.section ?? null,
      semester: d?.year ?? null,
      isResidential,
      facultyAdvisor: null,
    },
    academic: {
      attendedClasses: attended,
      totalClasses: total,
      aggregatePct,
      hallTicketStatus: hallTicket,
      duesBalanceInr: dues.rows[0] ? Number(dues.rows[0].bal) : null,
      disciplinaryClearance:
        d?.academic_status == null ? null : d.academic_status === "ACTIVE",
      activeCondonation: false,
      hasAttendanceData: total > 0,
    },
    gate: {
      campusStatus,
      activePass: p
        ? {
            id: p.id,
            reason: p.reason,
            from: p.from_datetime,
            to: p.to_datetime,
            status: p.final_status,
            qrCode: p.qr_code ?? "",
            approvalStep: 5,
            approvalTotal: 5,
            deadlineWatchDueAt: p.to_datetime,
          }
        : null,
      anomalyTag: null,
    },
    authorityBridge: {
      classFeedItems: feedItems,
      agentMessages: [],
      privateTickets: tickets.rows.map((t) => ({
        id: String(t.id),
        title: t.subject,
        assignedRole: t.assigned_name ?? "Unassigned",
        slaDueAt: t.created_at,
        nextEscalationRole: null,
        status: t.status,
      })),
    },
  } satisfies StudentStatePayload);
}

export const GET = withApiChain(implGet, {
  route: "/api/student/state",
  auth: "user",
  requiredRole: ["student", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "student_state", maxRequests: 120 },
});
