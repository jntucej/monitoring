// src/app/api/admin/hostel-tickets/route.ts
// SCAFFOLD:TICKETS — cross-cutting view for sysadmin / admin dashboards.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";

const VIEW_ROLES: Role[] = [
  "sysadmin", "admin", "principal",
] as Role[];

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!VIEW_ROLES.includes(auth.role as Role)) {
    return NextResponse.json(
      { success: false, code: "FORBIDDEN", error: "Not authorized to view this queue." },
      { status: 403 },
    );
  }

  const svc = getSupabaseServiceClient();
  // Query the real `permissions` table (not the backward-compat view) so the
  // resource-embedding join on the FK works reliably. The column was renamed
  // from student_user_id to requester_user_id by migration 20261026000001.
  const { data, error } = await svc
    .from("permissions")
    .select(
      "ticket_number, workflow_type, current_stage, status, requester_user_id, created_at, " +
        "requester:users(id, name, unique_id)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []).map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    const requesterName = (rec.requester as { name?: string } | null)?.name ?? null;
    return {
      ticket_number: rec.ticket_number,
      workflow_type: rec.workflow_type,
      current_stage: rec.current_stage,
      status: rec.status,
      student_user_id: rec.requester_user_id,
      // Return null when the join misses (deleted user etc.); the UI renders "Unknown".
      requester_name: requesterName,
      created_at: rec.created_at,
    };
  });

  return NextResponse.json({ success: true, data: rows });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "admin_tickets",
  maxRequests: 60,
});
