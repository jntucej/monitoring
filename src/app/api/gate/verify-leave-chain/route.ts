// /api/gate/verify-leave-chain/route.ts
// The gate-side check for the hostel leave chain (STEP 3.4 critical
// control): before any manual override at the gate, the operator asks
// whether a hostel student's leave chain is complete.
//
//   GET ?studentId=...&fromTs=...&toTs=...
//   → { valid, stage, missing: [] }
//
//   valid = true only when a leave_request exists for the window with
//   status GATE_ISSUED (warden + parent both done, token issued).
//   If any link is missing the gate flag is PENDING and a manual
//   override requires Supervisor + audit reason (see the gate override
//   flow in /api/supervisor/gate-exceptions).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId")?.trim();
  const fromTs = searchParams.get("fromTs");
  const toTs = searchParams.get("toTs");
  if (!studentId) return fail("VALIDATION_ERROR", "studentId required", 400);

  const { rows } = await query<{
    id: string; status: string;
    warden_approved_at: string | null;
    parent_acknowledged_at: string | null;
    gate_issued_at: string | null;
    gate_jwt: string | null;
    from_ts: string; to_ts: string;
  }>(
    `SELECT id, status, warden_approved_at, parent_acknowledged_at,
            gate_issued_at, gate_jwt, from_ts, to_ts
       FROM public.leave_requests
      WHERE student_id = $1
        AND ($2::timestamptz IS NULL OR from_ts <= $2)
        AND ($3::timestamptz IS NULL OR to_ts >= $3)
        AND status NOT IN ('EXPIRED','REJECTED','USED')
      ORDER BY created_at DESC
      LIMIT 1`,
    [studentId, fromTs, toTs],
  );

  if (rows.length === 0) {
    return ok({
      valid: false,
      stage: "NONE",
      missing: ["WARDEN_APPROVED", "PARENT_ACKNOWLEDGED", "GATE_ISSUED"],
      message: "No active leave request for this window",
    });
  }
  const lr = rows[0];
  const missing: string[] = [];
  if (!lr.warden_approved_at) missing.push("WARDEN_APPROVED");
  if (!lr.parent_acknowledged_at) missing.push("PARENT_ACKNOWLEDGED");
  if (!lr.gate_issued_at || !lr.gate_jwt) missing.push("GATE_ISSUED");

  const valid = missing.length === 0;
  return ok({
    valid,
    stage: lr.status,
    missing,
    leaveRequestId: lr.id,
    gateJwt: valid ? lr.gate_jwt : null,
    message: valid
      ? "Leave chain complete — gate pass valid"
      : `Leave chain incomplete — missing: ${missing.join(" → ")}. Manual override requires Supervisor + audit reason.`,
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "gate-verify-leave-chain", maxRequests: 30, windowMs: 60_000 },
);
