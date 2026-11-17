// /api/supervisor/visitors/overstay/route.ts
// Auto-flag visitors who checked in but have not checked out beyond the
// threshold (default 24h, ?hours= to override). Feeds the supervisor SLA
// queue (STEP 3.4). Nightly reconciliation job also writes to this view.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const hours = Number(req.nextUrl.searchParams.get("hours") ?? 24);
  if (!Number.isFinite(hours) || hours <= 0) {
    return fail("VALIDATION_ERROR", "hours must be a positive number", 400);
  }
  const { rows } = await query<{
    id: string; name: string; unique_id: string | null;
    check_in_at: string; purpose: string | null;
    hours_open: number;
  }>(
    `SELECT vl.id, u.name, u.unique_id, vl.check_in_at, vl.purpose,
            round(EXTRACT(EPOCH FROM (now() - vl.check_in_at)) / 3600.0) AS hours_open
       FROM public.visitor_logs vl
       JOIN public.users u ON u.id = vl.user_id
      WHERE vl.status = 'CHECKED_IN'
        AND vl.check_in_at < now() - ($1 || ' hours')::interval
      ORDER BY vl.check_in_at ASC`,
    [String(hours)],
  );
  return ok({
    requestedBy: auth.role,
    thresholdHours: hours,
    overstay: rows.map((r) => ({
      visitorLogId: r.id, name: r.name, roll: r.unique_id,
      checkedInAt: r.check_in_at, purpose: r.purpose,
      hoursOpen: r.hours_open,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "visitors-overstay", maxRequests: 20, windowMs: 60_000 },
);
