/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification, getLinkedPersons } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { resolveInitialStage, generateTicketNumber, WorkflowType } from "@/lib/permission-workflow";

async function postHandler(req: NextRequest, context: any) {
  const { auth: { userId, role } } = context;
  const db = getSupabaseServiceClient();
  const body = await req.json();
  const { workflowType, studentUserId, hostelScope, reason, ...rest } = body;

  if (!workflowType || !reason) return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });

  let targetUserId = userId;
  if (role === "parent" || role === "guardian") {
    if (!studentUserId) return NextResponse.json({ success: false, error: "Missing child ID" }, { status: 400 });
    const children = await getLinkedPersons(userId);
    if (!children.some((c: any) => c.child_id === studentUserId)) return NextResponse.json({ success: false, error: "Not your child" }, { status: 403 });
    targetUserId = studentUserId;
  } else if (studentUserId && studentUserId !== userId) {
    if (role !== "admin" && role !== "sysadmin") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    targetUserId = studentUserId;
  }

  const ticketNumber = await generateTicketNumber(workflowType as WorkflowType);
  const initialStage = resolveInitialStage(workflowType as WorkflowType);

  const { data: request, error: createError } = await db.from("permissions").insert({
    ticket_number: ticketNumber, workflow_type: workflowType,
    user_id: targetUserId, hostel_scope: hostelScope, reason, ...rest,
    current_stage: initialStage, status: "PENDING", stage_history: []
  }).select().single();

  if (createError) return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
  await addAudit({ action: "PERMISSION_CREATED", userId, role, details: { ticketNumber } });
  
  await addNotification("system", "system", "permission_pending", `New ${workflowType} Permission`, `Ticket ${ticketNumber} created`);

  return NextResponse.json({ success: true, data: request });
}

async function getHandler(req: NextRequest, context: any) {
  const { auth: { userId, role } } = context;
  const db = getSupabaseServiceClient();
  const url = new URL(req.url);
  const { searchParams } = url;
  const type = searchParams.get("workflowType");
  const sid = searchParams.get("studentUserId");
  const hscope = searchParams.get("hostelScope");
  const status = searchParams.get("status");

  let query = db.from("permissions").select("*", { count: "exact" });
  if (type) query = query.eq("workflow_type", type);
  if (status) query = query.eq("status", status);

  if (role === "student") {
    query = query.eq("user_id", userId);
  } else if (["parent", "guardian"].includes(role)) {
    const children = await getLinkedPersons(userId);
    const childIds = children.map((c: any) => c.child_id);
    if (!childIds.length) return NextResponse.json({ success: true, data: [], total: 0 });
    if (sid) {
      if (childIds.includes(sid)) query = query.eq("user_id", sid);
      else return NextResponse.json({ success: false, error: "Not your child" }, { status: 403 });
    } else query = query.in("user_id", childIds);
  } else if (["caretaker", "deputy_warden", "hostel_manager", "faculty", "hod", "oie", "vice_principal"].includes(role)) {
    query = query.eq("current_stage", role);
    if (hscope) query = query.eq("hostel_scope", hscope);
  } else if (["warden", "principal"].includes(role)) {
    query = query.eq("workflow_type", "hostel").eq("current_stage", "warden_or_principal");
  } else if (["admin", "sysadmin"].includes(role)) {
    if (sid) query = query.eq("user_id", sid);
  } else if (role === "operator") {
    query = query.eq("current_stage", "main_gate");
  } else {
    return NextResponse.json({ success: true, data: [], total: 0 });
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data, total: count || 0 });
}

export const POST = withRateLimit(
  withAuthorization(postHandler, { requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }),
  { keyPrefix: "perm_post", maxRequests: 10 }
);

export const GET = withRateLimit(
  withAuthorization(getHandler),
  { keyPrefix: "perm_get", maxRequests: 50 }
);