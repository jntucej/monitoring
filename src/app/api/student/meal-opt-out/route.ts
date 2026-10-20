// src/app/api/student/meal-opt-out/route.ts
// POST — student opts out of a meal before cutoff (6 AM local time).
// GET  — list student's meal opt-outs.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { isMessBillExempt } from "@/lib/delegation";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Only students can opt out of meals", 403);

  const body = (await req.json().catch(() => ({}))) as {
    mealDate?: string;
    mealType?: string;
    reason?: string;
  };

  const mealDate = (body.mealDate ?? "").trim();
  const mealType = ["BREAKFAST", "LUNCH", "DINNER"].includes((body.mealType ?? "").toUpperCase())
    ? (body.mealType ?? "").toUpperCase()
    : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate) || !mealType) {
    return fail("VALIDATION_ERROR", "Valid mealDate (YYYY-MM-DD) and mealType required", 400);
  }

  // Check 6:00 AM cutoff for the target meal date
  const targetDate = new Date(`${mealDate}T06:00:00`);
  if (isNaN(targetDate.getTime())) return fail("VALIDATION_ERROR", "Invalid date", 400);

  // Load cutoff hour from settings if configured
  const { rows: cfgRows } = await query<{ value: { cutoff_hour: number; cutoff_minute: number } }>(
    `SELECT value FROM public.system_settings WHERE id = 'mess_billing_config' LIMIT 1`,
  );
  const cfg = cfgRows[0]?.value;
  const cutoffHour = cfg?.cutoff_hour ?? 6;
  const cutoffMin = cfg?.cutoff_minute ?? 0;

  const cutoff = new Date(`${mealDate}T00:00:00`);
  cutoff.setHours(cutoffHour, cutoffMin, 0, 0);

  if (Date.now() >= cutoff.getTime()) {
    return fail("CUTOFF_PASSED", `Opt-out cutoff for ${mealDate} has passed (${cutoffHour}:00 AM)`, 422);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.meal_opt_outs (student_id, meal_date, meal_type, reason)
     VALUES ($1::uuid, $2::date, $3, $4)
     ON CONFLICT (student_id, meal_date, meal_type) DO UPDATE
       SET reason = EXCLUDED.reason
     RETURNING id`,
    [auth.userId, mealDate, mealType, body.reason ? body.reason.trim().slice(0, 200) : null],
  );

  await addAudit({
    action: "MEAL_OPT_OUT_CREATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { optOutId: rows[0].id, mealDate, mealType },
  });

  return ok({ optOutId: rows[0].id, success: true });
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") return fail("FORBIDDEN", "Not allowed", 403);
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);

  const { rows } = await query(
    `SELECT id, meal_date AS "mealDate", meal_type AS "mealType", reason, created_at AS "createdAt"
       FROM public.meal_opt_outs
      WHERE student_id = $1::uuid AND meal_date >= $2::date
      ORDER BY meal_date DESC`,
    [auth.userId, from],
  );

  return ok({ optOuts: rows });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 10 });
export const GET = withAuthorization(handleGet);
