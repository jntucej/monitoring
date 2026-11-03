import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/postgres";
import { requireRole } from "@/lib/authContext";

/**
 * J2 — POST /api/sysadmin/drills/rearm/[id]/approve
 *
 * Records one approval on a re-arm request. Two DISTINCT sysadmin
 * approvals are required before the re-arm worker completes the request
 * and flips the automation_controls.auto_* rows back to enabled=TRUE.
 * The DB function rearm_approve() enforces the distinct-user invariant;
 * a second call by the same approver is a no-op (idempotent).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "id must be a UUID" } },
      { status: 400 },
    );
  }

  let ctx;
  try {
    ctx = await requireRole(req.headers.get("authorization") ?? "", ["sysadmin", "admin"]);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  await withTransaction(async () => {
    await query("SELECT public.rearm_approve($1::uuid, $2::uuid)", [id, ctx.userId]);
    await query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, role, details)
       VALUES ($1, $2, $3, 'sysadmin', $4::jsonb)`,
      [
        "REARM_APPROVAL",
        ctx.userId,
        ctx.email ?? null,
        JSON.stringify({ rearm_request_id: id }),
      ],
    );
  });

  const { rows } = await query<{
    approved_by_1: string | null;
    approved_by_2: string | null;
  }>(
    `SELECT approved_by_1, approved_by_2
       FROM public.automation_controls_rearm_requests WHERE id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    approved_by_1: r.approved_by_1,
    approved_by_2: r.approved_by_2,
    ready_for_rearm: r.approved_by_1 !== null && r.approved_by_2 !== null,
  });
}
