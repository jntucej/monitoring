// src/app/api/permissions/[ticket]/revoke/route.ts
// POST /api/permissions/[ticket]/revoke — revoke an APPROVED ticket.
// Approvers only. Sets status to CANCELLED, audits, notifies the student.

import { NextRequest } from "next/server";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { addAudit, addNotification } from "@/lib/db";
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

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicket(req);
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  const scoped = await getScopedTicket(ticket, auth.userId, auth.role);
  if ("notFound" in scoped) return fail("TICKET_NOT_FOUND", "Not found", 404);
  if ("forbidden" in scoped) return fail("FORBIDDEN", "Not allowed", 403);
  const row = scoped.request;

  if (!APPROVER_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Only approvers can revoke", 403);
  }
  if (row.status !== "APPROVED") {
    return fail("NOT_REVOCABLE", "Only APPROVED tickets can be revoked", 409);
  }

  const db = getSupabaseServiceClient();
  const history = appendStageHistory(
    row.stage_history,
    { id: auth.userId, name: auth.email ?? "", role: auth.role },
    "REVOKED",
    reason ?? "Revoked after approval",
  );

  const { error } = await db
    .from("permissions")
    .update({
      status: "CANCELLED",
      current_stage: "cancelled",
      stage_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) return fail("DB_ERROR", error.message, 500);

  // Note the orphan case: student already left on this pass.
  const { data: lastScan } = await db
    .from("movement_logs")
    .select("id, direction, timestamp")
    .eq("user_id", row.student_user_id)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastScan?.direction === "OUT") {
    await addAudit({
      action: "PASS_REVOKED_WHILE_OUT",
      userId: auth.userId,
      role: auth.role as Role,
      details: { ticket, lastScanId: lastScan.id, lastScanAt: lastScan.timestamp },
    });
  }

  await addAudit({
    action: "PERMISSION_REVOKED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ticket, reason },
  });
  await addNotification(
    "user",
    row.student_user_id,
    "pass_revoked",
    "Pass revoked",
    `Your pass ${ticket} was revoked. Reason: ${reason ?? "not specified"}`,
  );

  return ok({ ticket, revoked: true });
}

export const POST = withAuthorization(handlePost);
