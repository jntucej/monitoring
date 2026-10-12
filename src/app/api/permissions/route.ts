/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { err } from "@/lib/api-response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification, getLinkedPersons } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { resolveInitialStage, generateTicketNumber, WorkflowType } from "@/lib/permission-workflow";

async function handlePost(req: NextRequest, context: any) {
  const { auth: { userId, role } } = context;
  const db = getSupabaseServiceClient();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }
  const workflowType = body.workflow_type || body.workflowType;
  const studentUserId = body.student_user_id || body.studentUserId;
  const hostelScope = body.hostel_scope || body.hostelScope;
  const {
    workflow_type: _wt,
    workflowType: _wt2,
    student_user_id: _su,
    studentUserId: _su2,
    hostel_scope: _hs,
    hostelScope: _hs2,
    ...rest
  } = body;

  if (!workflowType) return NextResponse.json(err("BAD_REQUEST", "Missing fields").body, { status: 400 });

  if (!["student", "parent", "guardian", "admin", "sysadmin", "staff", "faculty"].includes(role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  let targetUserId = userId;
  if (role === "parent" || role === "guardian") {
    if (!studentUserId) return NextResponse.json(err("BAD_REQUEST", "Missing child ID").body, { status: 400 });
    const children = await getLinkedPersons(userId);
    if (!children.some((c: any) => c.child_id === studentUserId)) {
      return NextResponse.json(err("FORBIDDEN", "Not your child").body, { status: 403 });
    }
    targetUserId = studentUserId;
  } else if (studentUserId && studentUserId !== userId) {
    if (role !== "admin" && role !== "sysadmin") {
      return NextResponse.json(err("FORBIDDEN", "Unauthorized").body, { status: 403 });
    }
    targetUserId = studentUserId;
  }

  const ticketNumber = await generateTicketNumber(workflowType as WorkflowType);
  const initialStage = resolveInitialStage(workflowType as WorkflowType);
  const slaDeadline = body.sla_deadline || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // For staff_leave: stamp the ticket with the requester's branch so the
  // L4 approval gate (canApproveAtStageWithBranch) can enforce same-branch.
  let branch: string | null = null;
  if (workflowType === "staff_leave") {
    const { data: reqRow } = await db.from("users").select("department_id").eq("id", userId).single();
    branch = reqRow?.department_id ?? null;
  }

  const { data: request, error: createError } = await db.from("permission_requests").insert({
    ticket_number: ticketNumber,
    workflow_type: workflowType,
    student_user_id: targetUserId,
    hostel_scope: hostelScope,
    sla_deadline: slaDeadline,
    requester_user_id: userId,
    // Strip any caller-supplied columns that we already set explicitly above;
    // Postgres rejects duplicate column keys in a single SET (e.g. a `staff`
    // actor re-submitting its own `requester_user_id` in the payload body).
    ...Object.fromEntries(Object.entries(rest).filter(([k]) => ![
      "ticket_number", "workflow_type", "student_user_id", "hostel_scope",
      "sla_deadline", "requester_user_id", "current_stage", "status",
      "stage_history", "branch",
    ].includes(k))),
    current_stage: initialStage,
    status: "PENDING",
    stage_history: [],
    ...(branch ? { branch } : {}),
  }).select().single();

  if (createError) return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
  await addAudit({ action: "PERMISSION_REQUEST_CREATED", userId, role, details: ticketNumber });

  await addNotification(
    "system",
    "system",
    "permission_pending",
    `New ${workflowType} Permission`,
    `Ticket ${ticketNumber} created`
  );

  return NextResponse.json({ success: true, data: request });
}

async function handleGet(req: NextRequest, context: any) {
  const { auth: { userId, role } } = context;
  const db = getSupabaseServiceClient();
  const url = new URL(req.url);
  const { searchParams } = url;
  const type = searchParams.get("workflow_type") || searchParams.get("workflowType");
  const sid = searchParams.get("student_user_id") || searchParams.get("studentUserId");
  const hscope = searchParams.get("hostel_scope") || searchParams.get("hostelScope");
  const status = searchParams.get("status");
  const mineOnly = searchParams.get("mine") === "true";

  // ?mine=true — self-service "My Tickets" view: requester's own tickets
  // with the student join so the card can render the requester's name/details.
  if (mineOnly) {
    const { data: mineData, error: mineErr } = await db
      .from("permission_requests")
      .select(`
        id, ticket_number, workflow_type, current_stage, status,
        sla_deadline, created_at, updated_at, description, reason,
        from_date, to_date, priority, hostel_scope,
        student_user_id, digital_signature, stage_history,
        student:users(
          id, name, email, phone, role,
          student_details(roll, year, section, hostel_block, room_number, gender)
        )
      `, { count: "exact" })
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (mineErr) {
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: mineErr.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, data: mineData ?? [], total: mineData?.length ?? 0 });
  }

  let query = db.from("permission_requests").select("*", { count: "exact" });
  if (type) query = query.eq("workflow_type", type);
  if (status) query = query.eq("status", status);
  // Explicit stage filter (used by UI PermissionList: ?stage=principal etc.)
  const stageParam = searchParams.get("stage") || searchParams.get("current_stage");
  if (stageParam && ["faculty", "hod", "oie", "vice_principal", "principal", "caretaker", "deputy_warden", "hostel_manager", "main_gate", "warden_or_principal"].includes(stageParam)) {
    query = query.eq("current_stage", stageParam);
    // For principal: also include hostel requests at warden_or_principal stage
    if (stageParam === "principal") {
      query = query.or("current_stage.eq.principal,current_stage.eq.warden_or_principal");
    }
    // Return early — explicit stage param overrides role-based filtering below
    const { data: stageData, count: stageCount, error: stageErr } = await query;
    if (stageErr) return NextResponse.json({ success: false, error: stageErr.message }, { status: 500 });
    return NextResponse.json({ success: true, data: stageData, total: stageCount || 0 });
  }

  if (role === "student") {
    query = query.eq("student_user_id", userId);
  } else if (["parent", "guardian"].includes(role)) {
    const children = await getLinkedPersons(userId);
    const childIds = children.map((c: any) => c.child_id);
    if (!childIds.length) return NextResponse.json({ success: true, data: [], total: 0 });
    if (sid) {
      if (childIds.includes(sid)) query = query.eq("student_user_id", sid);
      else return NextResponse.json(err("FORBIDDEN", "Not your child").body, { status: 403 });
    } else {
      query = query.in("student_user_id", childIds);
    }
  } else if (["caretaker", "deputy_warden", "hostel_manager", "faculty", "hod", "oie", "vice_principal"].includes(role)) {
    query = query.eq("current_stage", role);
    if (hscope) query = query.eq("hostel_scope", hscope);
  } else if (role === "principal") {
    // Principal sees hostel requests at warden_or_principal stage AND
    // any other workflow requests currently at the principal stage.
    query = query.or("current_stage.eq.warden_or_principal,current_stage.eq.principal");
  } else if (["admin", "sysadmin"].includes(role)) {
    if (sid) query = query.eq("student_user_id", sid);
  } else if (role === "operator") {
    query = query.eq("current_stage", "main_gate");
  } else {
    return NextResponse.json({ success: true, data: [], total: 0 });
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data, total: count || 0 });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "perm_post",
  maxRequests: 10,
});

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "perm_get",
  maxRequests: 50,
});
