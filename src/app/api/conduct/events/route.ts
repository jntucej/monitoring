// GET /api/conduct/events?userId=X&limit=50
// Returns the user's conduct event ledger.
// Auth: admin, sysadmin, or the user themselves.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  // Self-service: user can view their own events; admin/sysadmin can view anyone.
  const isAdmin = ["admin", "sysadmin"].includes(auth.role);
  if (!targetUserId || (!isAdmin && targetUserId !== auth.userId)) {
    return fail("FORBIDDEN", "Can only view your own conduct events", 403);
  }

  const { rows } = await query<{
    id: string;
    event_type: string;
    severity: string;
    domain: string;
    description: string;
    created_at: string;
    reversed: boolean;
    reversal_reason: string | null;
  }>(
    `SELECT id, event_type, severity, domain, description,
            created_at, reversed, reversal_reason
       FROM public.conduct_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [targetUserId, limit]
  );

  return ok(rows.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    severity: r.severity,
    domain: r.domain,
    description: r.description,
    recordedAt: r.created_at,
    reversed: r.reversed,
    reversalReason: r.reversal_reason ?? undefined,
  })));
}

export const GET = withApiChain(implGet, {
  route: "/api/conduct/events",
  auth: "user",
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin", "principal", "deputy_warden", "hostel_manager"],
  rateLimit: { keyPrefix: "conduct-events", maxRequests: 30, windowMs: 60_000 },
});
