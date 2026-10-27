import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/operational-requests
 *
 * Mess operational requests queue for the Mess In-charge: operational
 * requests (supply, equipment, staffing, etc.) raised for the mess,
 * sourced from the institution's audit trail. Includes open (unresolved)
 * requests and recently resolved ones.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)));
    const res = await query(
      `SELECT id,
              timestamp AS createdAt,
              user_name AS raisedBy,
              details->>'category' AS category,
              details->>'title' AS title,
              details->>'priority' AS priority,
              details->>'description' AS description,
              details->>'status' AS status,
              details->>'resolved_at' AS resolvedAt,
              details->>'resolution' AS resolution
         FROM audit_logs
        WHERE action IN ('MESS_OPERATIONAL_REQUEST_RAISED', 'MESS_ISSUE_RAISED')
        ORDER BY timestamp DESC
        LIMIT $1`,
      [limit]
    );

    const rows = res.rows.map((r: any) => ({
      id: r.id,
      createdAt: r.createdAt,
      raisedBy: r.raisedBy ?? "Mess In-charge",
      category: r.category ?? "general",
      title: r.title ?? r.action ?? "Mess operational request",
      priority: r.priority ?? "medium",
      description: r.description ?? null,
      status: r.status ?? "OPEN",
      resolvedAt: r.resolvedAt ?? null,
      resolution: r.resolution ?? null,
    }));

    const open = rows.filter((r) => r.status === "OPEN" && !r.resolvedAt);
    return ok({ requests: rows, openCount: open.length, total: rows.length });
  } catch (err) {
    console.error("[mess/operational-requests GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load operational requests" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mess/operational-requests
 *
 * Raise an operational request (to caretaker / facilities authority).
 * Categories: supply, equipment, staffing, hygiene, other.
 * Logged in the audit trail — the queue above reads it back.
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const title: string = (body?.title ?? "").toString().trim();
    const category: string = (body?.category ?? "other").toString().trim().toLowerCase();
    const priority: string = (body?.priority ?? "medium").toString().trim().toLowerCase();
    const description: string = (body?.description ?? "").toString().trim();

    if (!title) return fail("MISSING_PARAM", "title is required", 400);
    if (!["supply", "equipment", "staffing", "hygiene", "other"].includes(category)) {
      return fail("BAD_CATEGORY", "category must be one of: supply, equipment, staffing, hygiene, other", 400);
    }
    if (!["low", "medium", "high"].includes(priority)) {
      return fail("BAD_PRIORITY", "priority must be low, medium, or high", 400);
    }

    await addAudit({
      action: "MESS_OPERATIONAL_REQUEST_RAISED",
      userId: auth.userId,
      role: auth.role,
      details: {
        title,
        category,
        priority,
        description,
        status: "OPEN",
      },
    });

    return ok({ raised: true, title, category, priority });
  } catch (err) {
    console.error("[mess/operational-requests POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to raise operational request" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_op_requests_get" }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_op_requests_post", maxRequests: 20 }
);
