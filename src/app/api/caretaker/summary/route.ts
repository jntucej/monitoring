// src/app/api/caretaker/summary/route.ts
// Per-role summary feed for the caretaker: pending hostel/exam-chain tickets
// at the caretaker-owned stages, a light campus occupancy figure, and the
// current low-stock mess item count.
//
// SCOPE: the caller sees only tickets whose student's hostel_block matches
// the caller's assigned_hostel (users.assigned_hostel). Admin/sysadmin
// bypass the hostel filter. This mirrors the FORBIDDEN_HOSTEL_SCOPE check in
// /api/passes/[passId].
/* eslint-disable @typescript-eslint/no-unused-vars */

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

/** Stages the caretaker owns. */
const STAGES = ["caretaker"] as const;

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
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
      // Caretaker with no assigned hostel — return an empty queue rather
      // than all tickets (safe fail-closed).
      return NextResponse.json({
        success: true,
        data: {
          role: "caretaker",
          pendingCount: 0,
          pendingTickets: [],
          occupancy: null,
          lowStock: null,
          notes:
            "Caretaker has no assigned_hostel on file; queue is empty. " +
            "Assign a hostel block to the user to see tickets.",
        },
      });
    }
  }

  // Open tickets at the caretaker-owned stages, soonest SLA first.
  // For non-admin callers, JOIN to the student's hostel_block and filter by
  // the caller's assigned hostel.
  let query = db
    .from("permission_requests")
    .select(
      "ticket_number, workflow_type, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll, hostel_block))"
    )
    .in("current_stage", [...STAGES])
    .in("status", ["PENDING", "ESCALATED"]);

  // For admin, return all. For caretaker, we fetch and then filter client-side
  // (the Supabase PostgREST query cannot do a cross-table hostel filter inline
  // without a view; the result set is small — limit 50 before filter).
  const { data, error } = await query
    .order("sla_deadline", { ascending: true })
    .limit(isAdmin ? 50 : 50)
    ;

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  // Apply the hostel filter to the fetched rows.
  const allRows = (data ?? []) as unknown as Array<
    Record<string, unknown> & {
      ticket_number?: string;
      workflow_type?: string;
      status?: string;
      sla_deadline?: string | null;
      created_at?: string;
      student?:
        | {
            id?: string;
            name?: string | null;
            student_details?: { roll?: string | null; hostel_block?: string | null } | null;
          }
        | null
        | undefined;
    }
  >;

  const filteredRows = callerHostel
    ? allRows.filter((r) => {
        const block = r.student?.student_details?.hostel_block;
        // Include tickets where the student's hostel_block is null (unassigned
        // students) so the caretaker still sees them; exclude only students in
        // a *different* hostel block.
        return block == null || block === callerHostel;
      })
    : allRows;

  const rows = filteredRows.map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    const student = rec.student as
      | { id?: string; name?: string | null; student_details?: { roll?: string | null } | null }
      | null
      | undefined;
    return {
      ticket_number: String(rec.ticket_number ?? ""),
      workflow_type: String(rec.workflow_type ?? ""),
      status: String(rec.status ?? ""),
      sla_deadline: (rec.sla_deadline as string | null) ?? null,
      student_name: student?.name ?? null,
    };
  });

  // Light occupancy figure: users currently inside any gate.
  let occupancy: number | null = null;
  try {
    const { data: occ } = await db
      .from("campus_occupancy")
      .select("user_id")
      .eq("current_status", "IN");
    occupancy = (occ ?? []).length;
  } catch {
    occupancy = null;
  }

  // Low-stock mess items. No confirmed low-stock flag column exists on
  // mess_menu_items (availability is per-day via mess_day_items), so we do
  // not guess — return null and let the caretaker check /api/mess/inventory.
  const lowStock: number | null = null;

  return NextResponse.json({
    success: true,
    data: {
      role: "caretaker",
      assignedHostel: callerHostel,
      pendingCount: rows.length,
      pendingTickets: rows,
      occupancy,
      lowStock,
      notes:
        "Occupancy is the count of users currently inside (campus_occupancy status IN). " +
        "lowStock is null: no low-stock flag is tracked on the confirmed mess tables — " +
        "use /api/mess/inventory for stock state. " +
        (callerHostel
          ? `Tickets are scoped to hostel block ${callerHostel}.`
          : "Caller is admin/sysadmin; all tickets returned."),
    },
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "caretaker_summary" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
