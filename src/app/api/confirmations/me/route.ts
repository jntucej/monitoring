// /api/confirmations/me — the unified, role-agnostic confirmation queue.
//
// One table, one queue: every role's "Confirmations" panel reads this. A
// permission row is pending for the role named in `current_stage` while its
// status is PENDING or ESCALATED. Deciding a row goes through the entity's
// EXISTING endpoint (POST /api/confirmations/[id]/decide) — this route only
// lists. That unifies the UI without breaking the existing per-entity
// handlers.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  // A privileged role can peek at another user's queue (read-only).
  const targetRole = url.searchParams.get("role") ?? auth.role;
  const isSelf = targetRole === auth.role;
  if (!isSelf && !["admin", "principal", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "cannot view another role's queue", 403);
  }

  const { rows } = await query<Record<string, unknown>>(
    `SELECT p.id,
            p.ticket_number,
            p.workflow_type,
            p.status,
            p.current_stage,
            p.requester_user_id,
            u.name            AS requester_name,
            u.login_id       AS requester_roll,
            p.reason,
            p.from_date,
            p.to_date,
            p.sla_deadline,
            p.created_at
       FROM public.permissions p
       LEFT JOIN public.users u ON u.id = p.requester_user_id
      WHERE p.current_stage = $1
        AND p.status IN ('PENDING','ESCALATED')
      ORDER BY p.sla_deadline ASC NULLS LAST, p.created_at ASC
      LIMIT 200`,
    [targetRole]
  );

  // Compute which stage each is at out of how many the chain needs. We
  // don't have a confirmations table (we reuse permissions' stage_history),
  // so stage_no is derived from the stage_history length +1.
  const items = rows.map((r) => ({
    ...r,
    is_for_current_user: isSelf,
  }));

  return ok({ queue: items, role: targetRole, count: items.length });
}

export const GET = withAuthorization(handleGet);
