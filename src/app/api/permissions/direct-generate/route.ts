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
import { assertCsrf } from "@/lib/csrf";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification } from "@/lib/db";
import {
  directGeneratePass,
  generateTicketNumber,
  requiresStepup,
  DAILY_OUTING_MAX_HOURS,
  DAY_PASS_MAX_HOURS,
  HOME_OUT_MAX_HOURS,
} from "@/lib/permission-workflow";
import { checkStepupPassword as checkStepup, DIRECT_GENERATE_ROLES } from "@/lib/permission-forward";
import { CANONICAL_EXIT_FLOWS, normalizeExitReason } from "@/lib/student-exit-flow";
import type { Role, ReasonCode } from "@/lib/types";

type DirectGenReason =
  | "home_out"
  | "day_pass"
  | "emergency"
  | "special_leave"
  | "daily_outing"
  | "day_scholar_out";
const DIRECT_GEN_REASONS: readonly DirectGenReason[] = [
  "home_out",
  "day_pass",
  "emergency",
  "special_leave",
  "daily_outing",
  "day_scholar_out",
];

/**
 * Day-scholar home_out room-assignment requirement.
 * When reason === "home_out" AND the requester's current_entry_type is
 * "day_scholar", the caller MUST supply pendingHostelBlock, pendingRoomNumber
 * and pendingWardenId in the request body. Missing any of them returns 400
 * HOSTEL_ROOM_REQUIRED.
 */
interface HomeOutRoomAssignment {
  pendingHostelBlock?: string;
  pendingRoomNumber?: string;
  pendingWardenId?: string;
}

/**
 * Server-side max-duration per reason, enforced on the from/to window.
 * - daily_outing: capped at 1 hour (DAILY_OUTING_MAX_HOURS).
 * - day_pass: capped at 12 hours (DAY_PASS_MAX_HOURS).
 * - home_out: no cap (HOME_OUT_MAX_HOURS = null).
 * - day_scholar_out: no cap.
 * - emergency / special_leave: fall back to the canonical flow cap.
 */
function maxDurationForReason(reason: DirectGenReason): number | null {
  if (reason === "home_out") return HOME_OUT_MAX_HOURS; // null = unlimited
  if (reason === "day_pass") return DAY_PASS_MAX_HOURS; // 12h
  if (reason === "daily_outing") return DAILY_OUTING_MAX_HOURS; // 1h
  if (reason === "day_scholar_out") return null; // no cap
  // emergency / special_leave fall through to the canonical flow cap.
  const flow = CANONICAL_EXIT_FLOWS[reason as ReasonCode];
  return flow ? flow.maxDurationHours : null;
}

/**
 * Reads the requester's current_entry_type from student_details.
 * Returns null when no row exists or the type is not set.
 */
async function requesterEntryType(
  studentUserId: string,
): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("student_details")
    .select("current_entry_type")
    .eq("user_id", studentUserId)
    .maybeSingle();
  if (error) {
    // Non-fatal: log and treat as unknown (no forced room requirement).
    console.error(
      "[Direct Generate] student_details read error:",
      error.message,
    );
    return null;
  }
  return data?.current_entry_type ?? null;
}

/**
 * Builds the to-field for a direct-generate insert.
 * home_out / day_scholar_out / daily_outing: `to` is optional; if the caller
 * passed a value, use it; otherwise null.
 */
