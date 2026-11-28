/**
 * GET /api/exam/hall-ticket-eligibility
 *
 * The hall-ticket lock decision for the authenticated student, computed by the
 * config-driven policy engine (src/lib/policy-engine.ts) over REAL data:
 *   - threshold + condonation floor <- config_exam_eligibility_rules
 *   - present/total                 <- attendance_records
 *   - condonation + debar          <- attendance_condonations + student_details
 *
 * Used by the exam desk + the student academics hub to decide whether the hall
 * ticket is issued. A student with 0 attendance records gets a clear
 * "no-data" verdict (never a fabricated pass/fail).
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { resolveAttendanceVerdict } from "@/server/policy/attendance-verdict";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  let v;
  try {
    v = await resolveAttendanceVerdict({ userId: auth.userId });
  } catch (err) {
    return fail("POLICY_RESOLUTION_FAILED", "Could not compute eligibility.", 500);
  }

  return ok({
    status: v.status,
    hallTicketLocked: v.hallTicketLocked,
    forfeitCieMarks: v.forfeitCieMarks,
    aggregatePct: v.aggregatePct,
    effectiveAttended: v.effectiveAttended,
    conductedPeriods: v.conductedPeriods,
    safeBunksOrNeeded: v.safeBunksOrNeeded,
    eligibleMinPct: v.config.eligibleMinPct,
    condonationMinPct: v.config.condonationMinPct,
    condonationRemedyAvailable: v.condonationRemedyAvailable,
    activeCondonation: v.activeCondonation,
    hasData: v.conductedPeriods > 0,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/exam/hall-ticket-eligibility",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "hall_ticket_eligibility", maxRequests: 120 },
});
