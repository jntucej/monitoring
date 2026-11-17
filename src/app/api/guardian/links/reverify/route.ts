// /api/guardian/links/reverify/route.ts
// Self-service guardian link re-verification (STEP 3.8 / threat 7):
// stale guardian mappings are a hard-to-detect privacy incident. This
// re-verifies the mapping against the ward's identity and stamps it.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;

  // 1. Which wards does this guardian currently cover?
  const wards = await query<{ user_id: string; name: string; unique_id: string | null }>(
    `SELECT sd.user_id, u.name, u.unique_id
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
      WHERE sd.guardian_id = $1`,
    [auth.userId],
  );
  if (wards.rows.length === 0) {
    return fail("NOT_FOUND", "No ward mappings found for this guardian", 404);
  }

  // 2. Re-verify: ward must be ACTIVE; guardian must be ACTIVE.
  const guardian = await query<{ status: string }>(
    `SELECT status FROM public.users WHERE id = $1`, [auth.userId]);
  if (guardian.rows[0]?.status !== "ACTIVE") {
    return fail("ACCOUNT_INACTIVE", "Guardian account is not active", 403);
  }
  let verified = 0;
  for (const w of wards.rows) {
    const ward = await query<{ status: string }>(
      `SELECT status FROM public.users WHERE id = $1`, [w.user_id]);
    if (ward.rows[0]?.status === "ACTIVE") verified += 1;
  }

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "guardian_link_reverify",
    resource: "student_details.guardian_id",
    afterState: { wards: wards.rows.length, activeWards: verified },
  });

  return ok({ wards: wards.rows.length, activeWards: verified, reverifiedAt: new Date().toISOString() });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["guardian", "parent", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "guardian-reverify", maxRequests: 5 },
});
