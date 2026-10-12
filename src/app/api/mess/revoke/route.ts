import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getDayById } from "../_helpers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const dayId: string = body?.dayId ?? "";
    if (!dayId) return fail("MISSING_PARAM", "dayId is required", 400);

    const day = await getDayById(dayId);
    if (!day) return fail("DAY_NOT_FOUND", "Mess day not found", 404);
    if (day.tokens_revoked_at) {
      return fail("ALREADY_REVOKED", "Tokens for this day have already been revoked", 409);
    }

    const updated = await query(
      `UPDATE mess_tokens
          SET revoked_at = NOW(), revoked_by = $1::uuid
        WHERE mess_day_id::text = $2
          AND used_at IS NULL
          AND revoked_at IS NULL
        RETURNING id, user_id`,
      [auth.userId, dayId]
    );

    await query(
      `UPDATE mess_days SET tokens_revoked_at = NOW(), revoked_by = $1::uuid WHERE id::text = $2`,
      [auth.userId, dayId]
    );

    // Log one notification event per revoked token.
    if (updated.rows.length > 0) {
      for (const row of updated.rows as any[]) {
        await query(
          `INSERT INTO mess_notifications_log
             (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
           VALUES ($1::uuid, $2::uuid, 'TOKENS_REVOKED', 'push', 'SENT',
                   jsonb_build_object('messDayId', $3::text, 'revokedBy', $4::text),
                   NOW())`,
          [row.user_id, dayId, dayId, auth.userId]
        );
      }
    }

    await addAudit({
      action: "MESS_TOKENS_REVOKED",
      userId: auth.userId,
      role: auth.role,
      details: { dayId, revokedCount: updated.rows.length },
    });

    return ok({ messDayId: dayId, revokedCount: updated.rows.length });
  } catch (err) {
    console.error("[mess/revoke POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to revoke tokens" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(async (req, ctx) => handlePost(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_revoke_post", maxRequests: 10 }
);
