import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

function getTokenCode(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // /api/mess/token/:code -> last segment
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const code = getTokenCode(req);
    if (!code) return fail("MISSING_CODE", "Token code is required", 400);

    const res = await query(
      `SELECT t.primary_item AS primaryItem,
              t.sub_item_labels AS subItemLabels,
              t.used_at AS usedAt,
              t.revoked_at AS revokedAt,
              t.expires_at AS expiresAt,
              t.used_by AS usedBy,
              u.id AS userId,
              u.unique_id AS roll,
              u.name AS name,
              d.id AS messDayId,
              d.meal_date AS mealDate,
              d.window_closes_at AS windowClosesAt
         FROM mess_tokens t
         JOIN users u ON u.id::text = t.user_id::text
         JOIN mess_days d ON d.id = t.mess_day_id
        WHERE t.token_code = $1`,
      [code]
    );
    const row: any = res.rows[0];
    if (!row) {
      return ok({ valid: false, reason: "NOT_FOUND" });
    }

    const nowIso = new Date().toISOString();
    const expired = row.expiresAt ? nowIso > new Date(row.expiresAt).toISOString() : false;
    const valid = !row.usedAt && !row.revokedAt && !expired;

    let subItemLabels: string[] = row.subItemLabels ?? [];
    if (typeof subItemLabels === "string") {
      try { subItemLabels = JSON.parse(subItemLabels); } catch { subItemLabels = []; }
    }

    return ok({
      valid,
      reason: row.revokedAt ? "REVOKED" : row.usedAt ? "USED" : expired ? "EXPIRED" : undefined,
      messDayId: row.messDayId,
      mealDate: row.mealDate,
      primaryItem: row.primaryItem,
      subItemLabels,
      usedAt: row.usedAt,
      revokedAt: row.revokedAt,
      expiresAt: row.expiresAt,
      studentRoll: row.roll,
      studentName: row.name,
    });
  } catch (err) {
    console.error("[mess/token GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to verify token" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_token_get", maxRequests: 200 }
);
