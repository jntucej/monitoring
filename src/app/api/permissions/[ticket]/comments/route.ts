// src/app/api/permissions/[ticket]/comments/route.ts
// GET  /api/permissions/[ticket]/comments — list the ticket's comment entries.
// POST /api/permissions/[ticket]/comments { comment } — append a comment entry.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { addAudit } from "@/lib/db";
import {
  appendStageHistory,
  getScopedTicket,
  type StageHistoryEntry,
} from "@/lib/permission-workflow";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getTicket(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const ticket = getTicket(req);
  const scoped = await getScopedTicket(ticket, auth.userId, auth.role);
  if ("notFound" in scoped || "forbidden" in scoped) {
    return fail("TICKET_NOT_FOUND", "Not found", 404);
  }

  const history = (scoped.request.stage_history ?? []) as StageHistoryEntry[];
  const comments = history.filter(
    (h) => typeof h.comment === "string" && h.comment.length > 0,
  );

  return ok({ ticket, comments });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicket(req);
  const { comment } = (await req.json().catch(() => ({}))) as { comment?: string };
  if (!comment || !comment.trim()) {
    return fail("VALIDATION_ERROR", "comment required", 400);
  }

  const scoped = await getScopedTicket(ticket, auth.userId, auth.role);
  if ("notFound" in scoped || "forbidden" in scoped) {
    return fail("TICKET_NOT_FOUND", "Not found", 404);
  }
  const row = scoped.request;

  const history = appendStageHistory(
    row.stage_history,
    { id: auth.userId, name: auth.email ?? "", role: auth.role },
    "COMMENTED",
    comment.trim().slice(0, 2000),
  );

  const db = getSupabaseServiceClient();
  const { error } = await db
    .from("permissions")
    .update({ stage_history: history, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) return fail("DB_ERROR", error.message, 500);

  await addAudit({
    action: "PERMISSION_COMMENT_ADDED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ticket },
  });

  return ok({ ticket, commented: true });
}

export const GET = withAuthorization(handleGet);
export const POST = withAuthorization(handlePost);
