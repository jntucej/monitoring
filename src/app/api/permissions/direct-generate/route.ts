import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { addAudit, addNotification } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import {
  directGeneratePass,
  generateTicketNumber,
  requiresStepup,
  maxDurationForReason,
} from "@/lib/permission-workflow";
import { checkStepupPassword, DIRECT_GENERATE_ROLES } from "@/lib/permission-forward";
import { normalizeExitReason } from "@/lib/student-exit-flow";
import { RATE_LIMITS } from "@/config/app-constants";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

type DirectGenReason = "home_out" | "day_pass" | "emergency" | "special_leave";

interface Body {
  studentUserId?: string;
  reason?: DirectGenReason;
  from?: string;
  to?: string | null;
  note?: string;
  stepupPassword?: string;
  pendingHostelBlock?: string;
  pendingRoomNumber?: string;
  pendingWardenId?: string;
}

async function requesterEntryType(studentUserId: string): Promise<string | null> {
  const { rows } = await query<{ current_entry_type: string | null }>(
    `SELECT current_entry_type FROM student_details WHERE user_id = $1 LIMIT 1`,
    [studentUserId],
  );
  return rows[0]?.current_entry_type ?? null;
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const body = (await req.json().catch(() => ({}))) as Body;

  if (!body.studentUserId) {
    return fail("MISSING_STUDENT", "studentUserId required", 400);
  }
  if (!body.reason || !["home_out", "day_pass", "emergency", "special_leave"].includes(body.reason)) {
    return fail("INVALID_REASON", "reason must be home_out|day_pass|emergency|special_leave", 400);
  }
  if (!body.from) {
    return fail("MISSING_FROM", "from datetime required", 400);
  }
  if (!DIRECT_GENERATE_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Role cannot direct-generate", 403);
  }

  const entryType = await requesterEntryType(body.studentUserId);
  if (body.reason === "home_out" && entryType === "day_scholar") {
    if (!body.pendingHostelBlock || !body.pendingRoomNumber || !body.pendingWardenId) {
      return fail(
        "HOSTEL_ROOM_REQUIRED",
        "home_out for a day_scholar requires pendingHostelBlock, pendingRoomNumber, pendingWardenId",
        400,
      );
    }
  }

  const needsStepup = requiresStepup({
    actorRole: auth.role,
    action: "direct_generate",
    reason: body.reason,
  });

  let stepupVerified = false;
  if (needsStepup) {
    const outcome = await checkStepupPassword(auth.userId, auth.role, body.stepupPassword ?? "");
    if (!outcome.ok) {
      return fail(outcome.code, outcome.message, outcome.failed ? 423 : 400);
    }
    stepupVerified = true;
  }

  const maxHours = maxDurationForReason(body.reason);
  const fromDate = new Date(body.from);
  const toDate = body.to ? new Date(body.to) : null;
  if (maxHours !== null && toDate) {
    const hours = (toDate.getTime() - fromDate.getTime()) / 3_600_000;
    if (hours > maxHours) {
      return fail(
        "DURATION_EXCEEDED",
        `${body.reason} max is ${maxHours}h (requested ${hours.toFixed(1)}h)`,
        400,
      );
    }
  }
  if (fromDate > new Date()) {
    if (toDate && fromDate > toDate) {
      return fail("INVALID_DATES", "from must be <= to", 400);
    }
  }

  const ticket = await generateTicketNumber("hostel");
  const supabase = getSupabaseServiceClient();
  const { data: row, error: insErr } = await supabase
    .from("permissions")
    .insert({
      ticket_number: ticket,
      workflow_type: "hostel",
      requester_user_id: auth.userId,
      student_user_id: body.studentUserId,
      current_stage: "completed",
      status: "APPROVED",
      priority: body.reason === "emergency" ? "urgent" : "medium",
      stage_history: [],
      reason: normalizeExitReason(body.reason),
      description: body.note ?? null,
      from_date: fromDate.toISOString(),
      to_date: toDate?.toISOString() ?? null,
      direct_generated: true,
      routed_to_role: null,
      stepup_verified_at: stepupVerified ? new Date().toISOString() : null,
      stepup_verified_by: stepupVerified ? auth.userId : null,
      pending_hostel_block: body.pendingHostelBlock ?? null,
      pending_room_number: body.pendingRoomNumber ?? null,
      pending_warden_id: body.pendingWardenId ?? null,
    })
    .select()
    .single();

  if (insErr || !row) return fail("DB_ERROR", insErr?.message ?? "Insert failed", 500);

  await addAudit({
    action: "PERMISSION_DIRECT_GENERATED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({
      ticket,
      reason: body.reason,
      studentUserId: body.studentUserId,
      stepupVerified,
    }),
  });

  await addNotification(
    "user",
    body.studentUserId,
    "permission",
    "Pass Generated",
    `Your ${body.reason.replace("_", " ")} pass ${ticket} is ready`,
  );

  return ok({
    id: row.id,
    ticket,
    reason: body.reason,
    status: "APPROVED",
    currentStage: "completed",
    directGenerated: true,
    stepupVerified,
    from: fromDate.toISOString(),
    to: toDate?.toISOString() ?? null,
  });
}

export const POST = withMutationGuard(handlePost, {
  rateLimit: RATE_LIMITS.PERMISSION_DIRECT_GENERATE,
});
