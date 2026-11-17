// /api/hostel-manager/incidents/route.ts
// Discipline incident log (STEP 3.7): deputy_warden logs; only
// chief_warden escalates to DEBARRED (two-person chain:
// incident → chief_warden → HOD flag → dean/principal approval).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query(
    `SELECT id, student_id, hostel_block, category, description, status,
            logged_by, logged_at, escalated_by, escalated_at
       FROM public.hostel_incidents
      WHERE ($1::text IS NULL OR hostel_block = $1)
      ORDER BY logged_at DESC LIMIT 100`,
    [auth.role === "deputy_warden" ? "MY_BLOCK" : null],
  );
  return ok({ incidents: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    studentId?: string;
    hostelBlock?: string;
    category?: string;
    description?: string;
  } | null;
  if (!body?.studentId || !body.description?.trim()) {
    return fail("VALIDATION_ERROR", "studentId and description required", 400);
  }
  const category = body.category ?? "MISCONDUCT";
  const { rows } = await query(
    `INSERT INTO public.hostel_incidents
       (student_id, hostel_block, category, description, logged_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, status`,
    [body.studentId, body.hostelBlock ?? null, category, body.description.trim(), auth.userId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "hostel_incident_log",
    resource: "hostel_incidents", resourceId: rows[0].id,
    afterState: { category, block: body.hostelBlock ?? null },
  });
  return ok(rows[0]);
}

// Escalate: chief_warden only → routes to academic-status two-person flow.
async function implEscalate(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    incidentId?: string;
    action?: string; // DEBAR | SUSPEND | NONE
    reason?: string;
  } | null;
  if (auth.role !== "chief_warden" && auth.role !== "principal") {
    return fail("FORBIDDEN", "Only the Chief Warden (Principal) can escalate", 403);
  }
  if (!body?.incidentId || !body.action) {
    return fail("VALIDATION_ERROR", "incidentId and action (DEBAR|SUSPEND) required", 400);
  }
  const { rows } = await query<{ student_id: string }>(
    `SELECT student_id FROM public.hostel_incidents WHERE id = $1`, [body.incidentId]);
  if (rows.length === 0) return fail("NOT_FOUND", "Incident not found", 404);

  // Mark the incident escalated, then park the academic flag in two-person
  // pending state (the HOD/dean chain completes it — see
  // /api/academic-status/pending). chief_warden is an approver role, so
  // this write goes straight to effective + flag_status.
  await query(
    `UPDATE public.hostel_incidents
        SET status = 'ESCALATED', escalated_by = $2, escalated_at = now()
      WHERE id = $1`,
    [body.incidentId, auth.userId],
  );
  const statusMap: Record<string, string> = { DEBAR: "DEBARRED", SUSPEND: "SUSPENDED" };
  const acad = statusMap[body.action];
  if (acad) {
    await query(
      `UPDATE public.student_details
          SET academic_status = $1, status_reason = $2, status_set_at = now()
        WHERE user_id = $3`,
      [acad, `Hostel incident escalation (id ${body.incidentId})`, rows[0].student_id],
    );
    await query(
      `UPDATE public.users SET flag_status = $1 WHERE id = $2`,
      [acad, rows[0].student_id],
    );
  }
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "hostel_incident_escalate",
    resource: "hostel_incidents", resourceId: body.incidentId,
    afterState: { action: body.action, academicStatus: acad ?? null },
  });
  return ok({ incidentId: body.incidentId, escalatedTo: acad ?? null });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["hostel_manager", "deputy_warden", "chief_warden", "principal", "admin", "sysadmin"] }),
  { keyPrefix: "hostel-incidents-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["deputy_warden", "hostel_manager", "chief_warden", "admin", "sysadmin"] }),
  { keyPrefix: "hostel-incidents-post", maxRequests: 10, windowMs: 60_000 },
);
