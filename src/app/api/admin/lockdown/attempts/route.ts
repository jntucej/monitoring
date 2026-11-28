import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { findActiveLockdownRules } from "@/server/repositories/lockdown/findActive";
import type { LockdownRule } from "@/server/policy/lockdown";

/**
 * GET /api/admin/lockdown/attempts — live blocked-scan telemetry for the
 * active lockdown.
 *
 * Data sources (all real, no mocks):
 *   · Blocked attempts: audit_logs rows where action='SCAN_REJECTED' and
 *     details->>'code'='LOCKDOWN_BLOCKED', captured at recordScan time. Each
 *     row carries details.roll / gate_id / details.direction / timestamp.
 *   · Inside vs. Outside split for the rule's scope: campus_occupancy joined
 *     to users (presence IN/OUT), filtered to the scope's cohort.
 *
 * Scope safety: human identifiers only (roll, gate code, counts) — never raw
 * user UUIDs. A `user`-scoped rule reports an "individual" count.
 */

interface AttemptRow {
  roll: string | null;
  gate_id: string | null;
  direction: string | null;
  attempted_at: string;
  attempts: number;
}

/**
 * Count people in a rule's scope currently INSIDE vs OUTSIDE campus via
 * campus_occupancy. cohortFilter + params are built per scope_type.
 */
async function insideOutsideForRule(rule: LockdownRule): Promise<{
  inside: number;
  outside: number;
}> {
  let cohortFilter = "1=1";
  const params: unknown[] = [];
  switch (rule.scope_type) {
    case "campus":
    case "gate":
      break; // whole campus / gate user-base
    case "role":
      cohortFilter = "u.role = ANY($1)";
      params.push(rule.target_values);
      break;
    case "user":
      cohortFilter = "u.id = ANY($1)";
      params.push(rule.target_values);
      break;
    case "department":
      cohortFilter =
        "u.id IN (SELECT ed.user_id FROM public.employee_details ed WHERE ed.department_id = ANY($1))";
      params.push(rule.target_values);
      break;
    case "hostel_block":
      cohortFilter =
        "u.id IN (SELECT sd.user_id FROM public.student_details sd WHERE sd.hostel_block = ANY($1))";
      params.push(rule.target_values);
      break;
    case "class_section":
      cohortFilter =
        "u.id IN (SELECT sd.user_id FROM public.student_details sd WHERE CONCAT(COALESCE(sd.year::text,''),'-',COALESCE(sd.section,'')) = ANY($1))";
      params.push(rule.target_values);
      break;
    case "persona":
      // hosteller → HM/HF or current_entry_type hosteller; day_scholar → DM/DF.
      cohortFilter =
        "u.id IN (SELECT sd.user_id FROM public.student_details sd WHERE " +
        "sd.current_entry_type = ANY($1) OR (sd.student_type IN ('HM','HF') AND $1::text[] @> ARRAY['hosteller']) " +
        "OR (sd.student_type IN ('DM','DF') AND $1::text[] @> ARRAY['day_scholar']))";
      params.push(rule.target_values);
      break;
  }

  const { rows } = await query<{ inside: number; outside: number }>(
    `SELECT
        COUNT(*) FILTER (WHERE co.current_status = 'IN')  AS inside,
        COUNT(*) FILTER (WHERE co.current_status = 'OUT') AS outside
       FROM public.users u
       LEFT JOIN public.campus_occupancy co ON co.user_id = u.id
      WHERE ${cohortFilter}
        AND u.status = 'ACTIVE'`,
    params,
  ).catch(() => ({ rows: [] as { inside: number; outside: number }[] }));
  const r = rows[0];
  return { inside: Number(r?.inside ?? 0), outside: Number(r?.outside ?? 0) };
}

async function handleGet(_req: NextRequest) {
  // Live blocked attempts grouped by (roll, gate, direction). The gate id,
  // roll, and direction live INSIDE the JSONB `details` column — audit_logs
  // has no dedicated gate_id/roll columns.
  const { rows: attemptRows } = await query<AttemptRow>(
    `SELECT
        a.details->>'roll'      AS roll,
        a.details->>'gateId'    AS gate_id,
        a.details->>'direction' AS direction,
        MAX(a.timestamp)        AS attempted_at,
        COUNT(*)                AS attempts
       FROM public.audit_logs a
      WHERE a.action = 'SCAN_REJECTED'
        AND a.details->>'code' = 'LOCKDOWN_BLOCKED'
        AND a.timestamp > NOW() - INTERVAL '30 minutes'
      GROUP BY 1, 2, 3
      ORDER BY attempted_at DESC
      LIMIT 50`,
  ).catch(() => ({ rows: [] as AttemptRow[] }));

  const attempts = attemptRows.map((r) => ({
    roll: r.roll,
    gate_id: r.gate_id,
    direction: r.direction ?? null,
    attempted_at: r.attempted_at,
    attempts: Number(r.attempts),
  }));

  const rules = await findActiveLockdownRules();
  const activeRules = rules.filter((r) => r.status === "ACTIVE");

  const activeRuleViews = await Promise.all(
    activeRules.map(async (rule) => {
      const io = await insideOutsideForRule(rule);
      return {
        ruleId: rule.id,
        scope_type: rule.scope_type,
        direction: rule.direction,
        public_message: rule.public_message,
        started_at: rule.started_at,
        expires_at: rule.expires_at,
        initiated_by: rule.initiated_by,
        approved_by: rule.approved_by,
        inside: io.inside,
        outside: io.outside,
      };
    }),
  );

  // Unacknowledged: a blocked attempt that is >5 min old (no supervisor has
  // surfaced it). Flag by age of the latest attempt.
  const now = Date.now();
  const unacknowledged = attempts.filter(
    (a) => new Date(a.attempted_at).getTime() < now - 5 * 60_000,
  );

  return NextResponse.json({
    success: true,
    data: {
      attempts,
      activeRules: activeRuleViews,
      unacknowledged,
      totalBlocked: attempts.reduce((s, a) => s + a.attempts, 0),
    },
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/admin/lockdown/attempts",
  auth: "user",
  requiredRole: ["sysadmin", "admin", "principal", "supervisor", "operator"],
  rateLimit: { keyPrefix: "lockdown_attempts", maxRequests: 60 },
});
