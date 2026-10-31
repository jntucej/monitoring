import { NextRequest, NextResponse } from "next/server";
import withAuthorization from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";
import { query, withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import {
  assertOperatorHasGate,
  assertOperatorGateMatch,
} from "@/server/policy/gate-access";
import { findGateById } from "@/server/repositories/gates/findById";
import { findOccupancyByUserId } from "@/server/repositories/occupancy/findByUserId";
import { findByUniqueId } from "@/server/repositories/users/findByUniqueId";
import type { Role } from "@/lib/types";
import type { PoolClient } from "pg";

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
  client: PoolClient,
): Promise<PendingRoomFields | null> {
  const { rows } = await client.query<PendingRoomFields>(
    `SELECT id, ticket_number, pending_hostel_block, pending_room_number, pending_warden_id
       FROM permissions
      WHERE student_user_id = $1
        AND workflow_type = 'hostel'
        AND reason = 'home_out'
        AND status IN ('APPROVED', 'COMPLETED')
      ORDER BY created_at DESC
      LIMIT 1`,
    [studentUserId],
  );
  return rows[0] ?? null;
}

async function findCurrentStudentDetails(
  userId: string,
  client: PoolClient,
): Promise<{
  current_entry_type: string | null;
  student_type: string | null;
  gender: string | null;
  hostel_block: string | null;
  room_number: string | null;
  warden_id: string | null;
} | null> {
  const { rows } = await client.query(
    `SELECT sd.current_entry_type, sd.student_type, sd.gender,
            sd.hostel_block, sd.room_number, sd.warden_id
       FROM student_details sd
      WHERE sd.user_id = $1
      LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  return rows[0];
}

async function findGenderById(userId: string, client: PoolClient): Promise<string | null> {
  const { rows } = await client.query(
    `SELECT gender FROM student_details WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0]?.gender ?? null;
}

