// src/app/api/hostel-manager/summary/route.ts
// Per-role summary feed for the hostel manager: open tickets at the
// hostel-manager-owned stages,
// broken down by hostel_scope.
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

const ROLES: readonly Role[] = ["hostel_manager", "admin", "sysadmin"] as const;

/** Stages the hostel manager owns. */
const STAGES = ["hostel_manager"] as const;

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();

  // Open tickets at the hostel-manager-owned stages, soonest SLA first.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "ticket_number, workflow_type, status, sla_deadline, created_at, hostel_scope, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .in("current_stage", [...STAGES])
    .in("status", ["PENDING", "ESCALATED"])
    .order("sla_deadline", { ascending: true })
    .limit(20);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  const rows = (data ?? []).map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    const student = rec.student as
      | { id?: string | null; name?: string | null; student_details?: { roll?: string | null } | null }
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

  // Break the open set down by hostel_scope (boys / girls / unscoped).
  const hostelScope: Record<string, number> = { boys: 0, girls: 0, unscoped: 0 };
  for (const r of data ?? []) {
    const rec = r as unknown as Record<string, unknown>;
    const scope = (rec.hostel_scope as string | null) ?? null;
    const key = scope === "boys" || scope === "girls" ? scope : "unscoped";
    hostelScope[key] += 1;
  }

  return NextResponse.json({
    success: true,
    data: {
      role: "hostel_manager",
      pendingCount: rows.length,
      pendingTickets: rows,
      hostelScope,
      notes:
        "hostelScope counts the open tickets by users.hostel_scope (boys/girls); 'unscoped' " +
        "covers tickets with no hostel_scope set. Stage scope: hostel_manager.",
    },
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "hostel_manager_summary" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
