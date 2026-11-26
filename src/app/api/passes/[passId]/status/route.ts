// /api/passes/[passId]/status/route.ts
// GET — the live status for PassLiveTracker: the pass's approval status +
// the last gate scan (direction + timestamp). The "TRACK" step of the
// pass loop. Auth: the pass owner or their parent/guardian/admin.

import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization, type AuthContext } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

function getPassId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("passes");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const passId = getPassId(req);
  if (!passId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PASS_ID" } },
      { status: 400 },
    );
  }

  const uid = ctx.auth.userId;

  // The pass's current status + the student it belongs to.
  const { rows: passRows } = await query(
    `SELECT pr.status, pr.expected_return_at, pr.student_user_id
     FROM public.permission_requests pr WHERE pr.id = $1`,
    [passId],
  );
  const pass = passRows[0];
  if (!pass) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  // Authorize: the owner, their parent/guardian, or an admin role.
  const isOwner = pass.student_user_id === uid;
  const isAdmin = ["admin", "sysadmin"].includes(ctx.auth.role ?? "");
  if (!isOwner && !isAdmin) {
    // Parent/guardian of this student?
    const { rows: relRows } = await query(
      `SELECT 1 FROM public.guardian_relations gr
       WHERE gr.guardian_id = $1 AND gr.student_id = $2 LIMIT 1`,
      [uid, pass.student_user_id],
    );
    if (relRows.length === 0) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });
    }
  }

  // The last gate scan for the student (movement_logs links by user_id).
  const { rows: scanRows } = await query(
    `SELECT direction, timestamp FROM public.movement_logs
     WHERE user_id = $1
     ORDER BY timestamp DESC LIMIT 1`,
    [pass.student_user_id ?? uid],
  );

  return NextResponse.json({
    success: true,
    status: pass.status,
    expected_return_at: pass.expected_return_at ?? null,
    last_scan:
      scanRows[0]
        ? { direction: scanRows[0].direction, at: scanRows[0].timestamp }
        : null,
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/passes/[passId]/status",
  auth: "user",
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "passes-status", maxRequests: 60, windowMs: 60_000 },
});
