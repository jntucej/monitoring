/**
 * GET /api/parent/weekly-digest
 *
 * One-stop weekly digest for a parent/guardian: attendance, passes, complaints,
 * meals rated, and curfew status for their ward(s).
 *
 * Query params:
 *   week — "this" (default) | "last"
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getLinkedPersons } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Person } from "@/lib/types";

function weekBounds(week: string, now = new Date()): { from: string; to: string; label: string } {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const today = d(now);
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();

  if (week === "last") {
    const start = new Date(now);
    start.setDate(now.getDate() + diff - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: d(start), to: d(end), label: "Last week" };
  }
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  return { from: d(start), to: today, label: "This week" };
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const week = sp.get("week") ?? "this";
  const { from, to, label } = weekBounds(week);

  // Resolve linked ward person IDs
  const linked = await getLinkedPersons(auth.userId, "children_of");
  const wardIds = linked.map((p) => p.id);

  if (wardIds.length === 0) {
    return ok({
      week: label,
      range: { from, to },
      wards: [],
    });
  }

  // Attendance
  const attR = await query<{ person_id: string; present: string; absent: string }>(
    `SELECT person_id::text AS person_id,
            COALESCE(SUM(CASE WHEN status IN ('PRESENT','IN') THEN 1 ELSE 0 END), 0)::text AS present,
            COALESCE(SUM(CASE WHEN status IN ('ABSENT','OUT') THEN 1 ELSE 0 END), 0)::text AS absent
       FROM public.attendance_records
      WHERE person_id = ANY($1::uuid[])
        AND date >= $2::date AND date <= $3::date
      GROUP BY person_id`,
    [wardIds, from, to]
  );

  // Active / completed passes this week
  const passR = await query<{ person_id: string; status: string; count: string }>(
    `SELECT pr.student_user_id::text AS person_id,
            pr.status,
            COUNT(*)::text AS count
       FROM public.permission_requests pr
      WHERE pr.student_user_id = ANY($1::uuid[])
        AND pr.created_at::date >= $2::date AND pr.created_at::date <= $3::date
      GROUP BY pr.student_user_id, pr.status`,
    [wardIds, from, to]
  );

  // Complaints raised
  const compR = await query<{ person_id: string; status: string; count: string }>(
    `SELECT c.raised_by::text AS person_id,
            c.status,
            COUNT(*)::text AS count
       FROM public.complaints c
      WHERE c.raised_by = ANY($1::uuid[])
        AND c.created_at::date >= $2::date AND c.created_at::date <= $3::date
        AND c.deleted_at IS NULL
      GROUP BY c.raised_by, c.status`,
    [wardIds, from, to]
  );

  // Meal reviews
  const mealR = await query<{ user_id: string; count: string; avg_score: string }>(
    `SELECT r.user_id::text AS user_id,
            COUNT(*)::text AS count,
            ROUND(AVG(CASE r.satisfaction
                WHEN 'VERY_GOOD' THEN 5
                WHEN 'GOOD'      THEN 4
                WHEN 'AVERAGE'   THEN 3
                WHEN 'BAD'       THEN 2
                WHEN 'VERY_BAD'  THEN 1
              END), 1)::text AS avg_score
       FROM public.mess_meal_reviews r
      WHERE r.user_id = ANY($1::uuid[])
        AND r.review_date >= $2::date AND r.review_date <= $3::date
        AND r.deleted_at IS NULL
      GROUP BY r.user_id`,
    [wardIds, from, to]
  );

  // Curfew / on-campus status today (from movement_logs)
  const curfewR = await query<{ person_id: string; in_campus: string; last_gate: string }>(
    `SELECT u.id::text AS person_id,
            CASE WHEN ml.direction = 'IN' THEN 'true' ELSE 'false' END AS in_campus,
            ml.gate_name AS last_gate
       FROM public.users u
       LEFT JOIN LATERAL (
         SELECT direction, gate_name
         FROM public.movement_logs
        WHERE person_id = u.id
        ORDER BY timestamp DESC
        LIMIT 1
       ) ml ON true
      WHERE u.id = ANY($1::uuid[])`,
    [wardIds]
  );

  const wards = linked
    .filter((p) => p.personType === "student")
    .map((p) => {
      const pid = p.id;
      const att = attR.rows.find((r) => r.person_id === pid);
      const passRows = passR.rows.filter((r) => r.person_id === pid);
      const compRows = compR.rows.filter((r) => r.person_id === pid);
      const meal = mealR.rows.find((r) => r.user_id === pid);
      const curfew = curfewR.rows.find((r) => r.person_id === pid);

      const present = Number(att?.present ?? 0);
      const absent = Number(att?.absent ?? 0);
      const totalDays = present + absent;

      return {
        id: pid,
        name: p.name ?? p.fullName ?? "Unknown",
        roll: p.uniqueId ?? p.roll ?? null,
        attendance: {
          present,
          absent,
          totalDays,
          pct: totalDays > 0 ? Math.round((present / totalDays) * 100) : null,
        },
        passes: passRows.map((r) => ({ status: r.status, count: Number(r.count) })),
        complaints: compRows.map((r) => ({ status: r.status, count: Number(r.count) })),
        meals: meal
          ? { count: Number(meal.count), avgScore: Number(meal.avg_score) }
          : null,
        curfew: curfew
          ? { inside: curfew.in_campus === "true", lastGate: curfew.last_gate ?? "unknown" }
          : null,
      };
    });

  return ok({
    week: label,
    range: { from, to },
    wards,
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["parent", "guardian"] }),
  { keyPrefix: "parent-weekly-digest", maxRequests: 20, windowMs: 60_000 }
);
