// /api/permissions/[ticket]/track/route.ts
// GET — the document/permission status-change timeline for a ticket, read
// from the stage_history JSONB column on permission_requests. Feeds
// DocumentTrackTimeline (the TRACK step of the document loop).
//
// stage_history entries have the shape { stage, action, comment, timestamp,
// transition? } (see appendStageHistory in lib/permission-workflow-core).
// We map each entry to the DocumentTrackTimeline events shape.

import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization, type AuthContext } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

function getTicket(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const ticket = getTicket(req);
  if (!ticket) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_TICKET" } },
      { status: 400 },
    );
  }

  // The ticket's stage_history + current status + doc URL.
  const { rows } = await query(
    `SELECT status, stage_history, document_url, created_at, updated_at
     FROM public.permission_requests WHERE ticket_number = $1`,
    [ticket],
  );
  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  // Authorize: owner or an admin role.
  const { rows: ownerRows } = await query(
    `SELECT 1 FROM public.permission_requests WHERE ticket_number = $1 AND student_user_id = $2`,
    [ticket, ctx.auth.userId],
  );
  const isAdmin = ["admin", "sysadmin"].includes(ctx.auth.role ?? "");
  if (ownerRows.length === 0 && !isAdmin) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN" } },
      { status: 403 },
    );
  }

  // Map stage_history entries -> timeline events.
  const history: Array<Record<string, unknown>> = Array.isArray(row.stage_history)
    ? row.stage_history
    : [];
  const events = history.map((h) => ({
    stage: (h.stage as string) ?? "",
    action: (h.action as string) ?? "",
    comment: (h.comment as string | null) ?? undefined,
    actor: h.actor
      ? (typeof h.actor === "string"
          ? h.actor
          : (h.actor as { name?: string; role?: string }).name ??
            (h.actor as { role?: string }).role)
      : undefined,
    timestamp: (h.timestamp as string) ?? row.created_at,
  }));

  return NextResponse.json({
    success: true,
    status: row.status,
    document_url: row.document_url ?? null,
    events,
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/permissions/[ticket]/track",
  auth: "user",
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "perm-track", maxRequests: 60, windowMs: 60_000 },
});
