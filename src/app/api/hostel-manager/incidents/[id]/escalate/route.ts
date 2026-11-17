// /api/hostel-manager/incidents/[id]/escalate/route.ts
// POST — chief_warden escalation of a discipline incident into the
// academic-status two-person flow (see ../route.ts implEscalate).
// This sub-route exists so the URL shape matches the blueprint.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  if (auth.role !== "chief_warden" && auth.role !== "principal") {
    return fail("FORBIDDEN", "Only the Chief Warden (Principal) can escalate", 403);
  }
  const incidentId = (req.nextUrl.pathname.split("/").filter(Boolean).slice(-2, -1))[0];
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    reason?: string;
  } | null;
  if (!body?.action) return fail("VALIDATION_ERROR", "action (DEBAR|SUSPEND) required", 400);

  const { rows } = await query<{ student_id: string }>(
    `SELECT student_id FROM public.hostel_incidents WHERE id = $1`, [incidentId]);
  if (rows.length === 0) return fail("NOT_FOUND", "Incident not found", 404);

  const statusMap: Record<string, string> = { DEBAR: "DEBARRED", SUSPEND: "SUSPENDED" };
  const acad = statusMap[body.action];
  if (!acad) return fail("VALIDATION_ERROR", "action must be DEBAR or SUSPEND", 400);

  await query(
    `UPDATE public.hostel_incidents
        SET status = 'ESCALATED', escalated_by = $2, escalated_at = now()
      WHERE id = $1`,
    [incidentId, auth.userId],
  );
  await query(
    `UPDATE public.student_details
        SET academic_status = $1, status_reason = $2, status_set_at = now()
      WHERE user_id = $3`,
    [acad, body.reason?.trim() || "Hostel incident escalation", rows[0].student_id],
  );
  await query(
    `UPDATE public.users SET flag_status = $1 WHERE id = $2`,
    [acad, rows[0].student_id],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "hostel_incident_escalate",
    resource: "hostel_incidents", resourceId: incidentId,
    afterState: { action: body.action, academicStatus: acad },
  });
  return ok({ incidentId, escalatedTo: acad });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["chief_warden", "principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "hostel-incident-escalate", maxRequests: 5 },
});
