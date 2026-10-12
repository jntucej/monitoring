import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: any, { auth }: { auth: AuthContext }) {
  try {
    const res = await query(
      `SELECT p.mess_day_id AS messDayId,
              d.meal_date AS mealDate,
              d.meal_type AS mealType,
              p.primary_item AS primaryItem,
              p.will_be_present AS willBePresent,
              p.hostel_block AS hostelBlock,
              t.id AS tokenId,
              t.token_code AS tokenCode,
              t.used_at AS usedAt,
              t.revoked_at AS revokedAt,
              t.expires_at AS tokenExpiresAt,
              s.id AS servedId,
              s.served_at AS servedAt,
              s.method AS servedMethod
         FROM mess_preferences p
         JOIN mess_days d ON d.id = p.mess_day_id
         LEFT JOIN mess_tokens t
           ON t.user_id::text = p.user_id::text AND t.mess_day_id = p.mess_day_id
         LEFT JOIN mess_meal_served s
           ON s.user_id::text = p.user_id::text AND s.mess_day_id = p.mess_day_id
        WHERE p.user_id::text = $1
        ORDER BY d.meal_date DESC
        LIMIT 8`,
      [auth.userId]
    );

    // Group into per-day entries.
    const byDay = new Map<string, any>();
    for (const r of res.rows as any[]) {
      const entry = byDay.get(r.messDayId) ?? {
        messDayId: r.messDayId,
        mealDate: r.mealDate,
        mealType: r.mealType,
        primaryItem: r.primaryItem,
        willBePresent: r.willBePresent,
        hostelBlock: r.hostelBlock,
        token: null,
        served: null,
      };
      if (r.tokenCode && !entry.token) {
        entry.token = {
          id: r.tokenId,
          code: r.tokenCode,
          usedAt: r.usedAt,
          revokedAt: r.revokedAt,
          expiresAt: r.tokenExpiresAt,
          status: r.revokedAt ? "REVOKED" : r.usedAt ? "USED" : "ACTIVE",
        };
      }
      if (r.servedId && !entry.served) {
        entry.served = { servedAt: r.servedAt, method: r.servedMethod };
      }
      byDay.set(r.messDayId, entry);
    }

    return ok({ history: Array.from(byDay.values()) });
  } catch (err) {
    console.error("[mess/history GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load history" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: ["student"] }),
  { keyPrefix: "mess_history_get" }
);
