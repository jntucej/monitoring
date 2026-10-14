import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { getDayById } from "../../mess/_helpers";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/admin/mess-finalize
 *
 * Manually finalize a mess day as admin: records the final headcount,
 * locks the day (tokens_locked_at) so no further preferences can
 * generate tokens, and writes a MESS_FINAL_COUNT audit row.
 *
 * Body: { messDayId, finalHeadcount, confirmedBy }
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const messDayId: string = (body?.messDayId ?? "").toString().trim();
    const finalHeadcountRaw = body?.finalHeadcount;
    const finalHeadcount =
      Number.isFinite(finalHeadcountRaw) && finalHeadcountRaw !== ""
        ? Number(finalHeadcountRaw)
        : null;
    const confirmedByRaw = body?.confirmedBy;
    const confirmedBy: string | null =
      typeof confirmedByRaw === "string" && confirmedByRaw.trim()
        ? confirmedByRaw.trim()
        : null;

    if (!messDayId) return fail("MISSING_PARAM", "messDayId is required", 400);
    if (finalHeadcount === null || finalHeadcount < 0 || !Number.isInteger(finalHeadcount)) {
      return fail("MISSING_PARAM", "finalHeadcount is required and must be a non-negative integer", 400);
    }

    const day = await getDayById(messDayId);
    if (!day) return fail("NOT_FOUND", "Mess day not found", 404);

    await query(
      `UPDATE mess_days
          SET tokens_locked_at = COALESCE(tokens_locked_at, NOW())
        WHERE id::text = $1`,
      [messDayId]
    );

    const finalized = await query(
      `SELECT id, meal_date AS mealDate, meal_type AS mealType, day_type AS dayType,
              window_opens_at AS windowOpensAt, window_closes_at AS windowClosesAt,
              tokens_locked_at AS tokensLockedAt, tokens_revoked_at AS tokensRevokedAt,
              is_active AS isActive
          FROM mess_days WHERE id::text = $1`,
      [messDayId]
    );

    await addAudit({
      action: "MESS_FINAL_COUNT",
      userId: auth.userId,
      userName: confirmedBy ?? undefined,
      role: auth.role,
      details: {
        messDayId,
        finalHeadcount,
        confirmedBy: confirmedBy ?? auth.userId,
      },
    });

    return ok({ messDayId, finalHeadcount, confirmedBy: confirmedBy ?? auth.userId, finalized: finalized.rows[0] });
  } catch (err) {
    console.error("[admin/mess-finalize POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to finalize mess day" } },
      { status: 500 }
    );
  }
}

export const POST = withAdminMutation(handlePost, {
  rateLimit: { windowMs: 60_000, maxRequests: 10 },
});
