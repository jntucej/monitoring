// /api/hod/exam-review/route.ts
// HOD approves/rejects internal exam proposals for their department
// (STEP 3.3). Scoped to the HOD's department.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const dept = auth.departmentId ?? null;
  if (auth.role === "hod" && !dept) {
    return fail("FORBIDDEN", "HOD account has no department scope", 403);
  }
  let sql = `SELECT p.id, p.class_id, p.subject_code, p.proposed_date, p.status, p.notes,
                    c.department, c.name AS class_name
               FROM public.internal_exam_proposals p
               LEFT JOIN public.classes c ON c.id = p.class_id
               WHERE 1=1`;
  const params: unknown[] = [];
  if (dept) { sql += ` AND c.department = $${params.push(dept)}`; }
  sql += ` AND p.status IN ('PROPOSED','APPROVED','SCHEDULED') ORDER BY p.proposed_date ASC LIMIT 100`;
  const { rows } = await query(sql, params);
  return ok({ proposals: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    proposalId?: string;
    decision?: string; // APPROVE | REJECT
    notes?: string;
  } | null;
  if (!body?.proposalId || !body.decision) {
    return fail("VALIDATION_ERROR", "proposalId and decision (APPROVE|REJECT) required", 400);
  }
  const decision = body.decision.toUpperCase();
  if (!["APPROVE", "REJECT"].includes(decision)) {
    return fail("VALIDATION_ERROR", "decision must be APPROVE or REJECT", 400);
  }
  const { rows } = await query<{ class_id: string | null }>(
    `SELECT class_id FROM public.internal_exam_proposals WHERE id = $1`, [body.proposalId]);
  if (rows.length === 0) return fail("NOT_FOUND", "Proposal not found", 404);
  // HOD scope check on the class's department.
  if (auth.role === "hod" && auth.departmentId) {
    const c = await query<{ department: string | null }>(
      `SELECT department FROM public.classes WHERE id = $1`, [rows[0].class_id ?? ""]);
    if (c.rows[0]?.department !== auth.departmentId) {
      return fail("FORBIDDEN", "Proposal is outside your department", 403);
    }
  }
  await query(
    `UPDATE public.internal_exam_proposals
        SET status = $1, approved_by = $2, approved_at = now(), notes = COALESCE($3, notes)
      WHERE id = $4`,
    [decision === "APPROVE" ? "APPROVED" : "REJECTED", auth.userId, body.notes?.trim() || null, body.proposalId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "hod_exam_review",
    resource: "internal_exam_proposals", resourceId: body.proposalId,
    afterState: { decision },
  });
  return ok({ proposalId: body.proposalId, decision: decision === "APPROVE" ? "APPROVED" : "REJECTED" });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["hod", "controller_examinations", "admin", "sysadmin"] }),
  { keyPrefix: "hod-exam-review-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["hod", "controller_examinations", "admin", "sysadmin"] }),
  { keyPrefix: "hod-exam-review-post", maxRequests: 20, windowMs: 60_000 },
);
