import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const tokenCode: string = (body?.tokenCode ?? "").toString().trim();
    if (!tokenCode) return fail("MISSING_PARAM", "tokenCode is required", 400);

    const res = await query(
      `SELECT t.id, t.user_id AS userId, t.mess_day_id AS messDayId,
              t.primary_item AS primaryItem, t.used_at AS usedAt,
              t.revoked_at AS revokedAt, t.expires_at AS expiresAt,
              d.meal_date AS mealDate
         FROM mess_tokens t
         JOIN mess_days d ON d.id = t.mess_day_id
        WHERE t.token_code = $1`,
      [tokenCode]
    );
    const token: any = res.rows[0];
    if (!token) return fail("TOKEN_NOT_FOUND", "Unknown mess token", 404);
    if (token.revokedAt) return fail("TOKEN_REVOKED", "This token has been revoked", 400);
    if (token.usedAt) return fail("TOKEN_ALREADY_USED", "This token has already been used", 409);
    if (token.expiresAt && new Date(token.expiresAt).toISOString() < new Date().toISOString()) {
      return fail("TOKEN_EXPIRED", "This token has expired", 400);
    }

    const served = await query(
      `INSERT INTO mess_meal_served (user_id, mess_day_id, token_id, served_at, method, served_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), 'TOKEN_SCAN', $4::uuid)
       ON CONFLICT (user_id, mess_day_id) DO NOTHING
       RETURNING id`,
      [token.userId, token.messDayId, token.id, auth.userId]
    );
    if (served.rows.length === 0) {
      return fail("ALREADY_SERVED", "This student has already been served for this meal", 409);
    }

    await query(
      `UPDATE mess_tokens SET used_at = NOW(), used_by = $1::uuid WHERE id::text = $2`,
      [auth.userId, token.id]
    );

    await addAudit({
      action: "MESS_MEAL_SERVED",
      userId: auth.userId,
      role: auth.role,
      details: { tokenCode, userId: token.userId, messDayId: token.messDayId },
    });

    return ok({
      userId: token.userId,
      messDayId: token.messDayId,
      mealDate: token.mealDate,
      primaryItem: token.primaryItem,
      method: "TOKEN_SCAN",
    });
  } catch (err) {
    console.error("[mess/serve POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to serve meal" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(async (req, ctx) => handlePost(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_serve_post", maxRequests: 120 }
);
