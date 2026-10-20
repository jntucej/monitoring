// src/app/api/student/mess-bill/route.ts
// GET ?month=YYYY-MM — monthly calculated mess bill based on meals served minus opt-outs.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") return fail("FORBIDDEN", "Not allowed", 403);

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return fail("VALIDATION_ERROR", "month must be YYYY-MM", 400);
  }

  const { rows: cfgRows } = await query<{ value: { meal_rate_inr: number; cutoff_hour: number; cutoff_minute: number } }>(
    `SELECT value FROM public.system_settings WHERE id = 'mess_billing_config' LIMIT 1`,
  );
  const rate = cfgRows[0]?.value?.meal_rate_inr ?? 60;
  const cutoffHour = cfgRows[0]?.value?.cutoff_hour ?? 6;

  const { rows: served } = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM public.mess_meal_served mss
       JOIN public.mess_days d ON d.id = mss.mess_day_id
      WHERE mss.user_id = $1::uuid
        AND to_char(d.meal_date, 'YYYY-MM') = $2`,
    [auth.userId, month],
  );

  const totalServed = served[0]?.count ?? 0;
  const totalAmount = totalServed * rate;

  return ok({
    month,
    mealRateInr: rate,
    totalServed,
    totalAmount,
    cutoffTime: `${cutoffHour}:00 AM local time on meal date`,
  });
}

export const GET = withAuthorization(handleGet);
