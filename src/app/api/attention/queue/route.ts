// src/app/api/attention/queue/route.ts
// Attention Queue — top 5 actionable items for the caller's role.
//
// Items are composed server-side from role-scoped sources:
//   - permission_requests (stage-scoped to the caller's role via ROLE_STAGE_PERMISSIONS)
//   - alerts / gates (operator, supervisor, admin, sysadmin)
//   - job_runs (sysadmin)
//   - event_registrations + campus_events (student, parent/guardian)
//   - visitor_logs (visitor)
//
// Sorting: overdue first, then due, then informational.
// No caller-supplied scope is ever trusted — the role comes from auth.role.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import { ROLE_STAGE_PERMISSIONS } from "@/lib/permission-workflow";
import { getLinkedPersons } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ALL_ROLES: Role[] = [
  "student", "parent", "guardian", "faculty", "staff", "hod", "oie",
  "exam_branch", "vice_principal", "principal", "admin", "sysadmin",
  "operator", "supervisor", "worker", "caretaker", "deputy_warden",
  "hostel_manager", "mess_incharge", "visitor",
];

interface AttentionItem {
  id: string;
  kind: string;
  title: string;
  urgency: "overdue" | "due" | "info";
  ctaHref: string;
  detail: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

/** Stages the role owns, from ROLE_STAGE_PERMISSIONS. Admin/sysadmin get "*". */
function ownedStages(role: Role): string[] {
  const list = ROLE_STAGE_PERMISSIONS[role];
  if (!list || list.length === 0) return [];
  if (list.includes("*")) {
    // "*" means all stages — return a broad set that covers every workflow stage
    return [
      "faculty", "hod", "oie", "vice_principal", "principal",
      "caretaker", "deputy_warden", "hostel_manager", "warden_or_principal",
      "lab_incharge",
    ];
  }
  return [...list];
}

function ctaForWorkflow(workflowType: string, role: Role): string {
  switch (workflowType) {
    case "exam":
      return "/exam/permissions";
    case "staff_leave":
      return role === "faculty" ? "/permissions" : "/hod/permissions";
    case "hostel":
      return "/hostel/permissions";
    case "memo":
      return "/permissions";
    default:
      return "/permissions";
  }
}

function requestToItem(
  row: Record<string, unknown>,
  role: Role,
  nowIsoStr: string
): AttentionItem {
  const id = String(row.id);
  const ticketNumber = String(row.ticket_number ?? "");
  const workflowType = String(row.workflow_type ?? "");
  const currentStage = String(row.current_stage ?? "");
  const status = String(row.status ?? "");
  const slaDeadline = (row.sla_deadline as string | null) ?? null;

  const student = row.student as
    | { name?: string | null; student_details?: { roll?: string | null } | null }
    | null
    | undefined;
  const studentName = student?.name ?? "";
  const roll = student?.student_details?.roll ?? "";
  const who = roll ? `${studentName} (${roll})` : studentName;
  const title = who ? `${ticketNumber} · ${who}` : ticketNumber;

  const isOverdue =
    !!slaDeadline &&
    new Date(slaDeadline).getTime() < new Date(nowIsoStr).getTime() &&
    (status === "PENDING" || status === "ESCALATED");

  const urgency: AttentionItem["urgency"] = isOverdue ? "overdue" : "due";
  const detail = `${workflowType} awaiting ${currentStage}${isOverdue ? " · OVERDUE" : ""}`;

  return {
    id,
    kind: "permission_request",
    title,
    urgency,
    ctaHref: ctaForWorkflow(workflowType, role),
    detail,
  };
}

async function fetchRequestsForRole(
  db: ReturnType<typeof getSupabaseServiceClient>,
  role: Role,
  nowIsoStr: string,
): Promise<AttentionItem[]> {
  const stages = ownedStages(role);
  if (stages.length === 0) return [];

  const select =
    "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
    "student:requester_user_id(id, name, student_details(roll))";

  let query = db
    .from("permission_requests")
    .select(select)
    .in("current_stage", stages)
    .in("status", ["PENDING", "ESCALATED"]);

  // Principal additionally owns warden_or_principal
  if (role === "principal") {
    query = query.or(`current_stage.eq.warden_or_principal,status.in.(PENDING,ESCALATED)`);
  }

  const { data, error } = await query.order("sla_deadline", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: unknown) =>
    requestToItem(row as unknown as Record<string, unknown>, role, nowIsoStr)
  );
}

async function fetchOpenRequestsByStudentId(
  db: ReturnType<typeof getSupabaseServiceClient>,
  studentId: string,
): Promise<AttentionItem[]> {
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .eq("requester_user_id", studentId)
    .in("status", ["PENDING", "ESCALATED"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: unknown) =>
    requestToItem(row as unknown as Record<string, unknown>, "student", nowIso())
  );
}

