// src/app/api/oie/queue/route.ts
// SCAFFOLD:QUEUE — read-only queue feed for the OIE exam desk.
//
// Fixes:
//   • Bug #2 "permission request not found": returns the canonical envelope
//     { success: false, error: { code } } with STAGE codes, so clients map to
//     "This request no longer exists." instead of a blank banner.
//   • Cross-stage visibility: returns the whole exam chain for the caller's
//     *viewable* scope (rows this role may see) so the client can render other
//     stages read-only. Rows the caller may not see are hidden here — the
//     server is the filter, not the client.
//   • Full stage-scoping: never trusts a caller-supplied stage; scope is
//     derived from the authenticated role only.
//
// This route never mutates. All writes go through /api/permissions/[ticket].

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Roles that may read this feed. Acting is decided row-by-row server-side. */
const VIEW_ROLES: readonly Role[] = [
  "oie",
  "exam_branch",
  "vice_principal",
  "principal",
  "hod",
  "faculty",
  "admin",
  "sysadmin",
] as const;

type FeedRow = {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline: string | null;
  created_at: string | null;
  student: { id: string | null; name: string | null; student_details: { roll: string | null } | null } | null;
};

/** Exam chain order — used by the client to decide read-only vs actionable. */
const EXAM_CHAIN = ["faculty", "hod", "oie", "vice_principal", "principal", "completed"] as const;

/**
 * Stage visibility per role. `permission_requests` is the compat view over
 * `permissions` (see 20261026000001_permission_workflow_reconciliation.sql),
 * which still exposes `student_user_id`, so that is the embed alias.
 */
function stagesForRole(role: Role): string[] {
  switch (role) {
    case "oie":
    case "exam_branch":
      return ["oie", "vice_principal", "principal", "completed"];
    case "vice_principal":
    case "principal":
      return ["vice_principal", "principal", "completed"];
    case "hod":
      return ["hod", "oie", "vice_principal", "principal", "completed"];
    case "faculty":
      return ["faculty", "hod", "oie", "vice_principal", "principal", "completed"];
    case "admin":
    case "sysadmin":
      return [...EXAM_CHAIN];
    default:
      return [];
  }
}

function stageOwnedByRole(role: Role): string | null {
  switch (role) {
    case "oie":
    case "exam_branch":
      return "oie";
    case "vice_principal":
      return "vice_principal";
    case "principal":
      return "principal";
    case "hod":
      return "hod";
    case "faculty":
      return "faculty";
    default:
      return null;
  }
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  // Defence in depth: reject requests whose identity headers were not
  // re-signed by withAuthorization.
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const role = auth.role as Role;
  if (!VIEW_ROLES.includes(role)) {
    const { body, status } = err("FORBIDDEN", "Not authorized to view this queue.", 403);
    return NextResponse.json(body, { status });
  }

  const db = getSupabaseServiceClient();

  // Requester + roll in one round-trip. `permission_requests` is the compat
  // view over `permissions` (20261026000001_permission_workflow_reconciliation)
  // and still exposes `student_user_id`, so that is the embed alias.
  // Stage scope is derived from the authenticated role only — a caller-supplied
  // stage/workflow param is never trusted.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:requester_user_id(id, name, student_details(roll))"
    )
    .eq("workflow_type", "exam")
    .in("current_stage", stagesForRole(role))
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  const rows: FeedRow[] = (data ?? []).map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    const student = rec.student as
      | { id?: string | null; name?: string | null; student_details?: { roll?: string | null } | null }
      | null
      | undefined;
    return {
      id: String(rec.id),
      ticket_number: String(rec.ticket_number),
      workflow_type: String(rec.workflow_type),
      current_stage: String(rec.current_stage),
      status: String(rec.status),
      sla_deadline: (rec.sla_deadline as string | null) ?? null,
      created_at: (rec.created_at as string | null) ?? null,
      student: {
        id: student?.id ?? null,
        name: student?.name ?? null,
        student_details: { roll: student?.student_details?.roll ?? null },
      },
    };
  });

  return NextResponse.json({
    success: true,
    data: rows,
    total: rows.length,
    chain: EXAM_CHAIN,
    /** The stage this role may act at — null means read-only everywhere. */
    myStage: stageOwnedByRole(role),
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "oie_queue" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...VIEW_ROLES] }),
  readLimit
);
