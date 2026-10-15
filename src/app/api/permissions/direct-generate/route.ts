// src/app/api/permissions/direct-generate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/permissions/direct-generate
//
// Bypasses the staged hostel chain and generates an APPROVED pass directly.
// Only L2 (deputy_warden), L3 (hostel_manager), L4 (principal) and
// sysadmin/admin may call this; L1 (caretaker) is rejected with 403.
//
// Body: { studentUserId, reason, from, to?, note?, stepupPassword? }
//
// Reason codes accepted: home_out, day_pass, emergency, special_leave.
// `to` is required unless reason === "home_out" (unlimited). Server-side
// max-duration is enforced from CANONICAL_EXIT_FLOWS. Step-up password is
// required (verified with lockout) when requiresStepup() says so for the
// direct_generate action.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification } from "@/lib/db";
import { directGeneratePass, generateTicketNumber, requiresStepup } from "@/lib/permission-workflow";
import { checkStepupPassword as checkStepup, DIRECT_GENERATE_ROLES } from "@/lib/permission-forward";
import { CANONICAL_EXIT_FLOWS, normalizeExitReason } from "@/lib/student-exit-flow";
import type { Role, ReasonCode } from "@/lib/types";

type DirectGenReason = "home_out" | "day_pass" | "emergency" | "special_leave";
const DIRECT_GEN_REASONS: readonly DirectGenReason[] = [
  "home_out",
  "day_pass",
  "emergency",
  "special_leave",
];

function maxDurationForReason(reason: DirectGenReason): number | null {
  const flow = CANONICAL_EXIT_FLOWS[reason as ReasonCode];
  // home_out is unlimited in the direct-generate surface (HOME_OUT_MAX_HOURS=null).
  if (reason === "home_out") return null;
  return flow ? flow.maxDurationHours : null;
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const auth = ctx.auth;
  const authUserRole = auth.role;

  if (!DIRECT_GENERATE_ROLES.includes(authUserRole)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Direct-generate is limited to L2/L3/L4 approvers and admins" } },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const studentUserId = typeof body.studentUserId === "string" ? body.studentUserId : "";
  const reasonRaw = typeof body.reason === "string" ? body.reason : "";
  const from = typeof body.from === "string" ? body.from : "";
  const to = typeof body.to === "string" ? body.to : body.to === null ? null : (body.to ?? null) as string | null;
  const note = typeof body.note === "string" ? body.note : undefined;
  const stepupPassword = typeof body.stepupPassword === "string" ? body.stepupPassword : undefined;

  if (!studentUserId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "studentUserId is required" } },
      { status: 400 },
    );
  }
  if (!from) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "from is required" } },
      { status: 400 },
    );
  }

  const normalizedReason = normalizeExitReason(reasonRaw);
  if (!DIRECT_GEN_REASONS.includes(normalizedReason as DirectGenReason)) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: `reason must be one of: ${DIRECT_GEN_REASONS.join(", ")}` } },
      { status: 400 },
    );
  }
  const reason = normalizedReason as DirectGenReason;

  const resolvedTo: string | null =
    reason === "home_out" ? null : (to ?? null);
  if (reason !== "home_out" && !resolvedTo) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "to is required for reason " + reason } },
      { status: 400 },
    );
  }

  // Server-side max-duration enforcement (from/to both ISO timestamps).
  if (resolvedTo) {
    const maxHours = maxDurationForReason(reason);
    if (maxHours !== null) {
      const fromMs = Date.parse(from);
      const toMs = Date.parse(resolvedTo);
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "from/to must be valid ISO timestamps" } },
          { status: 400 },
        );
      }
      const hours = (toMs - fromMs) / (60 * 60 * 1000);
      if (hours > maxHours) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: `Duration ${reason} may not exceed ${maxHours} hours`,
            },
          },
          { status: 400 },
        );
      }
    }
  }

  const actor = { id: auth.userId, name: auth.email || "Approver", role: authUserRole };

  // Step-up password (verified with lockout) when required for this action.
  let stepupVerified = false;
  if (stepupRequiredForDirectGen(authUserRole, reason)) {
    const check = await checkStepup(auth.userId, authUserRole, stepupPassword);
    if (!check.ok) {
      return NextResponse.json(
        { success: false, error: { code: check.code, message: check.message } },
        { status: 403 },
      );
    }
    stepupVerified = true;
  }

  let result;
  try {
    result = directGeneratePass({
      actor,
      studentUserId,
      reason,
      from,
      to: resolvedTo,
      note,
      stepupVerified,
    });
  } catch (err) {
    const code = err instanceof Error ? (err as { code?: string }).code || "RULE_ERROR" : "RULE_ERROR";
    const message = err instanceof Error ? err.message : "Direct-generate rule violation";
    return NextResponse.json({ success: false, error: { code, message } }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const ticketNumber = await generateTicketNumber("hostel").catch(() => "HOST-DIRECT");

  const nowIso = new Date().toISOString();
  const insertRow: Record<string, unknown> = {
    ticket_number: ticketNumber,
    workflow_type: "hostel",
    status: "APPROVED",
    current_stage: "completed",
    direct_generated: true,
    requester_user_id: studentUserId,
    reason,
    from_date: from,
    to_date: resolvedTo,
    stage_history: result.updates.stage_history,
    created_at: nowIso,
    updated_at: nowIso,
  };
  if (result.updates.stepup_verified_at) {
    insertRow.stepup_verified_at = result.updates.stepup_verified_at;
    insertRow.stepup_verified_by = auth.userId;
  }
  if (note) insertRow.note = note;

  const { data: created, error: insertErr } = await supabase
    .from("permissions")
    .insert(insertRow)
    .select()
    .single();

  if (insertErr) {
    console.error("[Direct Generate] insert error:", insertErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: insertErr.message } },
      { status: 500 },
    );
  }

  addAudit({
    action: "PERMISSION_DIRECT_GENERATED",
    userId: auth.userId,
    userName: auth.email,
    role: authUserRole as Role,
    details: {
      ticketNumber,
      studentUserId,
      reason,
      from,
      to: resolvedTo,
      stepupVerified,
    },
  }).catch((err) => console.error("[Direct Generate] addAudit error:", err));

  addNotification(
    "user",
    studentUserId,
    "permission",
    `Direct pass ${ticketNumber} generated`,
    result.effects.notifyMessage ?? `A ${reason} pass was generated for you.`,
  ).catch((err) => console.error("[Direct Generate] addNotification error:", err));

  return NextResponse.json({ success: true, data: created });
}

/**
 * Requires step-up for a direct-generate when the actor is L3/L4 or when the
 * reason is emergency/special_leave (mirrors the pure requiresStepup).
 */
function stepupRequiredForDirectGen(actorRole: string, reason: string): boolean {
  return requiresStepup({ actorRole, action: "direct_generate", reason });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "permission_direct_generate", maxRequests: 20 },
);
