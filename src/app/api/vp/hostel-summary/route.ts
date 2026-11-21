// src/app/api/vp/hostel-summary/route.ts
// GET /api/vp/hostel-summary — hostel aggregate for the VP. Counts only, no PII.
// Replaces the page's direct fetches of /api/occupancy/presence-matrix + /api/alerts
// so the VP receives an aggregate (counts + 7-day critical trend) rather than rows.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface SummaryRow {
  hostellers_total: string;
  hostellers_on_campus: string;
  hostellers_out_today: string;
  active_alerts: string;
  critical_7d: string;
  hostel_leave_active: string;
}

async function handleGet(_req: NextRequest, _context: { auth: AuthContext }) {
  const res = await query<SummaryRow>(
    `WITH hostellers AS (
       SELECT u.id FROM public.users u
        WHERE u.role = 'student' AND u.status = 'ACTIVE'
          AND (u.hostel_block IS NOT NULL AND u.hostel_block <> '')
     ),
     today_moves AS (
       SELECT ml.direction FROM public.movement_logs ml
        WHERE ml.timestamp::date = CURRENT_DATE
          AND ml.user_id IN (SELECT id FROM hostellers)
     )
     SELECT
       (SELECT count(*) FROM hostellers)::text AS hostellers_total,
       (SELECT count(*) FROM public.campus_occupancy co
        WHERE co.current_status='IN' AND co.user_id IN (SELECT id FROM hostellers))::text AS hostellers_on_campus,
       (SELECT COUNT(*) FILTER (WHERE direction='OUT') FROM today_moves)::text AS hostellers_out_today,
       (SELECT count(*) FROM public.alerts WHERE resolved=FALSE AND timestamp::date=CURRENT_DATE)::text AS active_alerts,
       (SELECT count(*) FROM public.alerts WHERE resolved=FALSE AND severity='critical' AND timestamp>=NOW()-INTERVAL '7 days')::text AS critical_7d,
       (SELECT count(*) FROM public.leave_requests lr
        WHERE lr.status IN ('WARDEN_APPROVED','PARENT_ACKNOWLEDGED','GATE_ISSUED')
          AND lr.from_ts<=NOW() AND lr.to_ts>=NOW()
          AND lr.hostel_block IS NOT NULL AND lr.hostel_block<>'')::text AS hostel_leave_active`
  );
  const r = res.rows[0];
  return ok({
    hostellersTotal: Number(r?.hostellers_total ?? 0),
    hostellersOnCampus: Number(r?.hostellers_on_campus ?? 0),
    hostellersOutToday: Number(r?.hostellers_out_today ?? 0),
    activeAlerts: Number(r?.active_alerts ?? 0),
    criticalAlerts7d: Number(r?.critical_7d ?? 0),
    hostelLeaveActive: Number(r?.hostel_leave_active ?? 0),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
