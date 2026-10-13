import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/issues
 *
 * Mess issues / exception feed for the Mess In-charge: the latest
 * mess_notifications_log events (no-show flags, token revokes, etc.),
 * scoped to the institution's mess operations.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)));
    const res = await query(
      `SELECT n.id,
              n.user_id AS userId,
              n.mess_day_id AS messDayId,
              n.event_type AS eventType,
              n.channel,
              n.status,
              n.payload,
              n.sent_at AS sentAt,
              n.created_at AS createdAt,
              d.meal_date AS mealDate,
              u.name AS userName
         FROM mess_notifications_log n
         LEFT JOIN mess_days d ON d.id = n.mess_day_id
         LEFT JOIN users u ON u.id::text = n.user_id::text
        ORDER BY n.created_at DESC
        LIMIT $1`,
      [limit]
    );

    const rows = res.rows.map((r: any) => ({
      id: r.id,
      eventType: r.eventType,
      channel: r.channel,
      status: r.status,
      userName: r.userName ?? null,
      mealDate: r.mealDate ?? null,
      payload: r.payload ?? null,
      sentAt: r.sentAt ?? null,
      createdAt: r.createdAt,
    }));

    return ok({ issues: rows, total: rows.length });
  } catch (err) {
    console.error("[mess/issues GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load mess issues" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mess/issues
 *
 * Raise a mess issue (incident/exception) as the Mess In-charge.
 * Logged in the audit trail — issues are audit-sourced, not a DB table.
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const eventType: string = (body?.eventType ?? "MESS_ISSUE").toString().toUpperCase().trim();
    const description: string = (body?.description ?? "").toString().trim();
    if (!description) return fail("MISSING_PARAM", "description is required", 400);

    await addAudit({
      action: "MESS_ISSUE_RAISED",
      userId: auth.userId,
      role: auth.role,
      details: { eventType, description },
    });

    return ok({ raised: true, eventType, description, at: new Date().toISOString() });
  } catch (err) {
    console.error("[mess/issues POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to raise mess issue" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_issues_get" }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_issues_post", maxRequests: 20 }
);
