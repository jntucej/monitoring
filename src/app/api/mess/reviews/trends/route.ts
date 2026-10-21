// src/app/api/mess/reviews/trends/route.ts
// GET ?weeks=4 — weekly per-meal rollup (R7).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set([
  "mess_incharge",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
]);

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!STAFF.has(auth.role)) return ok({ weeks: 0, trends: [] });

  const url = new URL(req.url);
  const weeks = Math.min(12, Math.max(1, Number(url.searchParams.get("weeks") ?? 4)));

  const { rows } = await query(
    `SELECT date_trunc('week', review_date)::date AS week,
            meal_type,
            COUNT(*)::int AS total,
            ROUND(AVG(CASE satisfaction
                    WHEN 'VERY_GOOD' THEN 5 WHEN 'GOOD' THEN 4
                    WHEN 'AVERAGE'   THEN 3 WHEN 'BAD' THEN 2
                    ELSE 1 END), 2)::numeric AS avg_score,
            COUNT(*) FILTER (WHERE satisfaction IN ('BAD','VERY_BAD'))::int AS bad_count
       FROM public.mess_meal_reviews
      WHERE deleted_at IS NULL
        AND review_date >= CURRENT_DATE - ($1 || ' weeks')::interval
      GROUP BY week, meal_type
      ORDER BY week DESC, meal_type`,
    [weeks],
  );

  return ok({ weeks, trends: rows });
}

export const GET = withAuthorization(handleGet);
