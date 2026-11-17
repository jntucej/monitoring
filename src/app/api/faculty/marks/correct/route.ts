// /api/faculty/marks/correct/route.ts
// addl_controller_academic (and admin/sysadmin) late mark corrections.
// The Additional Controller (Results) can NEVER modify marks — only process.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    markId?: string;
    score?: number;
    reason?: string;
  } | null;
  if (!body?.markId || typeof body.score !== "number" || !body.reason?.trim()) {
    return fail("VALIDATION_ERROR", "markId, numeric score and reason are required", 400);
  }
  const { rows } = await query<{ status: string; locked_by: string }>(
    `SELECT status, locked_by FROM public.marks WHERE id = $1`, [body.markId],
  );
  if (rows.length === 0) return fail("NOT_FOUND", "Mark not found", 404);
  // Only locked/submitted marks can be corrected (drafts just get re-entered by faculty).
  if (!["LOCKED", "SUBMITTED"].includes(rows[0].status)) {
    return fail("VALIDATION_ERROR", "Mark is not locked; ask the faculty to re-enter it", 400);
  }
  // Separation of duties: the original entrant cannot be the corrector.
  if (rows[0].locked_by === auth.userId) {
    return fail("FORBIDDEN", "Entrant cannot correct their own marks (maker-checker)", 403);
  }
  await query(
    `UPDATE public.marks
        SET score = $2, status = 'LOCKED', correction_reason = $3, corrected_by = $4, updated_at = now()
      WHERE id = $1`,
    [body.markId, body.score, body.reason.trim(), auth.userId],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "marks_correct",
    resource: "marks", resourceId: body.markId,
    afterState: { score: body.score, reason: body.reason },
  });
  return ok({ markId: body.markId, corrected: true });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["addl_controller_academic", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "marks-correct", maxRequests: 5 },
});
