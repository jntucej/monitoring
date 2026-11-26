// POST /api/conduct/flags/:userId/set
// Sets the user's conduct flag to the specified level.
// Auth: admin, sysadmin only.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { assertCsrf } from "@/lib/csrf";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function getUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { auth } = ctx;
  const targetUserId = getUserId(req);
  if (!targetUserId) return fail("MISSING_ID", "User ID required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    flag?: string;
    reason?: string;
  };

  const validFlags = ["clear", "watch", "probation", "suspended", "banned"];
  if (!body.flag || !validFlags.includes(body.flag)) {
    return fail("INVALID_FLAG", `Flag must be one of: ${validFlags.join(", ")}`, 400);
  }
  if (body.flag !== "clear" && !body.reason?.trim()) {
    return fail("REASON_REQUIRED", "Reason is required when setting a non-clear flag", 400);
  }

  await query(
    `INSERT INTO public.conduct_flags (user_id, current_flag, reason, set_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET
       current_flag = EXCLUDED.current_flag,
       reason = EXCLUDED.reason,
       set_at = now(),
       cleared_at = NULL,
       cleared_by = NULL`,
    [targetUserId, body.flag, body.reason?.trim() ?? ""]
  );

  return ok({ userId: targetUserId, currentFlag: body.flag, reason: body.reason ?? "" });
}

export const POST = withApiChain(implPost, {
  route: "/api/conduct/flags/[userId]/set",
  auth: "user",
  csrf: true,
  requiredRole: ["admin", "sysadmin"],
  rateLimit: { keyPrefix: "conduct-flag-set", maxRequests: 10, windowMs: 60_000 },
});
