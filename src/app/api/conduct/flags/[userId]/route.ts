// GET /api/conduct/flags/:userId
// Returns the user's current conduct flag state.
// Auth: admin, sysadmin, or the user themselves.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function getUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const targetUserId = getUserId(req);
  if (!targetUserId) return fail("MISSING_ID", "User ID required", 400);

  const isAdmin = ["admin", "sysadmin"].includes(auth.role);
  if (!isAdmin && targetUserId !== auth.userId) {
    return fail("FORBIDDEN", "Can only view your own flag", 403);
  }

  const { rows } = await query<{
    current_flag: string;
    reason: string;
    set_at: string;
    expires_at: string | null;
  }>(
    `SELECT current_flag, reason, set_at, expires_at
       FROM public.conduct_flags
      WHERE user_id = $1
      LIMIT 1`,
    [targetUserId]
  );

  const row = rows[0];
  return ok({
    userId: targetUserId,
    currentFlag: row?.current_flag ?? "clear",
    reason: row?.reason ?? "",
    setAt: row?.set_at ?? null,
    expiresAt: row?.expires_at ?? null,
    active: row ? (row.expires_at === null || new Date(row.expires_at) > new Date()) : false,
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/conduct/flags/[userId]",
  auth: "user",
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin", "principal", "deputy_warden", "hostel_manager"],
  rateLimit: { keyPrefix: "conduct-flag", maxRequests: 30, windowMs: 60_000 },
});
