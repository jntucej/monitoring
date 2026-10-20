// src/app/api/cron/mess-review-digest/route.ts
// POST — R5: alert mess_incharge/warden when a meal's negative-satisfaction
// fraction crosses the threshold. Idempotent per-day via mess_review_digest_log.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query, addNotification, addAudit } from "@/lib/db";
import { getIstDateString } from "@/server/policy/dates";

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

const THRESHOLD_BAD_PCT = 30; // 30% BAD+VERY_BAD triggers the alert
const MIN_REVIEWS = 5;

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = getIstDateString();

  // Skip if we already ran today (idempotent).
  const { rows: already } = await query(
    `SELECT digest_date FROM public.mess_review_digest_log WHERE digest_date = $1::date LIMIT 1`,
    [today],
  );
  if (already[0]) {
    return NextResponse.json({ date: today, skipped: true, reason: "already_run" });
  }

  const { rows } = await query<{
    meal_type: string;
    total: number;
    bad: number;
  }>(
    `SELECT meal_type,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE satisfaction IN ('BAD','VERY_BAD'))::int AS bad
       FROM public.mess_meal_reviews
      WHERE review_date = $1::date AND deleted_at IS NULL
      GROUP BY meal_type`,
    [today],
  );

  const alerts: string[] = [];
  for (const r of rows) {
    const pct = r.total > 0 ? (r.bad / r.total) * 100 : 0;
    if (r.total >= MIN_REVIEWS && pct >= THRESHOLD_BAD_PCT) {
      alerts.push(
        `${r.meal_type}: ${r.bad}/${r.total} (${pct.toFixed(0)}%) rated BAD or worse`,
      );
      await addNotification(
        "role",
        "mess_incharge",
        "mess_review_low_satisfaction",
        `Low satisfaction on ${r.meal_type}`,
        `${r.bad} of ${r.total} students rated today's ${r.meal_type.toLowerCase()} BAD or VERY_BAD.`,
      );
      await addNotification(
        "role",
        "warden",
        "mess_review_low_satisfaction",
        `Low satisfaction on ${r.meal_type}`,
        `Mess alert: ${r.meal_type} at ${pct.toFixed(0)}% negative today.`,
      );
    }
  }

  // Mark today as processed so we never double-send.
  await query(
    `INSERT INTO public.mess_review_digest_log (digest_date) VALUES ($1::date)
     ON CONFLICT (digest_date) DO NOTHING`,
    [today],
  );
  await addAudit({
    action: "MESS_REVIEW_DIGEST_RUN",
    userId: "system",
    details: { date: today, alerts: alerts.length, checked: rows.length },
  });

  return NextResponse.json({ date: today, alerts, checked: rows.length });
}
