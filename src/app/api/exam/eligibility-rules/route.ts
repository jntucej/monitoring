// /api/exam/eligibility-rules/route.ts
// controller_examinations configures the eligibility rules (STEP 3.6):
// attendance %, fee dues = 0, academic status ACTIVE. Rules are stored in
// config_exam_eligibility_rules; the exam eligibility agent (Phase 1)
// precomputes the signed manifest from these rules 24h before each exam.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

const RULES_TABLE = `public.config_exam_eligibility_rules`;

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query<{ min_attendance_pct: string; require_fees_paid: string; require_academic_active: string; updated_at: string }>(
    `SELECT min_attendance_pct, require_fees_paid, require_academic_active, updated_at
       FROM ${RULES_TABLE} ORDER BY id LIMIT 1`,
  );
  if (rows.length === 0) {
    // Defaults when the table has no row yet.
    return ok({ rules: { minAttendancePct: 75, requireFeesPaid: true, requireAcademicActive: true } });
  }
  const r = rows[0];
  return ok({ rules: {
    minAttendancePct: Number(r.min_attendance_pct),
    requireFeesPaid: r.require_fees_paid,
    requireAcademicActive: r.require_academic_active,
    updatedAt: r.updated_at,
  }});
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    minAttendancePct?: number;
    requireFeesPaid?: boolean;
    requireAcademicActive?: boolean;
  } | null;
  if (!body) return fail("VALIDATION_ERROR", "JSON body required", 400);
  const minPct = body.minAttendancePct ?? 75;
  if (typeof minPct !== "number" || minPct < 0 || minPct > 100) {
    return fail("VALIDATION_ERROR", "minAttendancePct must be 0..100", 400);
  }
  await query(
    `INSERT INTO ${RULES_TABLE} (min_attendance_pct, require_fees_paid, require_academic_active, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET min_attendance_pct = $1, require_fees_paid = $2,
           require_academic_active = $3, updated_by = $4, updated_at = now()`,
    [minPct, body.requireFeesPaid ?? true, body.requireAcademicActive ?? true, auth.userId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "exam_eligibility_rules_update",
    resource: "exam_eligibility_rules",
    afterState: { minAttendancePct: minPct, requireFeesPaid: body.requireFeesPaid, requireAcademicActive: body.requireAcademicActive },
  });
  return ok({ rules: { minAttendancePct: minPct, requireFeesPaid: body.requireFeesPaid ?? true, requireAcademicActive: body.requireAcademicActive ?? true } });
}

export const GET = withApiChain(implGet, {
  route: "/api/exam/eligibility-rules",
  auth: "user",
  requiredRole: ["controller_examinations", "oie", "exam_branch", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "exam-elig-get", maxRequests: 20, windowMs: 60_000 },
});

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["controller_examinations", "admin", "sysadmin"] }),
  { keyPrefix: "exam-elig-post", maxRequests: 5, windowMs: 60_000 },
);
