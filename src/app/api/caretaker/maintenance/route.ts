// src/app/api/caretaker/maintenance/route.ts
// Dedicated maintenance-tickets endpoint for the caretaker sub-page.
//
// Returns pending/escalated permission requests at the caretaker stage,
// scoped to the caller's assigned hostel (or all for admin/sysadmin).
// The response shape matches what the caretaker/maintenance page destructures:
//   { success, data: { tickets: [...], total, summary }, total }
 

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ROLES: readonly Role[] = ["caretaker", "admin", "sysadmin"] as const;

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();
  const isAdmin = auth.role === "admin" || auth.role === "sysadmin";

  // Resolve the caller's assigned hostel (users.assigned_hostel). Caretaker
  // callers are scoped to that hostel; admin/sysadmin see all.
  let callerHostel: string | null = null;
  if (!isAdmin) {
    const { data: profile } = await db
      .from("users")
      .select("assigned_hostel, role")
      .eq("id", auth.userId)
      .maybeSingle();
    callerHostel = profile?.assigned_hostel ?? null;
    if (profile?.role === "caretaker" && !callerHostel) {
      // Caretaker with no assigned hostel — return an empty queue.
      return NextResponse.json({
        success: true,
        data: {
          tickets: [],
          total: 0,
          summary: { pending: 0, escalated: 0, resolvedToday: 0 },
        },
        total: 0,
      });
    }
  }

  // Fetch open/escalated tickets at the caretaker stage.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "ticket_number, workflow_type, status, sla_deadline, created_at, " +
        "requester_user_id, current_stage, " +
        "student:requester_user_id(id, name, student_details(roll, hostel_block))"
    )
    .in("current_stage", ["caretaker"])
    .in("status", ["PENDING", "ESCALATED"])
    .order("sla_deadline", { ascending: true })
    .limit(100);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  type RawRow = Record<string, unknown> & {
    ticket_number?: string;
    workflow_type?: string;
    status?: string;
    sla_deadline?: string | null;
    created_at?: string;
    requester_user_id?: string;
    current_stage?: string;
    student?:
      | {
          id?: string;
          name?: string | null;
          student_details?: { roll?: string | null; hostel_block?: string | null } | null;
        }
      | null
      | undefined;
  };

  const allRows = (data ?? []) as unknown as RawRow[];

  // Apply hostel filter for non-admin callers.
  const filtered = callerHostel
    ? allRows.filter((r) => {
        const block = (r.student as RawRow["student"])?.student_details?.hostel_block;
        return block == null || block === callerHostel;
      })
    : allRows;

  const tickets = filtered.map((r) => {
    const student = r.student;
    return {
      ticketNumber: String(r.ticket_number ?? ""),
      workflowType: String(r.workflow_type ?? ""),
      status: String(r.status ?? ""),
      slaDeadline: (r.sla_deadline as string | null) ?? null,
      createdAt: (r.created_at as string | null) ?? null,
      currentStage: String(r.current_stage ?? ""),
      studentName: student?.name ?? null,
      studentRoll: student?.student_details?.roll ?? null,
      hostelBlock: student?.student_details?.hostel_block ?? null,
    };
  });

  const pending = tickets.filter((t) => t.status === "PENDING").length;
  const escalated = tickets.filter((t) => t.status === "ESCALATED").length;

  return NextResponse.json({
    success: true,
    data: {
      tickets,
      total: tickets.length,
      summary: {
        pending,
        escalated,
        resolvedToday: 0,
      },
      assignedHostel: callerHostel,
    },
    total: tickets.length,
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "caretaker_maintenance" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
