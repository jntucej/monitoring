// src/app/api/operator/entry-type/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/operator/entry-type
//
// Records the entry type a student chose at the entry gate (hosteller or
// day_scholar) and persists it on student_details so the later OUT-scan flow
// can enforce the correct scope. The operator must be bound to the gate they
// are operating at (assertOperatorHasGate + assertOperatorGateMatch), and the
// student must currently be OUT (or have no occupancy row). If the student is
// currently IN the request is rejected with 409.
//
// Body: { roll, entryType: "hosteller" | "day_scholar", gateId }
//
// Mirrors the L4 pattern of record.ts / the sibling operator routes: operator
// gate assertion, occupancy read, student_details update, addAudit.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import {
  assertOperatorHasGate,
  assertOperatorGateMatch,
} from "@/server/policy/gate-access";
import { findGateById } from "@/server/repositories/gates/findById";
import { findOccupancyByUserId } from "@/server/repositories/occupancy/findByUserId";
import { findByUniqueId } from "@/server/repositories/users/findByUniqueId";
import type { Role } from "@/lib/types";

const ENTRY_TYPES = ["hosteller", "day_scholar"] as const;
type EntryType = (typeof ENTRY_TYPES)[number];

/**
 * The pending hostel-room columns on the permission row.
 * These are written by the direct-generate route when a day-scholar home-out
 * pass is pre-assigned to a hostel room, and are consumed here by the
 * entry-type write logic: when the student actually enters, the pending
 * room/warden are moved onto student_details.
 *
 * Note: pending_hostel_block, pending_room_number, pending_warden_id are
 * added to the permissions table by the DB migration (in parallel with this
 * change). If the columns are not yet present, the reads below will simply
 * return null and the pending-clear path will be skipped.
 */
interface PendingRoomFields {
  id: string;
  ticket_number: string;
  pending_hostel_block: string | null;
  pending_room_number: string | null;
  pending_warden_id: string | null;
}

/**
 * Fetches the most recent active (PENDING or APPROVED) hostel permission row
 * for a student that has any pending room/warden fields set. Returns null when
 * no such row exists.
 */
