import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { addAudit, addNotification, getLinkedPersons } from "@/lib/db";
import { query } from "@/lib/postgres";
import {
  resolveInitialStageForRequester,
  generateTicketNumber,
  WORKFLOW_STAGES,
  type WorkflowType,
} from "@/lib/permission-workflow";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

interface CreatePermissionBody {
  workflowType?: WorkflowType;
  reason?: string;
  description?: string;
  fromDate?: string;
  toDate?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  branch?: string;
  hostelScope?: "boys" | "girls";
  documentRequired?: boolean;
  studentUserId?: string;
}

const VALID_WORKFLOWS: WorkflowType[] = ["hostel", "exam", "memo", "staff_leave", "lab_access"];
const VALID_PRIORITIES: Array<CreatePermissionBody["priority"]> = [
  "low", "medium", "high", "urgent",
];

async function deriveHostelScope(
  workflowType: WorkflowType,
  studentUserId: string,
): Promise<"boys" | "girls" | null> {
  if (workflowType !== "hostel") return null;
  const { rows } = await query<{ gender: string | null }>(
    `SELECT gender FROM student_details WHERE user_id = $1 LIMIT 1`,
    [studentUserId],
  );
  const g = rows[0]?.gender;
  if (g === "male") return "boys";
  if (g === "female") return "girls";
  return null;
}

const SLA_HOURS: Record<WorkflowType, Record<string, number>> = {
  hostel:      { caretaker: 24, deputy_warden: 12, hostel_manager: 12, principal: 24 },
  exam:        { hod: 48, oie: 24, exam_branch: 24, vice_principal: 24, principal: 24 },
  memo:        { hod: 48, principal: 48 },
  staff_leave: { hod: 48, principal: 48 },
  lab_access:  { faculty: 24, hod: 24, principal: 24 },
};

