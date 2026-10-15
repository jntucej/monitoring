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

  // 7. Update student_details (UPSERT on user_id; the migration adds the
  //    current_entry_type / type_chosen_at / type_chosen_at_gate columns).
  const nowIso = new Date().toISOString();
  const supabase = getSupabaseServiceClient();
  const { data: existing, error: readErr } = await supabase
    .from("student_details")
    .select("id, user_id, roll")
    .eq("user_id", student.id)
    .maybeSingle();

  if (readErr) {
    console.error("[Operator EntryType] student_details read error:", readErr.message);
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: readErr.message } },
      { status: 500 },
    );
  }

  let updatedRow;
  if (existing) {
    const { data: upd, error: updErr } = await supabase
      .from("student_details")
      .update({
        current_entry_type: entryType,
        type_chosen_at: nowIso,
        type_chosen_at_gate: gate.id,
      })
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
    const { data: ins, error: insErr } = await supabase
      .from("student_details")
      .insert({
        user_id: student.id,
        roll: student.unique_id,
        current_entry_type: entryType,
        type_chosen_at: nowIso,
        type_chosen_at_gate: gate.id,
      })
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

  // 8. Audit.
  addAudit({
    action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role as Role,
    gateId: gate.id,
    details: {
      studentUserId: student.id,
      roll,
      entryType,
      gateId: gate.id,
      chosenAt: nowIso,
    },
  }).catch((err) => console.error("[Operator EntryType] addAudit error:", err));

  return NextResponse.json({ success: true, data: updatedRow });
}

export const POST = withRateLimit(
  withAuthorization(handlePost),
  { keyPrefix: "operator_entry_type", maxRequests: 30 },
);

