// src/app/api/cron/mess-review-retention/route.ts
// POST — purge meal reviews older than 7 days. Reviews are meant to capture
// a meal while it is fresh; long-tail data is not retained. Idempotent.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";

function checkAuth(req: NextRequest): boolean {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const RETENTION_DAYS = 7;

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
