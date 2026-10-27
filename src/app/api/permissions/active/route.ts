// src/app/api/permissions/active/route.ts
// GET /api/permissions/active?user_id=... — list a user's currently usable
// (APPROVED, unused, unexpired) passes.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const PRIV_ROLES = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id") ?? auth.userId;

  if (targetUserId !== auth.userId && !PRIV_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const result = await query(
    `SELECT id, ticket_number, workflow_type, reason, from_date, to_date,
            status, current_stage, used_at, stage_history
       FROM public.permissions
      WHERE requester_user_id = $1
        AND status = 'APPROVED'
        AND used_at IS NULL
        AND (to_date IS NULL OR to_date >= NOW())
      ORDER BY from_date ASC`,
    [targetUserId],
  );

  return ok({ passes: result.rows });
}

export const GET = withAuthorization(handleGet);
