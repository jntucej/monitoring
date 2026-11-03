import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/postgres";
import { requireRole } from "@/lib/authContext";

/**
 * J2 — Dual-control re-arm for automation kill switches.
 *
 * ENGAGE is cheap (one admin flips automation_controls rows to FALSE —
 * done by the drill script / ops, not this route). RE-ENABLE is
 * expensive: a request must collect approvals from TWO DISTINCT sysadmins
 * before the re-arm worker flips the switches back on. This route records
 * the request and the approvals; rearm_approve() (SECURITY DEFINER)
 * enforces the distinct-user invariant inside the DB.
 *
 * POST is the only state-changing verb and uses the manual requireRole
 * guard (the withAdminMutation wrapper's requireAuthUser path is only
 * safe against paths that are NOT behind a nested admin path — this
 * route lives under /api/sysadmin/ and the guard chain double-authenticates
 * when combined with requireRole, so the explicit requireRole call is the
 * canonical single-authentication pattern used across the rest of
 * /api/sysadmin/).
 */

async function requireSysadmin(req: NextRequest): Promise<{ userId: string; email?: string } | NextResponse> {
  let ctx: { userId: string; email?: string };
  try {
    ctx = await requireRole(req.headers.get("authorization") ?? "", ["sysadmin", "admin"]);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }
  return { userId: ctx.userId, email: ctx.email };
}

export async function POST(req: NextRequest) {
  const guard = await requireSysadmin(req);
  if (guard instanceof NextResponse) return guard;
  const { userId, email } = guard;

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 512) : "";

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.automation_controls_rearm_requests (requested_by, reason)
     VALUES ($1, $2)
     RETURNING id`,
    [userId, reason],
  );
  const id = rows[0]?.id ?? null;
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "failed to create rearm request" } },
      { status: 500 },
    );
  }

  // Audit row in the same transactional context (RLS write discipline).
  await withTransaction(async () => {
    await query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, role, details)
       VALUES ($1, $2, $3, 'sysadmin', $4::jsonb)`,
      [
        "REARM_REQUESTED",
        userId,
        email ?? null,
        JSON.stringify({ rearm_request_id: id, reason }),
      ],
    );
  });

  return NextResponse.json({ success: true, rearm_request_id: id }, { status: 201 });
}

/**
 * GET /api/sysadmin/drills/rearm — list open (incomplete) re-arm requests
 * so operators can see which subsystems are waiting on the second approval.
 */
export async function GET(req: NextRequest) {
  const guard = await requireSysadmin(req);
  if (guard instanceof NextResponse) return guard;

  const { rows } = await query<{
    id: string;
    requested_by: string;
    requested_at: string;
    reason: string;
    approved_by_1: string | null;
    approved_by_2: string | null;
  }>(
    `SELECT id, requested_by, requested_at, reason, approved_by_1, approved_by_2
       FROM public.automation_controls_rearm_requests
      WHERE completed_at IS NULL
      ORDER BY requested_at DESC LIMIT 50`,
  );
  return NextResponse.json({ success: true, data: rows });
}
