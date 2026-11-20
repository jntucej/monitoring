// POST /api/conduct/flags/:userId/clear
// Clears the user's conduct flag.
// Auth: admin, sysadmin only.

import { NextRequest } from "next/server";
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
    reason?: string;
  };

  await query(
    `UPDATE public.conduct_flags
        SET current_flag = 'clear',
            cleared_by = $1,
            cleared_at = now(),
            cleared_reason = $2
      WHERE user_id = $3`,
    [auth.userId, body.reason?.trim() ?? "Manual clear", targetUserId]
  );

  return ok({ userId: targetUserId, currentFlag: "clear" });
}

export const POST = withRateLimit(
  withAuthorization(implPost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "conduct-flag-clear", maxRequests: 10, windowMs: 60_000 },
);
