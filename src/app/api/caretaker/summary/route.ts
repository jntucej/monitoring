// src/app/api/caretaker/summary/route.ts
// Per-role summary feed for the caretaker: pending hostel/exam-chain tickets
// at the caretaker-owned stages, a light campus occupancy figure, and the
// current low-stock mess item count.
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

/** Stages the caretaker owns (own stage + the shared hostel_biometric stage). */
const STAGES = ["caretaker", "hostel_biometric"] as const;

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();

  // Open tickets at the caretaker-owned stages, soonest SLA first.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "ticket_number, workflow_type, status, sla_deadline, created_at, " +
        "student:student_user_id(id, name, student_details(roll))"
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
      pendingCount: rows.length,
      pendingTickets: rows,
      occupancy,
      lowStock,
      notes:
        "Occupancy is the count of users currently inside (campus_occupancy status IN). " +
        "lowStock is null: no low-stock flag is tracked on the confirmed mess tables — " +
        "use /api/mess/inventory for stock state.",
    },
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "caretaker_summary" };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...ROLES] }),
  readLimit
);