async function fetchUnresolvedAlerts(
  db: ReturnType<typeof getSupabaseServiceClient>,
): Promise<AttentionItem[]> {
  const select = "id, severity, title, message, timestamp";
  let rows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await db
      .from("alerts")
      .select(select)
      .eq("resolved", false)
      .in("severity", ["critical", "high"])
      .order("timestamp", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as Record<string, unknown>[];
  } catch {
    // Table/column shape changed (alerts.created_at → timestamp, 2026-10):
    // never surface a 500 for a read-only attention queue.
    rows = [];
  }

  return rows.map((a: Record<string, unknown>) => {
    const severity = String(a.severity ?? "");
    const urgency: AttentionItem["urgency"] = severity === "critical" ? "due" : "info";
    return {
      id: `alert-${a.id}`,
      kind: "alert",
      title: String(a.title ?? "Unresolved alert"),
      urgency,
      ctaHref: "/supervisor?tab=alerts",
      detail: `Severity ${severity} · ${String(a.message ?? "").slice(0, 80)}`,
    };
  });
}

async function fetchOfflineGates(
  db: ReturnType<typeof getSupabaseServiceClient>,
): Promise<AttentionItem[]> {
  const { data, error } = await db
    .from("gates")
    .select("id, name, is_online")
    .eq("is_online", false)
    .limit(1);

  if (error) return [];
  if (!data || data.length === 0) return [];

  const gate = data[0] as unknown as Record<string, unknown>;
  return [
    {
      id: `gate-${gate.id}`,
      kind: "gate",
      title: `Gate offline: ${String(gate.name ?? "unknown")}`,
      urgency: "overdue",
      ctaHref: "/admin/gates",
      detail: "Gate is offline — investigate connectivity or operator session.",
    },
  ];
}

async function fetchFailedJobRuns(
  db: ReturnType<typeof getSupabaseServiceClient>,
): Promise<AttentionItem[]> {
  const { data, error } = await db
    .from("job_runs")
    .select("id, job_id, status, error_message, start_time, end_time")
    .eq("status", "FAILED")
    .order("start_time", { ascending: false })
    .limit(3);

  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: `job-${r.id}`,
    kind: "job_run",
    title: `Job failed: ${String(r.job_id ?? "unknown")}`,
    urgency: "overdue" as const,
    ctaHref: "/sysadmin/jobs",
    detail: String(r.error_message ?? "").slice(0, 100) || "Check job logs for details.",
  }));
}

async function fetchUnresolvedCriticalAlertsForAdmin(
  db: ReturnType<typeof getSupabaseServiceClient>,
): Promise<AttentionItem[]> {
  let rows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await db
      .from("alerts")
      .select("id, severity, title, timestamp")
      .eq("resolved", false)
      .eq("severity", "critical")
      .order("timestamp", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as Record<string, unknown>[];
  } catch {
    // alerts.created_at → timestamp; read-only queue must not 500.
    rows = [];
  }
  return rows.map((a: Record<string, unknown>) => ({
    id: `alert-${a.id}`,
    kind: "alert",
    title: String(a.title ?? "Critical alert"),
    urgency: "due" as const,
    ctaHref: "/admin/alerts",
    detail: "Critical alert requires attention.",
  }));
}

/**
 * For admin / sysadmin: pending principal-stage permission requests.
 */
async function fetchPrincipalStageRequests(
  db: ReturnType<typeof getSupabaseServiceClient>,
): Promise<AttentionItem[]> {
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .or("current_stage.eq.principal,current_stage.eq.warden_or_principal")
    .in("status", ["PENDING", "ESCALATED"])
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .limit(5);

  if (error) return [];
  return (data ?? []).map((row: unknown) =>
    requestToItem(row as unknown as Record<string, unknown>, "admin", nowIso())
  );
}

async function fetchStudentEventRegs(
  db: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
  nowIsoStr: string,
): Promise<AttentionItem[]> {
  const { data: regs, error: regErr } = await db
    .from("event_registrations")
    .select("id, event_id, status")
    .eq("user_id", userId)
    .eq("status", "registered")
    .limit(50);

  if (regErr || !regs || regs.length === 0) return [];

  const eventIds = regs.map((r: Record<string, unknown>) => String(r.event_id));
  const { data: events, error: evErr } = await db
    .from("campus_events")
    .select("id, title, starts_at")
    .in("id", eventIds)
    .gte("starts_at", nowIsoStr)
    .eq("is_published", true)
    .order("starts_at", { ascending: true })
    .limit(5);

  if (evErr || !events || events.length === 0) return [];
  return events.map((e: Record<string, unknown>) => ({
    id: `event-${e.id}`,
    kind: "event",
    title: String(e.title ?? "Campus event"),
    urgency: "info" as const,
    ctaHref: "/campus",
    detail: `Registered · starts ${new Date(String(e.starts_at)).toLocaleDateString()}`,
  }));
}

