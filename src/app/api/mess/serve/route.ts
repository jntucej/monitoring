import { NextRequest, NextResponse } from "next/server";
import { query, addAudit, withTransaction } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";
import { getMyStudentDetails, isMessEligible } from "../_helpers";

/**
 * CAS-consume a mess meal token.
 *
 * The single UPDATE ... WHERE used_at IS NULL ... RETURNING is the race guard:
 * two concurrent scans of the same token can only consume it once — the loser
 * gets an empty result set. We re-read only to decide *why* the consume
 * failed, so the operator gets a precise message.
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const tokenCode: string = (body?.tokenCode ?? "").toString().trim();
    if (!tokenCode) return fail("MISSING_PARAM", "tokenCode is required", 400);

    // 1. CAS-consume. Fails if already used / revoked / expired / concurrent.
    const { rows: consumed } = await query<{
      id: string;
      user_id: string;
      mess_day_id: string;
      primary_item: string;
      sub_item_labels: string[];
      expires_at: string;
    }>(
      `UPDATE mess_tokens
          SET used_at = NOW(), used_by = $2::uuid
        WHERE token_code = $1
          AND used_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > NOW()
        RETURNING id, user_id, mess_day_id, primary_item, sub_item_labels, expires_at`,
      [tokenCode, auth.userId],
    );

    if (!consumed[0]) {
      // Determine why so the operator gets a useful message.
      const { rows: check } = await query<{
        id: string;
        used_at: string | null;
        revoked_at: string | null;
        expires_at: string;
        user_id: string;
        mess_day_id: string;
        primary_item: string;
      }>(
        `SELECT id, used_at, revoked_at, expires_at, user_id, mess_day_id, primary_item
           FROM mess_tokens WHERE token_code = $1 LIMIT 1`,
        [tokenCode],
      );
      const row = check[0];
      if (!row) return fail("TOKEN_NOT_FOUND", "Unknown mess token", 404);
      if (row.revoked_at) return fail("TOKEN_REVOKED", "This token has been revoked", 409);
      if (row.used_at) return fail("TOKEN_ALREADY_USED", "This token has already been used", 409);
      if (new Date(row.expires_at).toISOString() < new Date().toISOString()) {
        return fail("TOKEN_EXPIRED", "This token has expired", 410);
      }
      // Lost the CAS race against a concurrent scan.
      return fail("TOKEN_IN_USE", "Concurrent modification — try again", 409);
    }

    const token = consumed[0];

    // 2. Re-check eligibility BEFORE recording the serve. A token that was
    //    revoked by the hosteller→day_scholar transition but not yet
    //    consumed can still be CAS-consumed by this query path; guard the
    //    record so the student's day-scholar state is authoritative.
    const owner = await getMyStudentDetails(token.user_id);
    if (owner && !isMessEligible(owner.studentType, owner.hostelBlock, owner.currentEntryType)) {
      // Roll back the CAS consume we just did so the token stays clean.
      await query(
        `UPDATE mess_tokens SET used_at = NULL, used_by = NULL WHERE id = $1 AND used_by = $2::uuid`,
        [token.id, auth.userId],
      );
      await addAudit({
        action: "MESS_SERVE_NOT_ELIGIBLE",
        userId: auth.userId,
        role: auth.role,
        details: { tokenCode, ownerUserId: token.user_id },
      });
      return fail("NOT_ELIGIBLE", "Student is no longer mess-eligible", 403);
    }

    // 3. Record the serve (idempotent per user+meal-day) AND clear the
    //    student's "will be present" preference for that day (M10), so the
    //    consumed meal no longer skews attendance analytics. M12: both writes
    //    run in one transaction so they cannot orphan each other.
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO mess_meal_served (user_id, mess_day_id, token_id, served_at, method, served_by)
         VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), 'SCAN', $4::uuid)
         ON CONFLICT (user_id, mess_day_id) DO NOTHING`,
        [token.user_id, token.mess_day_id, token.id, auth.userId],
      );
      await client.query(
        `UPDATE public.mess_preferences p
            SET will_be_present = FALSE
          FROM public.mess_days d
         WHERE p.mess_day_id = d.id
           AND p.user_id = $1::uuid
           AND d.id = $2::uuid`,
        [token.user_id, token.mess_day_id],
      );
    });

    await addAudit({
      action: "MESS_MEAL_SERVED",
      userId: auth.userId,
      role: auth.role,
      details: { tokenCode, userId: token.user_id, messDayId: token.mess_day_id },
    });

    return ok({
      userId: token.user_id,
      messDayId: token.mess_day_id,
      primaryItem: token.primary_item,
      method: "SCAN",
      tokenCode,
    });
  } catch (err) {
    console.error("[mess/serve POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to serve meal" } },
      { status: 500 },
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(async (req, ctx) => handlePost(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_serve_post", maxRequests: 120 },
);
