// /api/operator/passes/batch-verify/route.ts
// Peak-hour batch scan: verify many pass codes in one call instead of
// one round-trip per pass. Each result carries its own verdict so the
// operator UI can render a summary.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    codes?: string[];
  } | null;
  if (!body?.codes?.length || body.codes.length > 200) {
    return fail("VALIDATION_ERROR", "codes[] required, max 200 per call", 400);
  }

  const results: Array<{ code: string; valid: boolean; reason?: string; roll?: string | null; name?: string | null }> = [];
  for (const code of body.codes.slice(0, 200)) {
    const c = String(code).trim();
    const { rows } = await query<{ unique_id: string | null; name: string; flag_status: string | null }>(
      `SELECT u.unique_id, u.name, u.flag_status
         FROM public.passes p
         JOIN public.users u ON u.id = p.user_id
        WHERE p.code = $1 AND p.status = 'ACTIVE'
          AND p.expires_at > now()
        LIMIT 1`,
      [c],
    );
    if (rows.length === 0) {
      results.push({ code: c, valid: false, reason: "NOT_FOUND_OR_EXPIRED" });
    } else if (rows[0].flag_status) {
      results.push({
        code: c, valid: false, reason: `FLAGGED_${rows[0].flag_status}`,
        roll: rows[0].unique_id, name: rows[0].name,
      });
    } else {
      results.push({ code: c, valid: true, roll: rows[0].unique_id, name: rows[0].name });
    }
  }

  return ok({
    total: results.length,
    valid: results.filter((r) => r.valid).length,
    results,
    verifiedBy: auth.role,
  });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "passes-batch-verify", maxRequests: 5 },
});
