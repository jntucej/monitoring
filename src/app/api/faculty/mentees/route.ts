// /api/faculty/mentees/route.ts
// Scoped mentee list: attendance %, latest published marks, open
// complaints (STEP 3.2). Faculty-only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    mentee_id: string; name: string; unique_id: string;
    status: string; academic_year: number | null;
  }>(
    `SELECT ma.mentee_id, u.name, u.unique_id, ma.status, ma.academic_year
       FROM public.mentee_assignments ma
       JOIN public.users u ON u.id = ma.mentee_id
      WHERE ma.mentor_id = $1 AND ma.status = 'ACTIVE'
      ORDER BY u.unique_id`,
    [auth.userId],
  );
  // Attendance % per mentee (last 60 days) + open complaints.
  const mentees = rows.map((r) => ({ ...r, attendancePct: null as number | null, openComplaints: 0 }));
  for (let i = 0; i < mentees.length; i++) {
    const m = mentees[i];
    const att = await query<{ present: string; total: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'PRESENT')::text AS present,
              COUNT(*)::text AS total
         FROM public.attendance_records
        WHERE person_id = $1 AND date > now() - INTERVAL '60 days'`,
      [m.mentee_id],
    );
    if (Number(att.rows[0].total) > 0) {
      m.attendancePct = Math.round((Number(att.rows[0].present) / Number(att.rows[0].total)) * 100);
    }
    const comp = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM public.complaints
        WHERE (on_behalf_of_id = $1 OR raised_by = $1)
          AND deleted_at IS NULL AND status = 'submitted'`, [m.mentee_id]);
    m.openComplaints = Number(comp.rows[0].n || 0);
  }
  return ok({ mentorId: auth.userId, mentees });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["faculty", "hod", "admin", "sysadmin"] }),
  { keyPrefix: "faculty-mentees", maxRequests: 30, windowMs: 60_000 },
);
