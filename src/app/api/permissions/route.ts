import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import {
  generateTicketNumber,
  resolveInitialStage,
  appendStageHistory,
} from "@/lib/permission-workflow";
import { addAudit, addNotification, getParentChildren } from "@/lib/db";
import type { WorkflowType } from "@/lib/types";

const VALID_WORKFLOWS: readonly WorkflowType[] = ["hostel", "exam", "memo", "staff_leave"] as const;

async function handleGet(req: NextRequest): Promise<Response> {
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";
  const searchParams = req.nextUrl.searchParams;

  const status = searchParams.get("status");
  const workflowType = searchParams.get("workflowType") as WorkflowType | null;
  const stage = searchParams.get("stage");
  const hostelScope = searchParams.get("hostelScope");
  const studentId = searchParams.get("studentId");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  const supabase = getSupabaseServiceClient();

  let queryBuilder = supabase
    .from("permission_requests")
    .select(
      `
      *,
      student:student_user_id (
        id,
        name,
        email,
        phone,
        role,
        student_details (
          roll,
          year,
          section,
          hostel_block,
          room_number,
          gender
        )
      )
    `,
      { count: "exact" }
    );

  if (authUserRole === "student") {
    queryBuilder = queryBuilder.eq("student_user_id", authUserId);
  } else if (authUserRole === "parent" || authUserRole === "guardian") {
    const children = await getParentChildren(authUserId);
    const childIds = (children || []).map((c: { id?: string }) => c.id).filter(Boolean);
    if (childIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0 });
    }
    queryBuilder = queryBuilder.in("student_user_id", childIds);
  } else if (["caretaker", "deputy_warden", "hostel_manager", "warden"].includes(authUserRole)) {
    queryBuilder = queryBuilder.eq("workflow_type", "hostel");

    const { data: userData } = await supabase
      .from("users")
      .select("hostel_scope")
      .eq("id", authUserId)
      .single();

    if (userData?.hostel_scope && ["boys", "girls"].includes(userData.hostel_scope)) {
      queryBuilder = queryBuilder.eq("hostel_scope", userData.hostel_scope);
    }
  } else if (authUserRole === "operator") {
    queryBuilder = queryBuilder.eq("workflow_type", "hostel").in("current_stage", ["main_gate", "completed"]);
  } else if (authUserRole === "faculty" || authUserRole === "hod") {
    queryBuilder = queryBuilder.in("workflow_type", ["exam", "memo", "staff_leave"]);
  } else if (authUserRole === "oie") {
    queryBuilder = queryBuilder.in("workflow_type", ["exam", "memo"]);
  }

  if (status) {
    queryBuilder = queryBuilder.eq("status", status);
  }
  if (workflowType && VALID_WORKFLOWS.includes(workflowType)) {
    queryBuilder = queryBuilder.eq("workflow_type", workflowType);
  }
  if (stage) {
    queryBuilder = queryBuilder.eq("current_stage", stage);
  }
  if (hostelScope) {
    queryBuilder = queryBuilder.eq("hostel_scope", hostelScope);
  }
  if (studentId && ["admin", "sysadmin", "principal", "vice_principal", "warden", "hod"].includes(authUserRole)) {
    queryBuilder = queryBuilder.eq("student_user_id", studentId);
  }

  queryBuilder = queryBuilder
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "QUERY_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    total: count ?? (data?.length || 0),
  });
}
async function handlePost(req: NextRequest): Promise<Response> {
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";
  const authUserEmail = req.headers.get("x-user-email") || "";

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const {
    workflowType,
    studentUserId: requestedStudentUserId,
    hostelScope: requestedHostelScope,
    documentRequired = false,
    documentUrl,
    reason,
    customReasonCode,
  } = (body || {}) as {
    workflowType?: WorkflowType;
    studentUserId?: string;
    hostelScope?: string;
    documentRequired?: boolean;
    documentUrl?: string;
    reason?: string;
    customReasonCode?: string;
  };

  if (!workflowType || !VALID_WORKFLOWS.includes(workflowType)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid or missing workflowType",
        },
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  let studentUserId = requestedStudentUserId;
  if (authUserRole === "student" || !studentUserId) {
    studentUserId = authUserId;
  }

  if (authUserRole === "parent" || authUserRole === "guardian") {
    const children = await getParentChildren(authUserId);
    const isChild = (children || []).some((c: { id?: string }) => c.id === studentUserId);
    if (!isChild) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot create request for unassociated student" } },
        { status: 403 }
      );
    }
  }

  const { data: targetUser, error: userError } = await supabase
    .from("users")
    .select("id, name, role, student_details(gender, hostel_block)")
    .eq("id", studentUserId)
    .single();

  if (userError || !targetUser) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Target user not found" } },
      { status: 404 }
    );
  }

  const { data: creatorUser } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", authUserId)
    .single();

  const creatorName = creatorUser?.name || authUserEmail || "User";

  let hostelScope = requestedHostelScope;
  if (workflowType === "hostel" && !hostelScope) {
    const details = targetUser.student_details as { gender?: string; hostel_block?: string } | null;
    const gender = details?.gender;
    if (gender === "female") hostelScope = "girls";
    else hostelScope = "boys";
  }

  const initialStage = resolveInitialStage(workflowType);
  const ticketNumber = await generateTicketNumber(workflowType);

  const initialHistory = appendStageHistory(
    [],
    { id: authUserId, name: creatorName, role: authUserRole },
    "CREATED",
    reason || customReasonCode ? "Reason: " + (reason || customReasonCode) : "Permission request submitted",
    { to: initialStage }
  );

  const insertPayload = {
    ticket_number: ticketNumber,
    workflow_type: workflowType,
    student_user_id: studentUserId,
    hostel_scope: hostelScope || null,
    current_stage: initialStage,
    status: "PENDING",
    stage_history: initialHistory,
    document_required: Boolean(documentRequired),
    document_url: documentUrl || null,
  };

  const { data: created, error: insertError } = await supabase
    .from("permission_requests")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { success: false, error: { code: "INSERT_ERROR", message: insertError.message } },
      { status: 500 }
    );
  }

  addAudit({
    action: "PERMISSION_REQUEST_CREATED",
    userId: authUserId,
    details: {
      ticketNumber,
      workflowType,
      studentUserId,
      currentStage: initialStage,
    },
  }).catch((err) => console.error("[Permissions API] addAudit error:", err));

  addNotification(
    "user",
    studentUserId,
    "permission",
    "Permission Request " + ticketNumber + " created",
    "Your request " + ticketNumber + " (" + workflowType + ") is now at stage: " + initialStage
  ).catch((err) => console.error("[Permissions API] addNotification error:", err));

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "permissions_get",
  maxRequests: 100,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "permissions_post",
  maxRequests: 30,
});
