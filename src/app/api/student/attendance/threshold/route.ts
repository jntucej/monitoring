/**
 * GET /api/student/attendance/threshold
 *
 * JJR-agnostic, config-driven attendance verdict. Reads the threshold +
 * condonation floor from config_exam_eligibility_rules, real attendance from
 * attendance_records, and the condonation + debar state. The mid-term +2
 * bonus is 0 (no per-subject source in the current schema — never fabricated).
 *
 * Response: legacy contract (present/total/pct/targetPct/classesNeededToReach75/
 * status/note) PLUS a `verdict` object (JJR-agnostic hall-ticket state).
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { resolveAttendanceVerdict } from "@/server/policy/attendance-verdict";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const uid = auth.userId;

  const v = await resolveAttendanceVerdict({ userId: uid });

  // classesNeededToReach75 mirrors the legacy contract (more present records
  // required to clear the eligible threshold), derived from the verdict.
  const targetPct = v.config.eligibleMinPct;
  const classesNeeded =
    v.aggregatePct < targetPct ? v.safeBunksOrNeeded.count : 0;

  const status: "safe" | "warn" | "critical" | "no-data" | "detained" =
    v.conductedPeriods === 0
      ? "no-data"
      : v.status === "DETAINED" || v.status === "DEBARRED"
        ? "detained"
        : v.status === "ELIGIBLE" || v.status === "CONDONATION_APPROVED"
          ? "safe"
          : v.status === "CONDONATION_REQUIRED"
            ? "critical"
            : "warn";

  return ok({
    // Legacy contract (kept so existing UI keeps working)
    present: v.effectiveAttended,
    total: v.conductedPeriods,
    pct: Math.round(v.aggregatePct),
    targetPct,
    classesNeededToReach75: classesNeeded,
    status,
    // JJR-agnostic verdict (new)
    verdict: {
      status: v.status,
      aggregatePct: v.aggregatePct,
      effectiveAttended: v.effectiveAttended,
      conductedPeriods: v.conductedPeriods,
      hallTicketLocked: v.hallTicketLocked,
      forfeitCieMarks: v.forfeitCieMarks,
      safeBunksOrNeeded: v.safeBunksOrNeeded,
      condonationRemedyAvailable: v.condonationRemedyAvailable,
      activeCondonation: v.activeCondonation,
      eligibleMinPct: v.config.eligibleMinPct,
      condonationMinPct: v.config.condonationMinPct,
    },
    note:
      status === "no-data"
        ? "No attendance records yet — nothing to compute against."
        : status === "safe"
          ? "You are at or above the eligibility threshold."
          : status === "critical"
            ? "Condonation required — submit a CAC condonation application."
            : status === "detained"
              ? "Detained — attendance below the condonation floor."
              : `Attend ${classesNeeded} more class(es) to reach ${targetPct}%.`,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/attendance/threshold",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_att_threshold", maxRequests: 60 },
});