function resolvedTo_OrNull(to: string | null): string | null {
  return to ?? null;
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const csrfFail = assertCsrf(req);
  if (csrfFail) return csrfFail;

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
  const homeOutRoom: HomeOutRoomAssignment = {
    pendingHostelBlock:
      typeof body.pendingHostelBlock === "string" ? body.pendingHostelBlock : undefined,
    pendingRoomNumber:
      typeof body.pendingRoomNumber === "string" ? body.pendingRoomNumber : undefined,
    pendingWardenId:
      typeof body.pendingWardenId === "string" ? body.pendingWardenId : undefined,
  };

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
    reason === "home_out" || reason === "day_scholar_out" || reason === "daily_outing"
      ? resolvedTo_OrNull(to)
      : (to ?? null);
  if (
    (reason !== "home_out" && reason !== "daily_outing" && reason !== "day_scholar_out") &&
    !resolvedTo
  ) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "to is required for reason " + reason } },
      { status: 400 },
    );
  }

  // Day-scholar home_out room-assignment requirement: when the requester is a
  // day scholar and the reason is home_out, the caller must pre-assign a
  // hostel block, room number and warden. All three are mandatory; missing any
  // of them rejects the request with HOSTEL_ROOM_REQUIRED (400).
  let homeOutRoomRequired = false;
  if (reason === "home_out") {
    const requesterType = await requesterEntryType(studentUserId);
    homeOutRoomRequired = requesterType === "day_scholar";
    if (homeOutRoomRequired) {
      const missing: string[] = [];
      if (!homeOutRoom.pendingHostelBlock) missing.push("pendingHostelBlock");
      if (!homeOutRoom.pendingRoomNumber) missing.push("pendingRoomNumber");
      if (!homeOutRoom.pendingWardenId) missing.push("pendingWardenId");
      if (missing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "HOSTEL_ROOM_REQUIRED",
              message: "Day scholar home-out requires pre-assigned hostel block, room, and warden.",
            },
          },
          { status: 400 },
        );
      }
    }
  }

  // Server-side max-duration enforcement (from/to both ISO timestamps).
  // home_out has no cap; daily_outing caps at 1 hour; day_pass caps at 12 hours;
  // day_scholar_out has no cap. emergency/special_leave fall back to the
  // canonical flow cap when both from and to are present.
  const capMaxHours = maxDurationForReason(reason);
  if (capMaxHours !== null && resolvedTo) {
    const fromMs = Date.parse(from);
    const toMs = Date.parse(resolvedTo);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "from/to must be valid ISO timestamps" } },
        { status: 400 },
      );
    }
    const hours = (toMs - fromMs) / (60 * 60 * 1000);
    if (hours > capMaxHours) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DURATION_EXCEEDED",
            message: `Duration ${reason} may not exceed ${capMaxHours} hours`,
          },
        },
        { status: 400 },
      );
    }
  } else if (capMaxHours !== null && !resolvedTo && reason !== "home_out") {
    // Guard: a capped reason without a `to` value was already rejected above;
    // this branch is unreachable but kept for strictness.
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
    // The pure directGeneratePass reason type is the original four
    // (home_out | day_pass | emergency | special_leave). daily_outing and
    // day_scholar_out are treated as home_out in the pure layer until the DB
    // agent widens the input type; the step-up check in the pure layer and
    // the audit/notification in this route use the original `reason` value.
    type PureDirectGenReason =
      | "home_out"
      | "day_pass"
      | "emergency"
      | "special_leave";
    const pureReason: PureDirectGenReason =
      reason === "daily_outing" || reason === "day_scholar_out" ? "home_out" : reason;
    result = directGeneratePass({
      actor,
      studentUserId,
      reason: pureReason,
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

  // Persist the pre-assigned hostel room fields when a day-scholar home-out
  // supplied them. These are written to the pending_* columns on the
  // permission row (added by the DB migration) so the later entry-type write
  // flow can move them onto student_details when the student actually enters.
  if (homeOutRoomRequired) {
    insertRow.pending_hostel_block = homeOutRoom.pendingHostelBlock;
    insertRow.pending_room_number = homeOutRoom.pendingRoomNumber;
    insertRow.pending_warden_id = homeOutRoom.pendingWardenId;
  }

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
      ...(homeOutRoomRequired
        ? {
            pendingHostelBlock: homeOutRoom.pendingHostelBlock,
            pendingRoomNumber: homeOutRoom.pendingRoomNumber,
            pendingWardenId: homeOutRoom.pendingWardenId,
          }
        : {}),
    },
  }).catch((err) => console.error("[Direct Generate] addAudit error:", err));

  // Additionally audit the hostel-room assignment on home_out (the warden +
  // block + room are recorded so the approval chain is traceable).
  if (homeOutRoomRequired) {
    addAudit({
      action: "HOSTEL_ROOM_ASSIGNED_ON_HOME_OUT",
      userId: auth.userId,
      userName: auth.email,
      role: authUserRole as Role,
      details: {
        ticketNumber,
        studentUserId,
        reason,
        from,
        to: resolvedTo,
        wardenId: homeOutRoom.pendingWardenId,
        hostelBlock: homeOutRoom.pendingHostelBlock,
        roomNumber: homeOutRoom.pendingRoomNumber,
      },
    }).catch((err) =>
      console.error("[Direct Generate] addAudit HOSTEL_ROOM_ASSIGNED_ON_HOME_OUT error:", err),
    );
  }

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
