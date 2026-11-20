// /api/records/me/route.ts
// GET — the user's aggregated records across features:
//   attendance %, passes used, meals attended + rating, events,
//   achievements, complaints, documents. The "Profile Records" tab.
//
// Read-only. Each sub-query degrades gracefully (missing table → null).

import { NextRequest } from "next/server";
import { withAuthorization, type AuthContext } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const uid = ctx.auth.userId;

  // Run the sub-queries in parallel; each degrades to null on failure.
  const [attendance, passes, meals, events, achievements, complaints, documents] =
    await Promise.all([
      // Attendance % (current period).
      query<{ pct: string }>(
        `SELECT COALESCE(pct, 0) AS pct FROM (
           SELECT ROUND(100.0 * COALESCE(SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END), 0)
                      / NULLIF(SUM(CASE WHEN status IN ('PRESENT','ABSENT') THEN 1 ELSE 0 END), 0)) AS pct
           FROM public.attendance_records WHERE user_id = $1 AND period_no IS NOT NULL
         ) a`,
        [uid],
      ).catch(() => null),

      // Passes used this period.
      query<{ used: number; total: number; avg: string }>(
        `SELECT COALESCE(COUNT(*) FILTER (WHERE status IN ('used','active')), 0) AS used,
                COALESCE(COUNT(*), 0) AS total,
                COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600.0) FILTER (WHERE approved_at IS NOT NULL), 1), 0) AS avg
         FROM public.permission_requests WHERE student_user_id = $1`,
        [uid],
      ).catch(() => null),

      // Meals attended + avg rating (mess_meal_served + mess_meal_reviews).
      query<{ attended: string; rated: string; avg: string }>(
        `SELECT COALESCE(SUM(ms.count), 0) AS attended,
                COALESCE(SUM(mr.count), 0) AS rated,
                COALESCE(mr.avg_rating, 0) AS avg
         FROM (SELECT COUNT(*) AS count FROM public.mess_meal_served WHERE user_id = $1) ms
         CROSS JOIN (SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating),1), 0) AS avg_rating
                     FROM public.mess_meal_reviews WHERE user_id = $1) mr`,
        [uid],
      ).catch(() => null),

      // Events attended + upcoming.
      query<{ attended: number; upcoming: number }>(
        `SELECT COALESCE(COUNT(*) FILTER (WHERE status = 'attended'), 0) AS attended,
                COALESCE(COUNT(*) FILTER (WHERE status = 'registered' AND ce.starts_at > now()), 0) AS upcoming
         FROM public.event_registrations er
         JOIN public.campus_events ce ON ce.id = er.event_id
         WHERE er.user_id = $1`,
        [uid],
      ).catch(() => null),

      // Achievements.
      query<{ unlocked: number }>(
        `SELECT COALESCE(COUNT(*), 0) AS unlocked FROM public.user_achievements WHERE user_id = $1`,
        [uid],
      ).catch(() => null),

      // Complaints (raised_by, not user_id).
      query<{ open: string; resolved: string }>(
        `SELECT COALESCE(COUNT(*) FILTER (WHERE status IN ('submitted','acknowledged','assigned','in_progress')), 0) AS open,
                COALESCE(COUNT(*) FILTER (WHERE status = 'resolved'), 0) AS resolved
         FROM public.complaints WHERE raised_by = $1`,
        [uid],
      ).catch(() => null),

      // Documents.
      query<{ verified: number; pending: number }>(
        `SELECT COALESCE(COUNT(*) FILTER (WHERE status = 'verified'), 0) AS verified,
                COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0) AS pending
         FROM public.student_documents WHERE user_id = $1`,
        [uid],
      ).catch(() => null),
    ]);

  const records = {
    attendance: attendance?.rows[0]
      ? { pct: Number(attendance.rows[0].pct) || 0, period: "this month" }
      : null,
    passes: passes?.rows[0]
      ? {
          used: Number(passes.rows[0].used),
          total: Number(passes.rows[0].total),
          avgApprovalHours: Number(passes.rows[0].avg) || 0,
        }
      : null,
    meals: meals?.rows[0]
      ? {
          attended: Number(meals.rows[0].attended),
          total: Number(meals.rows[0].rated) || Number(meals.rows[0].attended),
          avgRating: Number(meals.rows[0].avg) || 0,
        }
      : null,
    events: events?.rows[0]
      ? { attended: Number(events.rows[0].attended), upcoming: Number(events.rows[0].upcoming) }
      : null,
    achievements: achievements?.rows[0]
      ? { unlocked: Number(achievements.rows[0].unlocked), inProgress: 0 }
      : null,
    complaints: complaints?.rows[0]
      ? { open: Number(complaints.rows[0].open), resolved: Number(complaints.rows[0].resolved), avgRating: 0 }
      : null,
    documents: documents?.rows[0]
      ? { verified: Number(documents.rows[0].verified), pending: Number(documents.rows[0].pending) }
      : null,
  };

  return Response.json({ success: true, records });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"] }),
  { keyPrefix: "records-me", maxRequests: 30, windowMs: 60_000 },
);
