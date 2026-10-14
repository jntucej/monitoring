import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

function getDayId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const dayId = getDayId(req);
    if (!dayId) return fail("MISSING_PARAM", "Mess day id required", 400);

    const existing = await query(`SELECT * FROM mess_days WHERE id::text = $1`, [dayId]);
    if (existing.rows.length === 0) return fail("NOT_FOUND", "Mess day not found", 404);
    const prev: any = existing.rows[0];

    const body = await req.json().catch(() => null);
    const windowOpens: string | null | undefined =
      body?.windowOpens !== undefined
        ? typeof body.windowOpens === "string" ? body.windowOpens : null
        : undefined;
    const windowCloses: string | null | undefined =
      body?.windowCloses !== undefined
        ? typeof body.windowCloses === "string" ? body.windowCloses : null
        : undefined;
    const cancel: boolean | undefined = body?.cancel === true ? true : undefined;

    const setClause: string[] = [];
    const params: any[] = [dayId];
    if (windowOpens !== undefined) {
      params.push(windowOpens);
      setClause.push(`window_opens_at = $${params.length}::timestamptz`);
    }
    if (windowCloses !== undefined) {
      params.push(windowCloses);
      setClause.push(`window_closes_at = $${params.length}::timestamptz`);
    }
    if (cancel) {
      setClause.push(`is_active = FALSE`);
    }

    if (setClause.length > 0) {
      await query(
        `UPDATE mess_days SET ${setClause.join(", ")} WHERE id::text = $1`,
        params
      );
    }

    const updated = await query(
      `SELECT id, meal_date AS mealDate, meal_type AS mealType, day_type AS dayType,
              window_opens_at AS windowOpensAt, window_closes_at AS windowClosesAt,
              tokens_locked_at AS tokensLockedAt, tokens_revoked_at AS tokensRevokedAt,
              is_active AS isActive
         FROM mess_days WHERE id::text = $1`,
      [dayId]
    );

    await addAudit({
      action: cancel ? "MESS_DAY_CANCELLED" : "MESS_DAY_CREATED",
      userId: auth.userId,
      role: auth.role,
      details: {
        dayId,
        mealDate: prev.meal_date,
        dayType: prev.day_type,
        windowOpens,
        windowCloses,
        cancel: !!cancel,
      },
    });

    return ok(updated.rows[0]);
  } catch (err) {
    console.error("[mess/days/[id] PATCH]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update mess day" } },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const dayId = getDayId(req);
    if (!dayId) return fail("MISSING_PARAM", "Mess day id required", 400);

    const res = await query(
      `UPDATE mess_days SET is_active = FALSE WHERE id::text = $1 RETURNING id, meal_date`,
      [dayId]
    );
    if (res.rows.length === 0) return fail("NOT_FOUND", "Mess day not found", 404);

    await addAudit({
      action: "MESS_DAY_CANCELLED",
      userId: auth.userId,
      role: auth.role,
      details: { dayId, mealDate: res.rows[0].meal_date, reason: "deleted" },
    });

    return ok({ id: dayId, cancelled: true });
  } catch (err) {
    console.error("[mess/days/[id] DELETE]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to cancel mess day" } },
      { status: 500 }
    );
  }
}

export const PATCH = withAdminMutation(handlePatch, {
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
});

export const DELETE = withAdminMutation(handleDelete, {
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
});
