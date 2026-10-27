import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
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

interface PendingRoomFields {
  id: string;
  ticket_number: string;
  pending_hostel_block: string | null;
  pending_room_number: string | null;
  pending_warden_id: string | null;
}

async function findPendingPermissionByStudent(
  studentUserId: string,
): Promise<PendingRoomFields | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("permissions")
    .select("id, ticket_number, pending_hostel_block, pending_room_number, pending_warden_id")
    .eq("student_user_id", studentUserId)
    .eq("workflow_type", "hostel")
    .eq("reason", "home_out")
    .in("status", ["APPROVED", "COMPLETED"])
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as PendingRoomFields | undefined) ?? null;
}

async function handlePost(
  req: NextRequest,
  ctx: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => ({}));
  const roll = String(body.roll ?? "").trim();
  const entryType = body.entryType as EntryType | undefined;
  const buttonId = body.buttonId as string | undefined;
  const gateId = body.gateId as string | undefined;

  if (!roll) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_ROLL", message: "roll required" } },
      { status: 400 }
    );
  }
  if (!entryType || !ENTRY_TYPES.includes(entryType)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ENTRY_TYPE", message: "hosteller|day_scholar only" } },
      { status: 400 }
    );
  }
  if (!gateId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_GATE", message: "gateId required" } },
      { status: 400 }
    );
  }

  await assertOperatorHasGate(ctx.auth.role, gateId);
  const gate = await findGateById(gateId);
  if (!gate) {
    return NextResponse.json(
      { success: false, error: { code: "GATE_NOT_FOUND", message: "Gate not found" } },
      { status: 404 }
    );
  }
  assertOperatorGateMatch(
    ctx.auth.role,
    ctx.auth.gateId ?? null,
    gateId,
    gate.gate_code,
    ctx.auth.supervisedGates ?? null
  );

  const user = await findByUniqueId(roll);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "STUDENT_NOT_FOUND", message: "No such student" } },
      { status: 404 }
    );
  }

  const occupancy = await findOccupancyByUserId(user.id);
  if (occupancy?.current_status !== "IN") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOT_ON_CAMPUS",
          message: "Student is not on campus — record an IN scan first",
        },
      },
      { status: 409 }
    );
  }

  const shouldWrite = buttonId !== "return_to_hostel";
  const supabase = getSupabaseServiceClient();

  if (shouldWrite) {
    const { error: updErr } = await supabase
      .from("student_details")
      .update({
        current_entry_type: entryType,
        type_chosen_at: new Date().toISOString(),
        type_chosen_at_gate: gateId,
      })
      .eq("user_id", user.id);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: updErr.message } },
        { status: 500 }
      );
    }
  }

  let assignmentMaterialized: PendingRoomFields | null = null;
  if (buttonId === "home_in" && entryType === "hosteller") {
    const pending = await findPendingPermissionByStudent(user.id);
    if (pending && pending.pending_hostel_block && pending.pending_room_number) {
      const { error: roomErr } = await supabase
        .from("student_details")
        .update({
          hostel_block: pending.pending_hostel_block,
          room_number: pending.pending_room_number,
          warden_id: pending.pending_warden_id,
        })
        .eq("user_id", user.id);
      if (!roomErr) assignmentMaterialized = pending;
    }
  }

  await addAudit({
    action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
    userId: ctx.auth.userId,
    userName: user.name,
    role: ctx.auth.role,
    details: JSON.stringify({
      studentUserId: user.id,
      entryType,
      buttonId,
      gateId,
      assignmentMaterialized: assignmentMaterialized?.ticket_number ?? null,
    }),
  });

  return NextResponse.json({
    success: true,
    data: {
      studentUserId: user.id,
      entryType,
      entryTypeWritten: shouldWrite,
      gateId,
      assignmentMaterialized: assignmentMaterialized?.ticket_number ?? null,
    },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 60,
});