async function checkRoomOccupied(client: PoolClient, block: string, room: string, userId: string): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM student_details
       WHERE hostel_block = $1 AND room_number = $2
         AND user_id != $3
         AND (current_entry_type IS NULL OR current_entry_type = 'hosteller')
      LIMIT 1`,
    [block, room, userId],
  );
  return rows.length > 0;
}

async function revokeOpenMessTokens(client: PoolClient, userId: string, fromDates: string[]): Promise<number> {
  if (fromDates.length === 0) return 0;
  const placeholders = fromDates.map((_, i) => `$${i + 3}`).join(", ");
  const { rowCount } = await client.query(
    `UPDATE mess_tokens t
         SET revoked_at = NOW(), revoked_by = $2::uuid
       FROM mess_days d
      WHERE t.mess_day_id = d.id
        AND t.user_id = $1::uuid
        AND t.used_at IS NULL
        AND t.revoked_at IS NULL
        AND d.meal_date::text IN (${placeholders})`,
    [userId, userId, ...fromDates],
  );
  return rowCount ?? 0;
}

async function clearMessPreferences(client: PoolClient, userId: string, fromDates: string[]): Promise<number> {
  if (fromDates.length === 0) return 0;
  const placeholders = fromDates.map((_, i) => `$${i + 2}`).join(", ");
  const { rowCount } = await client.query(
    `UPDATE mess_preferences p
         SET will_be_present = FALSE
       FROM mess_days d
      WHERE p.mess_day_id = d.id
        AND p.user_id = $1::uuid
        AND d.meal_date::text IN (${placeholders})`,
    [userId, ...fromDates],
  );
  return rowCount ?? 0;
}

async function getUpcomingMessDates(client: PoolClient, count: number): Promise<string[]> {
  const { rows } = await client.query<{ meal_date: string }>(
    `SELECT DISTINCT meal_date::text
       FROM mess_days
      WHERE meal_date >= CURRENT_DATE
      ORDER BY meal_date ASC
      LIMIT $1`,
    [count],
  );
  return rows.map((r) => r.meal_date);
}

async function handlePost(
  req: NextRequest,
  ctx: { auth: AuthContext },
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
      { status: 400 },
    );
  }
  if (!entryType || !ENTRY_TYPES.includes(entryType)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ENTRY_TYPE", message: "hosteller|day_scholar only" } },
      { status: 400 },
    );
  }
  if (!gateId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_GATE", message: "gateId required" } },
      { status: 400 },
    );
  }

  await assertOperatorHasGate(ctx.auth.role, gateId);
  const gate = await findGateById(gateId, {
    currentUserId: ctx.auth.userId,
    currentRole: ctx.auth.role,
  });
  if (!gate) {
    return NextResponse.json(
      { success: false, error: { code: "GATE_NOT_FOUND", message: "Gate not found" } },
      { status: 404 },
    );
  }
  assertOperatorGateMatch(
    ctx.auth.role,
    ctx.auth.gateId ?? null,
    gateId,
    gate.gate_code,
    ctx.auth.supervisedGates ?? null,
  );

  const user = await findByUniqueId(roll);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "STUDENT_NOT_FOUND", message: "No such student" } },
      { status: 404 },
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
      { status: 409 },
    );
  }

  // Only perform a type transition if the operator explicitly chose a button
  // that indicates a type write (not return_to_hostel which is a round-trip).
  const shouldWriteType = buttonId !== "return_to_hostel";

  if (!shouldWriteType) {
    // return_to_hostel: no type change, just audit.
    await addAudit({
      action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
      userId: ctx.auth.userId,
      userName: user.name,
      role: ctx.auth.role,
      details: JSON.stringify({
        studentUserId: user.id,
        entryType: null,
        buttonId,
        gateId,
        note: "return_to_hostel — no type transition",
      }),
    });
    return NextResponse.json({
      success: true,
      data: {
        studentUserId: user.id,
        entryType: null,
        entryTypeWritten: false,
        gateId,
      },
    });
  }

  // ATOMIC transition: wrap everything in a single transaction so that
  // either the full type-change + cleanup succeeds or nothing is applied.
  let transitionResult: {
    oldType: EntryType | null;
    newType: EntryType;
    assignmentMaterialized: string | null;
    messTokensRevoked: number;
    messPrefsCleared: number;
  };

  try {
    transitionResult = await withTransaction(
      async (client: PoolClient) => {
        // ── Read current state ──────────────────────────────────────────
        const current = await findCurrentStudentDetails(user.id, client);
        const oldType =
          current?.current_entry_type === "hosteller" ||
          current?.current_entry_type === "day_scholar"
            ? current.current_entry_type
            : null;

        // No transition needed? Fast path.
        if (oldType === entryType) {
          return {
            oldType,
            newType: entryType,
            assignmentMaterialized: null,
            messTokensRevoked: 0,
            messPrefsCleared: 0,
          };
        }

        // ── Get gender for student_type determination ───────────────────
        const gender =
          current?.gender ??
          (await findGenderById(user.id, client));
        const isFemale = gender === "female";
        const hostellerSt = isFemale ? "HF" : "HM";
        const dayScholarSt = isFemale ? "DF" : "DM";

        // ── Transition: hosteller → day_scholar ─────────────────────────
        if (oldType === "hosteller" && entryType === "day_scholar") {
          const now = new Date().toISOString();

          // Clear hostel assignment fields.
          await client.query(
            `UPDATE student_details
               SET student_type = $1,
                   current_entry_type = $2,
                   type_chosen_at = $3,
                   type_chosen_at_gate = $4,
                   hostel_block = NULL,
                   room_number = NULL,
                   warden_id = NULL,
                   hostel_curfew_time = NULL
             WHERE user_id = $5`,
            [dayScholarSt, entryType, now, gateId, user.id],
          );

          // Revoke open mess tokens for current + next 2 meal days.
          const upcomingDates = await getUpcomingMessDates(client, 2);
          const revoked = await revokeOpenMessTokens(client, user.id, upcomingDates);

          // Clear mess preferences for those days.
          const cleared = await clearMessPreferences(client, user.id, upcomingDates);

          return {
            oldType: "hosteller",
            newType: entryType,
            assignmentMaterialized: null,
            messTokensRevoked: revoked,
            messPrefsCleared: cleared,
          };
        }

        // ── Transition: day_scholar → hosteller ─────────────────────────
        if (oldType === "day_scholar" && entryType === "hosteller") {
          // Require an approved home_out permission with pending room fields.
          const pending = await findPendingPermissionByStudent(user.id, client);
          if (
            !pending ||
            !pending.pending_hostel_block ||
            !pending.pending_room_number
          ) {
            throw Object.assign(
              new Error(
                "Cannot assign hostel type without a pending room assignment. " +
                  "Please complete the hostel move-in process first.",
              ),
              {
                code: "HOSTEL_ROOM_REQUIRED",
                status: 409,
              } as Partial<{ code: string; status: number }>,
            );
          }

          // Check that the target room is not already occupied by another hosteller.
          const isOccupied = await checkRoomOccupied(
            client,
            pending.pending_hostel_block,
            pending.pending_room_number,
            user.id,
          );
          if (isOccupied) {
            throw Object.assign(
              new Error(
                `Room ${pending.pending_room_number} in ${pending.pending_hostel_block} is already occupied by another student.`,
              ),
              {
                code: "ROOM_OCCUPIED",
                status: 409,
              } as Partial<{ code: string; status: number }>,
            );
          }

          const now = new Date().toISOString();

          // Update type and materialise the pending room assignment.
          await client.query(
            `UPDATE student_details
               SET student_type = $1,
                   current_entry_type = $2,
                   type_chosen_at = $3,
                   type_chosen_at_gate = $4,
                   hostel_block = $5,
                   room_number = $6,
                   warden_id = $7
             WHERE user_id = $8`,
            [
              hostellerSt,
              entryType,
              now,
              gateId,
              pending.pending_hostel_block,
              pending.pending_room_number,
              pending.pending_warden_id,
              user.id,
            ],
          );

          return {
            oldType: "day_scholar",
            newType: entryType,
            assignmentMaterialized: pending.ticket_number,
            messTokensRevoked: 0,
            messPrefsCleared: 0,
          };
        }

        // ── Unknown → new type (no prior stored type) ───────────────────
        if (!oldType) {
          const now = new Date().toISOString();
          const st = entryType === "day_scholar" ? dayScholarSt : hostellerSt;

          await client.query(
            `INSERT INTO student_details
               (user_id, current_entry_type, student_type, type_chosen_at, type_chosen_at_gate)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE SET
               current_entry_type = EXCLUDED.current_entry_type,
               student_type = EXCLUDED.student_type,
               type_chosen_at = EXCLUDED.type_chosen_at,
               type_chosen_at_gate = EXCLUDED.type_chosen_at_gate`,
            [user.id, entryType, st, now, gateId],
          );

          return {
            oldType: null,
            newType: entryType,
            assignmentMaterialized: null,
            messTokensRevoked: 0,
            messPrefsCleared: 0,
          };
        }

        throw Object.assign(
          new Error("Unexpected type transition"),
          { code: "UNEXPECTED_TRANSITION", status: 400 },
        );
      },
      { currentUserId: ctx.auth.userId, currentRole: ctx.auth.role },
    );
  } catch (err: any) {
    // Propagate known 409s (HOSTEL_ROOM_REQUIRED, ROOM_OCCUPIED) as-is.
    if (err?.code === "HOSTEL_ROOM_REQUIRED" || err?.code === "ROOM_OCCUPIED") {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.status ?? 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: err?.message ?? String(err) } },
      { status: 500 },
    );
  }

  // Audit the transition.
  await addAudit({
    action: "STUDENT_TYPE_CHANGED_AT_ENTRY",
    userId: ctx.auth.userId,
    userName: user.name,
    role: ctx.auth.role,
    details: JSON.stringify({
      studentUserId: user.id,
      oldType: transitionResult.oldType,
      newType: transitionResult.newType,
      buttonId,
      gateId,
      assignmentMaterialized: transitionResult.assignmentMaterialized,
      messTokensRevoked: transitionResult.messTokensRevoked,
      messPrefsCleared: transitionResult.messPrefsCleared,
    }),
  });

  return NextResponse.json({
    success: true,
    data: {
      studentUserId: user.id,
      entryType: transitionResult.newType,
      oldType: transitionResult.oldType,
      entryTypeWritten: true,
      gateId,
      assignmentMaterialized: transitionResult.assignmentMaterialized,
      messTokensRevoked: transitionResult.messTokensRevoked,
      messPrefsCleared: transitionResult.messPrefsCleared,
    },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 60,
});