async function fetchParentChildEventRegs(
  db: ReturnType<typeof getSupabaseServiceClient>,
  childIds: string[],
  nowIsoStr: string,
): Promise<AttentionItem[]> {
  if (childIds.length === 0) return [];

  const { data: regs, error: regErr } = await db
    .from("event_registrations")
    .select("id, event_id, status")
    .in("user_id", childIds)
    .eq("status", "registered")
    .limit(50);

  if (regErr || !regs || regs.length === 0) return [];

  const eventIds = regs.map((r: Record<string, unknown>) => String(r.event_id));
  const { data: events, error: evErr } = await db
    .from("campus_events")
    .select("id, title, starts_at")
    .in("id", eventIds)
    .gte("starts_at", nowIsoStr)
    .eq("is_published", true)
    .order("starts_at", { ascending: true })
    .limit(5);

  if (evErr || !events || events.length === 0) return [];
  return events.map((e: Record<string, unknown>) => ({
    id: `event-${e.id}`,
    kind: "event",
    title: `Child registered: ${String(e.title ?? "campus event")}`,
    urgency: "info" as const,
    ctaHref: "/campus",
    detail: `Starts ${new Date(String(e.starts_at)).toLocaleDateString()}`,
  }));
}

async function fetchWorkerItems(
  db: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
): Promise<AttentionItem[]> {
  // Try work_orders table first; fall back to their own permission_requests.
  const { data: wo, error: woErr } = await db
    .from("work_orders")
    .select("id, title, status, due_at")
    .eq("assignee_user_id", userId)
    .not("status", "in", ["completed", "closed"])
    .limit(3);

  if (!woErr && wo && wo.length > 0) {
    return wo.map((o: Record<string, unknown>) => {
      const isOverdue = !!o.due_at && new Date(String(o.due_at)).getTime() < Date.now();
      return {
        id: `work-order-${o.id}`,
        kind: "work_order",
        title: String(o.title ?? "Work order"),
        urgency: isOverdue ? ("overdue" as const) : ("due" as const),
        ctaHref: "/worker",
        detail: isOverdue ? "Overdue — complete as soon as possible." : "Open work order assigned to you.",
      };
    });
  }

  // Fallback: own pending permission requests + shift info
  const reqs = await fetchOpenRequestsByStudentId(db, userId);
  const items: AttentionItem[] = reqs.slice(0, 4);
  items.push({
    id: "worker-shift-info",
    kind: "info",
    title: "Review your shift",
    urgency: "info",
    ctaHref: "/worker",
    detail: "Check today's schedule and open assignments.",
  });
  return items.slice(0, 5);
}

async function fetchStaffItems(
  db: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
): Promise<AttentionItem[]> {
  // Their pending staff_leave requests at their relevant stage
  const { data: reqs, error: reqErr } = await db
    .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .eq("workflow_type", "staff_leave")
    .eq("requester_user_id", userId)
    .in("status", ["PENDING", "ESCALATED"])
    .order("created_at", { ascending: false })
    .limit(3);

  const items: AttentionItem[] = [];
  if (!reqErr && reqs && reqs.length > 0) {
    for (const row of reqs as unknown as Record<string, unknown>[]) {
      items.push(requestToItem(row, "staff", nowIso()));
    }
  }
  items.push({
    id: "staff-attendance-info",
    kind: "info",
    title: "Attendance",
    urgency: "info",
    ctaHref: "/admin/staff",
    detail: "Review today's attendance record.",
  });
  return items.slice(0, 5);
}

async function fetchVisitorItems(
  db: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
): Promise<AttentionItem[]> {
  const { data: logs, error: logErr } = await db
    .from("visitor_logs")
    .select("id, status, check_in_at, check_out_at")
    .eq("user_id", userId)
    .order("check_in_at", { ascending: false })
    .limit(5);

  const items: AttentionItem[] = [];
  if (!logErr && logs && logs.length > 0) {
    const active = (logs as unknown as Record<string, unknown>[])
      .find((l) => l.status === "active" && !l.check_out_at);
    if (active) {
      items.push({
        id: `visit-${active.id}`,
        kind: "visitor",
        title: "Your visit is active",
        urgency: "info",
        ctaHref: "/person",
        detail: `Checked in ${new Date(String(active.check_in_at)).toLocaleString()}`,
      });
    }
  }
  // Open own requests
  const reqs = await fetchOpenRequestsByStudentId(db, userId);
  for (const item of reqs.slice(0, 4)) {
    items.push({ ...item, ctaHref: "/person" });
  }
  return items.slice(0, 5);
}