async function findPendingPermissionByStudent(
  studentUserId: string,
): Promise<PendingRoomFields | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("id, ticket_number, pending_hostel_block, pending_room_number, pending_warden_id")
    .eq("requester_user_id", studentUserId)
    .eq("workflow_type", "hostel")
    .in("status", ["PENDING", "APPROVED"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Non-fatal: log and return null so the entry-type write still proceeds.
    console.error("[Operator EntryType] pending-permission read error:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as unknown as PendingRoomFields;
  // Only act when at least one pending field is set.
  const hasPending =
    row.pending_hostel_block != null ||
    row.pending_room_number != null ||
    row.pending_warden_id != null;
  return hasPending ? row : null;
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const auth = ctx.auth;

  // 1. Body
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const roll = typeof body.roll === "string" ? body.roll.trim() : "";
  const entryType = body.entryType;
  const gateId = typeof body.gateId === "string" ? body.gateId : "";

  if (!roll) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "roll is required" } },
      { status: 400 },
    );
  }
  if (!gateId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "gateId is required" } },
      { status: 400 },
    );
  }
  if (!ENTRY_TYPES.includes(entryType as EntryType)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "entryType must be one of: hosteller, day_scholar" },
      },
      { status: 400 },
    );
  }

  // 2. Operator gate assignment. Operators must hold a gate; supervisors may
  //    work any of their supervised gates; admins/sysadmins are exempt.
  const supervisedGates = auth.supervisedGates ?? null;
  try {
    assertOperatorHasGate(auth.role, auth.gateId);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "No gate assigned to operator" } },
      { status: 403 },
    );
  }

  // 3. Gate must exist.
  const gate = await findGateById(gateId);
  if (!gate) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Gate not found" } },
      { status: 404 },
    );
  }

  // 4. Operator is allowed to act at this gate.
  try {
    assertOperatorGateMatch(auth.role, auth.gateId ?? null, gate.id, gate.gate_code, supervisedGates);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Operator not assigned to this gate" } },
      { status: 403 },
    );
  }

  // 5. Resolve the student by roll. A roll is the student's users.unique_id.
  const student = await findByUniqueId(roll);
  if (!student) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Student not found for roll " + roll } },
      { status: 404 },
    );
  }
  if (student.role !== "student") {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "roll does not identify a student" } },
      { status: 400 },
    );
  }

  // 6. Occupancy: the student must currently be OUT (or have no row).
  const occupancy = await findOccupancyByUserId(student.id);
  if (occupancy && occupancy.current_status === "IN") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFLICT",
          message: "Student is currently IN; entry type can only be selected when OUT.",
        },
      },
      { status: 409 },
    );
  }

  // 7. Read the pending hostel-room permission row (if any) and the existing
  //    student_details row so we can:
  //    a) move pending room/warden onto student_details when the student
  //       enters as a hosteller,
  //    b) clear the pending fields on the permission row in both cases, and
  //    c) audit the type change only when current_entry_type actually changes.
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServiceClient();

  const pending = await findPendingPermissionByStudent(student.id);

  const { data: existing, error: readErr } = await supabase
    .from("student_details")
    .select("id, user_id, roll, current_entry_type")
    .eq("user_id", student.id)
    .maybeSingle();

  if (readErr) {
    console.error("[Operator EntryType] student_details read error:", readErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: readErr.message } },
      { status: 500 },
    );
  }

  // Detect whether the stored entry type actually changes (for the audit gate).
  const previousEntryType: string | null = existing?.current_entry_type ?? null;
  const entryTypeChanged = previousEntryType !== entryType;

  // Build the student_details update / insert payload.
  const sdPayload: Record<string, unknown> = {
    current_entry_type: entryType,
    type_chosen_at: nowIso,
    type_chosen_at_gate: gate.id,
  };

  if (entryType === "hosteller" && pending) {
    // The student is entering as a hosteller: move the pre-assigned
    // hostel room / warden onto student_details. warden_id is the
    // corresponding column on student_details (added by the DB migration).
    if (pending.pending_hostel_block) sdPayload.hostel_block = pending.pending_hostel_block;
    if (pending.pending_room_number) sdPayload.room_number = pending.pending_room_number;
    if (pending.pending_warden_id) sdPayload.warden_id = pending.pending_warden_id;
  }
  // entryType === "day_scholar": discard. Do NOT write room/warden to
  // student_details; only the pending fields are cleared below.

  let updatedRow;
  if (existing) {
    const { data: upd, error: updErr } = await supabase
      .from("student_details")
      .update(sdPayload)
      .eq("user_id", student.id)
      .select()
      .single();
    if (updErr) {
      console.error("[Operator EntryType] student_details update error:", updErr.message);
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_ERROR", message: updErr.message } },
        { status: 500 },
      );
    }
    updatedRow = upd;
  } else {
    // No student_details row yet: insert a minimal one keyed by user_id.
    const insertPayload: Record<string, unknown> = {
      user_id: student.id,
      roll: student.unique_id,
      ...sdPayload,
    };
    const { data: ins, error: insErr } = await supabase
      .from("student_details")
      .insert(insertPayload)
      .select()
      .single();
    if (insErr) {
      console.error("[Operator EntryType] student_details insert error:", insErr.message);
      return NextResponse.json(
        { success: false, error: { code: "UPDATE_ERROR", message: insErr.message } },
        { status: 500 },
      );
    }
    updatedRow = ins;
  }

  // 7b. Clear the pending hostel-room fields on the permission row. Both the
  //     hosteller (room moved onto student_details) and the day_scholar
  //     (room discarded) paths null out the pending fields so they are
  //     never re-applied on a later entry.
  if (pending) {
    const { error: clearErr } = await supabase
      .from("permissions")
      .update({
        pending_hostel_block: null,
        pending_room_number: null,
        pending_warden_id: null,
        updated_at: nowIso,
      })
      .eq("id", pending.id);
    if (clearErr) {
      // Non-fatal: the entry type was already persisted; a failed pending-clear
      // should not roll back the student_details write. Log and continue.
      console.error(
        "[Operator EntryType] pending-permission clear error:",
        clearErr.message,
      );
    }
  }

  // 8. Audit. STUDENT_TYPE_CHANGED_AT_ENTRY is written only when the stored
  //    current_entry_type actually changed; re-selecting the same type is a
  //    no-op and is not audited.
  if (entryTypeChanged) {
    addAudit({
      action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
      userId: auth.userId,
      userName: auth.email,
      role: auth.role as Role,
      gateId: gate.id,
      details: {
        studentUserId: student.id,
        roll,
        previousEntryType,
        entryType,
        gateId: gate.id,
        chosenAt: nowIso,
        pendingPermissionId: pending?.id ?? null,
        pendingHostelBlock: pending?.pending_hostel_block ?? null,
        pendingRoomNumber: pending?.pending_room_number ?? null,
        pendingWardenId: pending?.pending_warden_id ?? null,
      },
    }).catch((err) => console.error("[Operator EntryType] addAudit error:", err));
  }

  return NextResponse.json({ success: true, data: updatedRow });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "operator_entry_type", maxRequests: 30 },
);