function computeSlaDeadline(workflowType: WorkflowType, initialStage: string): string {
  const hours = SLA_HOURS[workflowType]?.[initialStage] ?? 48;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const body = (await req.json().catch(() => ({}))) as CreatePermissionBody;

  const workflowType = body.workflowType;
  if (!workflowType || !VALID_WORKFLOWS.includes(workflowType)) {
    return fail(
      "INVALID_WORKFLOW",
      `workflowType must be one of: ${VALID_WORKFLOWS.join(", ")}`,
      400,
    );
  }
  const reason = (body.reason ?? "").trim();
  if (!reason) return fail("MISSING_REASON", "reason is required", 400);
  const priority = VALID_PRIORITIES.includes(body.priority ?? "medium")
    ? (body.priority ?? "medium")
    : "medium";

  let studentUserId: string;
  if (body.studentUserId) {
    if (!["admin", "sysadmin", "principal", "vice_principal", "hod"].includes(auth.role)) {
      return fail("FORBIDDEN", "Only staff may submit on behalf of a student", 403);
    }
    studentUserId = body.studentUserId;
  } else {
    if (auth.role !== "student") {
      return fail(
        "FORBIDDEN",
        "Only students submit their own requests — pass studentUserId as staff",
        403,
      );
    }
    studentUserId = auth.userId;
  }

  const { rows: studentRows } = await query<{ id: string; role: string }>(
    `SELECT id, role FROM users WHERE id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [studentUserId],
  );
  if (!studentRows[0]) {
    return fail("STUDENT_NOT_FOUND", "Target student not found or inactive", 404);
  }

  const initialStage = resolveInitialStageForRequester(workflowType, auth.role);
  const derivedScope = await deriveHostelScope(workflowType, studentUserId);
  const explicitScope =
    workflowType === "hostel" && (body.hostelScope === "boys" || body.hostelScope === "girls")
      ? body.hostelScope
      : null;
  const hostelScope = explicitScope ?? derivedScope;

  const branch =
    workflowType === "staff_leave"
      ? (auth.departmentId ?? body.branch ?? null)
      : (body.branch ?? null);

  const fromDate = body.fromDate ? new Date(body.fromDate) : null;
  const toDate = body.toDate ? new Date(body.toDate) : null;
  if (fromDate && toDate && fromDate > toDate) {
    return fail("INVALID_DATES", "fromDate must be <= toDate", 400);
  }

  const ticketNumber = await generateTicketNumber(workflowType);
  const slaDeadline = computeSlaDeadline(workflowType, initialStage);

  const supabase = getSupabaseServiceClient();
  const { data: inserted, error: insErr } = await supabase
    .from("permissions")
    .insert({
      ticket_number: ticketNumber,
      workflow_type: workflowType,
      requester_user_id: auth.userId,
      student_user_id: studentUserId,
      current_stage: initialStage,
      status: "PENDING",
      priority,
      stage_history: [],
      document_required: Boolean(body.documentRequired),
      reason,
      description: body.description ?? null,
      from_date: fromDate?.toISOString() ?? null,
      to_date: toDate?.toISOString() ?? null,
      hostel_scope: hostelScope,
      branch,
      routed_to_role: initialStage,
      sla_deadline: slaDeadline,
    })
    .select()
    .single();

  if (insErr || !inserted) {
    return fail("DB_ERROR", insErr?.message ?? "Insert failed", 500);
  }

  await addAudit({
    action: "PERMISSION_REQUEST_CREATED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({
      ticket: ticketNumber,
      workflowType,
      initialStage,
      hostelScope,
      branch,
      studentUserId,
    }),
  });

  await notifyStage(initialStage, ticketNumber, workflowType, studentUserId);

  return ok({
    id: inserted.id,
    ticketNumber,
    workflowType,
    currentStage: initialStage,
    status: "PENDING",
    hostelScope,
    branch,
    slaDeadline,
  });
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  // Callers use three param names for the workflow filter
  // (workflowType / workflow_type / workflow) — accept all of them.
  const workflow =
    (url.searchParams.get("workflowType") ??
      url.searchParams.get("workflow_type") ??
      url.searchParams.get("workflow")) as WorkflowType | null;
  const stage = url.searchParams.get("stage") ?? url.searchParams.get("assigned_stage") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const where: string[] = [];
  const params: unknown[] = [];

  const role: string = auth.role;
  if (["admin", "sysadmin"].includes(role)) {
    // see everything
  } else if (["principal", "vice_principal"].includes(role)) {
    // see everything
  } else if (["caretaker", "deputy_warden", "hostel_manager"].includes(role)) {
    params.push(auth.userId);
    where.push(`(
      workflow_type <> 'hostel'
      OR hostel_scope IS NULL
      OR hostel_scope = (SELECT hostel_scope FROM users WHERE id = $${params.length})
    )`);
  } else if (["hod", "faculty", "oie", "exam_branch", "exam_superintendent"].includes(role)) {
    params.push(auth.departmentId ?? "");
    where.push(`(workflow_type NOT IN ('staff_leave','memo') OR branch = $${params.length} OR branch IS NULL)`);
  } else if (["parent", "guardian"].includes(role)) {
    params.push(auth.userId);
    where.push(`(
      student_user_id IN (SELECT user_id FROM student_details WHERE guardian_id = $${params.length})
      OR requester_user_id = $${params.length}
    )`);
  } else if (role === "student") {
    params.push(auth.userId);
    where.push(`(requester_user_id = $${params.length} OR student_user_id = $${params.length})`);
  } else if (role === "staff") {
    params.push(auth.userId);
    where.push(`(requester_user_id = $${params.length})`);
  } else if (role === "supervisor") {
    // Supervisors action out-pass / staff-leave escalations across the whole
    // campus (their supervised gates are advisory, not a data filter), so
    // they see all requests — same as principal, whose escalation chain they
    // feed.
  } else {
    return fail("FORBIDDEN", "Role has no permission visibility", 403);
  }

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (workflow) {
    params.push(workflow);
    where.push(`workflow_type = $${params.length}`);
  }
  if (stage) {
    params.push(stage);
    where.push(`current_stage = $${params.length}`);
  }

  params.push(limit, offset);
  const sql = `
    SELECT id, ticket_number, workflow_type, requester_user_id, student_user_id,
           current_stage, status, priority, hostel_scope, branch,
           reason, description, from_date, to_date,
           direct_generated, routed_to_role, forwarded_from_role,
           sla_deadline, created_at, updated_at, stage_history
      FROM permissions
     WHERE ${where.length ? where.join(" AND ") : "TRUE"}
     ORDER BY
       CASE status WHEN 'PENDING' THEN 0 WHEN 'ESCALATED' THEN 1 ELSE 2 END,
       sla_deadline ASC NULLS LAST,
       created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await query(sql, params);
  return ok({
    items: rows,
    total: rows.length,
    limit,
    offset,
  });
}

async function notifyStage(
  stage: string,
  ticket: string,
  workflowType: WorkflowType,
  _studentUserId: string,
): Promise<void> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = $1 AND status = 'ACTIVE'`,
    [stage],
  );
  await Promise.all(
    rows.map((u) =>
      addNotification(
        "user",
        u.id,
        "permission",
        "New Permission Request",
        `Ticket ${ticket} needs your review (${workflowType})`,
      ),
    ),
  );
}

export const POST = withMutationGuard(handlePost, {
  rateLimit: RATE_LIMITS.PERMISSION_CREATE,
});
export const GET = withAuthorization(handleGet);