// ── main handler ─────────────────────────────────────────────────────────────

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const role = auth.role as Role;
  const userId = auth.userId;
  const now = nowIso();

  try {
    const db = getSupabaseServiceClient();
    let items: AttentionItem[] = [];

    switch (role) {
      // ── Approver roles ──────────────────────────────────────────────────
      case "faculty":
      case "hod":
      case "oie":
      case "exam_branch":
      case "vice_principal":
      case "principal":
      case "admin":
      case "sysadmin": {
        items = await fetchRequestsForRole(db, role, now);
        if (role === "admin") {
          const critical = await fetchUnresolvedCriticalAlertsForAdmin(db);
          const principal = await fetchPrincipalStageRequests(db);
          items = [...critical, ...principal, ...items].slice(0, 5);
        }
        if (role === "sysadmin") {
          const failed = await fetchFailedJobRuns(db);
          const critical = await fetchUnresolvedCriticalAlertsForAdmin(db);
          items = [...failed, ...critical, ...items].slice(0, 5);
          if (items.length === 0) {
            items.push({
              id: "sysadmin-nominal",
              kind: "info",
              title: "System nominal",
              urgency: "info",
              ctaHref: "/sysadmin",
              detail: "No failed jobs or critical alerts. All clear.",
            });
          }
        }
        if (role === "admin") {
          // Admin: open critical alerts + principal-stage requests
        }
        break;
      }

      // ── Operator / Supervisor ───────────────────────────────────────────
      case "operator":
      case "supervisor": {
        const alerts = await fetchUnresolvedAlerts(db);
        const gates = await fetchOfflineGates(db);
        items = [...gates, ...alerts].slice(0, 5);
        break;
      }

      // ── Student ─────────────────────────────────────────────────────────
      case "student": {
        const ownReqs = await fetchOpenRequestsByStudentId(db, userId);
        const eventRegs = await fetchStudentEventRegs(db, userId, now);
        items = [...ownReqs, ...eventRegs].slice(0, 5);
        break;
      }

      // ── Parent / Guardian ───────────────────────────────────────────────
      case "parent":
      case "guardian": {
        const children = await getLinkedPersons(userId);
        const childIds = children
          .map((c) => String((c as unknown as Record<string, unknown>).id ?? ""))
          .filter(Boolean);

        const childReqs: AttentionItem[] = [];
        for (const cid of childIds) {
          const reqs = await fetchOpenRequestsByStudentId(db, cid);
          for (const item of reqs) {
            childReqs.push({ ...item, ctaHref: "/parent/passes" });
          }
        }

        const childEvents = await fetchParentChildEventRegs(db, childIds, now);
        items = [...childReqs, ...childEvents].slice(0, 5);
        break;
      }

      // ── Worker ──────────────────────────────────────────────────────────
      case "worker": {
        items = await fetchWorkerItems(db, userId);
        break;
      }

      // ── Staff ───────────────────────────────────────────────────────────
      case "staff": {
        items = await fetchStaffItems(db, userId);
        break;
      }

      // ── Visitor ─────────────────────────────────────────────────────────
      case "visitor": {
        items = await fetchVisitorItems(db, userId);
        break;
      }

      // ── Hostel roles (caretaker, deputy_warden, hostel_manager) ────────
      case "caretaker":
      case "deputy_warden":
      case "hostel_manager": {
        const stages = ownedStages(role);
        if (stages.length === 0) break;
        const { data, error } = await db
          .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .in("current_stage", stages)
          .in("status", ["PENDING", "ESCALATED"])
          .order("sla_deadline", { ascending: true, nullsFirst: false })
          .limit(5);

        if (error) throw new Error(error.message);
        items = (data ?? []).map((row: unknown) =>
          requestToItem(row as unknown as Record<string, unknown>, role, now)
        ).map((item) => ({ ...item, ctaHref: "/hostel/permissions" }));
        break;
      }

      // ── Mess incharge ───────────────────────────────────────────────────
      case "mess_incharge": {
        items = [
          {
            id: "mess-review-info",
            kind: "info",
            title: "Review open operational requests",
            urgency: "info",
            ctaHref: "/mess",
            detail: "Check for pending operational approvals.",
          },
          {
            id: "mess-shift-info",
            kind: "info",
            title: "Shift & inventory check",
            urgency: "info",
            ctaHref: "/mess",
            detail: "Review today's schedule and open tasks.",
          },
        ];
        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        role,
        items,
        empty: items.length === 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const { body, status } = err("DB_ERROR", message, 500);
    return NextResponse.json(body, { status });
  }
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "attention_queue" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ALL_ROLES }),
  readLimit
);
