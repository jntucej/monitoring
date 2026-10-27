import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { addAudit } from "@/lib/db";

/**
 * GET /api/campus-extra/feedback?status=submitted
 * POST /api/campus-extra/feedback
 *
 * Report and track issues with a visible lifecycle:
 * Submitted → Acknowledged → Assigned → In Progress → Resolved → Feedback.
 * Each report shows who reviewed it and what happened next.
 */

const VALID_STATUSES = new Set([
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "feedback",
]);

const MANAGER_ROLES = new Set(["admin", "sysadmin", "supervisor", "hostel_manager"]);

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;
  const status = req.nextUrl.searchParams.get("status");

  let query = supabase
    .from("campus_feedback_reports")
    .select("id, status, category, subject, description, submitted_by, assigned_to, notes, reviewer_note, created_at, updated_at, resolved_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (status && VALID_STATUSES.has(status)) {
    query = query.eq("status", status);
  }

  // Managers can see all; others only see their own reports
  if (!MANAGER_ROLES.has(role)) {
    query = query.eq("submitted_by", userId);
  }

  const { data: rows, error: err } = await query;
  if (err) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: err.message } },
      { status: 500 }
    );
  }

  // Resolve assigned_to usernames
  const assignedIds = Array.from(
    new Set((rows || []).map((r: any) => r.assigned_to).filter((v: any): v is string => !!v))
  );
  let assignedNames = new Map<string, string>();
  if (assignedIds.length > 0) {
    const { data: userRows } = await supabase
      .from("users")
      .select("id, name")
      .in("id", assignedIds);
    assignedNames = new Map((userRows || []).map((u: any) => [u.id, u.name]));
  }

  const reports = (rows || []).map((r: any) => ({
    id: r.id,
    status: r.status,
    category: r.category,
    subject: r.subject,
    description: r.description,
    assignedTo: r.assigned_to ? assignedNames.get(r.assigned_to) ?? r.assigned_to : null,
    notes: r.notes,
    reviewerNote: r.reviewer_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    resolvedAt: r.resolved_at,
  }));

  return NextResponse.json({
    success: true,
    data: { reports },
  });
}

async function handlePost(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const category = String(body.category || "general").slice(0, 50);
  const subject = String(body.subject || "").slice(0, 200).trim();
  const description = String(body.description || "").slice(0, 2000).trim();

  if (!subject) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "subject is required" } },
      { status: 400 }
    );
  }

  const { data: report, error: insErr } = await supabase
    .from("campus_feedback_reports")
    .insert({
      status: "submitted",
      category,
      subject,
      description,
      submitted_by: userId,
      notes: null,
      reviewer_note: null,
      resolved_at: null,
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: insErr.message } },
      { status: 500 }
    );
  }

  await addAudit({
    action: "FEEDBACK_REPORT_SUBMITTED",
    userId,
    role,
    details: { reportId: report.id, category, subject },
  });

  return NextResponse.json({ success: true, data: report });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_feedback",
  maxRequests: 60,
});

export const POST = withRateLimit(withAuthorization(handlePost), {
  keyPrefix: "campus_extra_feedback",
  maxRequests: 30,
});
