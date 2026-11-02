// src/app/api/cron/mess-review-retention/route.ts
// POST — purge meal reviews older than 7 days. Reviews are meant to capture
// a meal while it is fresh; long-tail data is not retained. Idempotent.

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";


const RETENTION_DAYS = 7;

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const { rowCount } = await query(
    `DELETE FROM public.mess_meal_reviews
      WHERE review_date < (CURRENT_DATE - ($1 || ' days')::interval)`,
    [String(RETENTION_DAYS)],
  );

  await addAudit({
    action: "MESS_REVIEW_RETENTION",
    userId: "system-cron",
    role: "sysadmin",
    details: { purged: rowCount ?? 0, retentionDays: RETENTION_DAYS },
  });

  return NextResponse.json({
    purged: rowCount ?? 0,
    retentionDays: RETENTION_DAYS,
  });
}
