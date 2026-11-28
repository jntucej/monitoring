// /api/attendance/condonation/[id]
//
// Approver-side transitions for the condonation chain:
//   HOD endorsement   -> PENDING_HOD   -> PENDING_CAC  (hod)
//   CAC/Principal     -> PENDING_CAC   -> APPROVED | REJECTED  (principal)
//   Fee cleared (any) -> flips fee_cleared = true
//
// The status flips are the only thing that can unlock the student's hall
// ticket (the engine reads APPROVED + fee_cleared). Every transition is
// audit-logged.
import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";
import type { AuthContext } from "@/lib/authContext";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const condonationId = req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1)[0];
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    resolutionNo?: string;
    feeChallanRef?: string;
    reason?: string;
  } | null;
  if (!body?.action) return fail("VALIDATION_ERROR", "action required", 400);

  const { rows } = await query<{ status: string; student_id: string }>(
    `SELECT status, student_id FROM public.attendance_condonations WHERE id = $1::uuid`,
    [condonationId],
  );
  if (rows.length === 0) return fail("NOT_FOUND", "Condonation not found", 404);
  const current = rows[0].status;

  switch (body.action) {
    case "ENDORSE_HOD": {
      if (auth.role !== "hod") return fail("FORBIDDEN", "HOD required", 403);
      if (current !== "PENDING_HOD") return fail("INVALID_STATE", `Cannot endorse from ${current}`, 409);
      await query(
        `UPDATE public.attendance_condonations
            SET status = 'PENDING_CAC', hod_endorsed_by = $2::uuid, hod_endorsed_at = NOW()
          WHERE id = $1::uuid`,
        [condonationId, auth.userId],
      );
      await recordMutationAudit({
        actorId: auth.userId, roleContext: auth.role, action: "condonation_endorse_hod",
        resource: "attendance_condonations", resourceId: condonationId,
        afterState: { status: "PENDING_CAC" },
      });
      return ok({ condonationId, status: "PENDING_CAC" });
    }

    case "DECIDE_CAC": {
      if (auth.role !== "principal") return fail("FORBIDDEN", "Principal (CAC Chair) required", 403);
      if (current !== "PENDING_CAC") return fail("INVALID_STATE", `Cannot decide from ${current}`, 409);
      const approve = body.resolutionNo ? "APPROVED" : "REJECTED";
      await query(
        `UPDATE public.attendance_condonations
            SET status = $3, cac_resolution_no = $4, cac_decided_by = $5::uuid, cac_decided_at = NOW()
          WHERE id = $1::uuid`,
        [condonationId, auth.userId, approve, body.resolutionNo ?? null],
      );
      await recordMutationAudit({
        actorId: auth.userId, roleContext: auth.role, action: "condonation_decide_cac",
        resource: "attendance_condonations", resourceId: condonationId,
        afterState: { status: approve, resolutionNo: body.resolutionNo ?? null },
      });
      return ok({ condonationId, status: approve });
    }

    case "MARK_FEE_CLEARED": {
      if (auth.role !== "admin" && auth.role !== "sysadmin" && auth.role !== "principal") {
        return fail("FORBIDDEN", "Admin or Principal required to clear the fee", 403);
      }
      await query(
        `UPDATE public.attendance_condonations
            SET fee_cleared = true, fee_challan_ref = $3
          WHERE id = $1::uuid`,
        [condonationId, auth.userId, body.feeChallanRef ?? null],
      );
      await recordMutationAudit({
        actorId: auth.userId, roleContext: auth.role, action: "condonation_fee_cleared",
        resource: "attendance_condonations", resourceId: condonationId,
        afterState: { feeCleared: true, challanRef: body.feeChallanRef ?? null },
      });
      return ok({ condonationId, feeCleared: true });
    }

    default:
      return fail("VALIDATION_ERROR", "action must be ENDORSE_HOD, DECIDE_CAC, or MARK_FEE_CLEARED", 400);
  }
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "condonation_transition", maxRequests: 60, windowMs: 60_000 },
});
