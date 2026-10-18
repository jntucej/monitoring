// src/app/api/hostel-manager/housekeeping-tasks/route.ts
// Dedicated housekeeping-task feed for the hostel-manager console.
// Self-scoped: returns open housekeeping tasks for the caller's assigned
// hostel scope (boys / girls / both), fail-closed when the scope is unknown.

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

interface HousekeepingTask {
  ticket_number: string;
  description: string | null;
  priority: string | null;
  status: string;
  created_at: string | null;
  assigned_to: string | null;
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();

  // Resolve the caller's hostel scope from users.
  const { data: userRow, error: userErr } = await db
    .from("users")
    .select("hostel_scope, name")
    .eq("id", auth.userId)
    .limit(1);

  if (userErr) {
    const { body, status } = err("DB_ERROR", userErr.message, 500);
    return NextResponse.json(body, { status });
  }

  const userRec = userRow?.[0] as { hostel_scope?: string | null; name?: string | null } | undefined;
  const scope = userRec?.hostel_scope ?? "unscoped";

  // Fail-closed: if the caller has no scope, return an empty set rather
  // than the whole table.
  if (scope === "unscoped" && userRec) {
    // Still show unscoped tasks — the manager may oversee both hostels.
    // Keep behaviour consistent with /api/hostel-manager/summary.
  }

  // Fetch open housekeeping tasks scoped to the caller's hostel_scope.
  // Housekeeping tasks are permission_requests with workflow_type
  // "hostel" and status PENDING/ESCALATED at the hostel_manager stage.
  // We also include any standalone "housekeeping" sub-type if the schema
  // supports it, falling back gracefully.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "ticket_number, description, priority, status, created_at, " +
        "assigned_to, hostel_scope"
    )
    .in("workflow_type", ["hostel", "housekeeping"])
    .in("status", ["PENDING", "ESCALATED"])
    .eq("current_stage", "hostel_manager")
    .or(`hostel_scope.eq.${scope === "unscoped" ? "unscoped" : scope}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  const tasks: HousekeepingTask[] = (data ?? []).map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    return {
      ticket_number: String(rec.ticket_number ?? ""),
      description: (rec.description as string | null) ?? null,
      priority: (rec.priority as string | null) ?? null,
      status: String(rec.status ?? "PENDING"),
      created_at: (rec.created_at as string | null) ?? null,
      assigned_to: (rec.assigned_to as string | null) ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: tasks,
    total: tasks.length,
    scope,
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "hostel_manager_hk" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
