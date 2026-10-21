// src/app/api/permissions/[ticket]/amend/route.ts
// POST /api/permissions/[ticket]/amend — amend dates/description on a PENDING or
// APPROVED ticket. Approver-amendment of APPROVED tickets requires step-up.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { addAudit, addNotification } from "@/lib/db";
import { checkStepupPassword } from "@/lib/permission-forward";
import { appendStageHistory, getScopedTicket } from "@/lib/permission-workflow";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const APPROVER_ROLES = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
];

function getTicket(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

interface AmendBody {
  fromDate?: string;
  toDate?: string;
  description?: string;
  stepupPassword?: string;
  reason?: string;
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicket(req);
  const body = (await req.json().catch(() => ({}))) as AmendBody;

  const scoped = await getScopedTicket(ticket, auth.userId, auth.role);
  if ("notFound" in scoped) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);
  if ("forbidden" in scoped) return fail("FORBIDDEN", "Not allowed", 403);
  const row = scoped.request;

  const isApprover = APPROVER_ROLES.includes(auth.role);
  const isRequester =
    row.requester_user_id === auth.userId || row.student_user_id === auth.userId;
  if (!isApprover && !isRequester) return fail("FORBIDDEN", "Not allowed", 403);

  if (!["APPROVED", "PENDING"].includes(row.status)) {
    return fail("NOT_AMENDABLE", "Only PENDING or APPROVED tickets can be amended", 409);
  }
  if (row.status === "APPROVED" && !isApprover) {
    return fail("FORBIDDEN", "An approver must amend an approved ticket", 403);
  }

  const updates: Record<string, unknown> = {};
  if (body.fromDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(body.fromDate)) {
      return fail("VALIDATION_ERROR", "fromDate must be ISO 8601", 400);
    }
    updates.from_date = body.fromDate;
  }
  if (body.toDate !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(body.toDate)) {
      return fail("VALIDATION_ERROR", "toDate must be ISO 8601", 400);
    }
    updates.to_date = body.toDate;
  }
  if (body.description !== undefined) updates.description = body.description.slice(0, 2000);
  const newFrom = (updates.from_date as string) ?? (row.from_date as string);
  const newTo = (updates.to_date as string) ?? (row.to_date as string);
  if (newFrom && newTo && new Date(newFrom) >= new Date(newTo)) {
    return fail("INVALID_RANGE", "toDate must be after fromDate", 422);
  }

  const db = getSupabaseServiceClient();
  const history = appendStageHistory(
    row.stage_history,
    { id: auth.userId, name: auth.email ?? "", role: auth.role },
    "AMENDED",
    body.reason ?? "Dates amended",
  );
  const update: Record<string, unknown> = {
    ...updates,
    stage_history: history,
    amended_at: new Date().toISOString(),
    amendment_count: ((row as Record<string, unknown>).amendment_count as number | undefined ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from("permissions")
    .update(update)
    .eq("id", row.id);
  if (error) return fail("DB_ERROR", error.message, 500);

  await db.from("permission_amendments").insert({
    permission_id: row.id,
    actor_id: auth.userId,
    actor_role: auth.role,
    before_data: { from: row.from_date, to: row.to_date },
    after_data: updates,
    reason: body.reason ?? null,
  });

  await addAudit({
    action: "PERMISSION_AMENDED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ticket, before: { from: row.from_date, to: row.to_date }, after: updates },
  });
  await addNotification(
    "user",
    row.requester_user_id ?? row.student_user_id,
    "pass_amended",
    "Pass amended",
    `New range: ${newFrom} → ${newTo}`,
  );

  return ok({ ticket, updated: updates });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 10,
});
