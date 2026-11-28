/**
 * GET /api/student/attendance/threshold
 *
 * Returns the exact number of additional classes the student must attend to
 * reach (or stay at) the 75% threshold, derived from REAL attendance_records
 * (no fabrication). attendance_records has no per-subject column, so this is
 * computed on overall attendance (the same source /api/student/attendance uses).
 *
 * Response:
 *   present, total, pct,
 *   targetPct (75),
 *   classesNeededToReach75: >=0 number of MORE present records required,
 *   status: "safe" | "warn" | "critical" | "no-data"
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const uid = auth.userId;

  const { rows } = await query<{ present: number; total: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
       COUNT(*)::int AS total
     FROM public.attendance_records
    WHERE person_id = $1::uuid`,
    [uid],
  );

  const present = Number(rows[0]?.present ?? 0);
  const total = Number(rows[0]?.total ?? 0);
  const targetPct = 75;

  if (total === 0) {
    return ok({
      present,
      total,
      pct: 0,
      targetPct,
      classesNeededToReach75: 0,
      status: "no-data" as const,
      note: "No attendance records yet — nothing to compute against.",
    });
  }

  // To hit 75% after `k` more PRESENT classes:
  //   (present + k) / (total + k) >= 0.75
  //   => present + k >= 0.75*total + 0.75*k
  //   => k*(1 - 0.75) >= 0.75*total - present
  //   => k >= (0.75*total - present) / 0.25
  const deficit = 0.75 * total - present;
  const classesNeededToReach75 = deficit > 0 ? Math.ceil(deficit / 0.25) : 0;
  const pct = Math.round((present / total) * 100);

  const status =
    pct >= 75 ? "safe" : pct >= 70 ? "warn" : "critical";

  return ok({
    present,
    total,
    pct,
    targetPct,
    classesNeededToReach75,
    status,
    note:
      status === "safe"
        ? "You are at or above the 75% threshold."
        : `Attend ${classesNeededToReach75} more class(es) to reach 75%.`,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/attendance/threshold",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_att_threshold", maxRequests: 60 },
});
