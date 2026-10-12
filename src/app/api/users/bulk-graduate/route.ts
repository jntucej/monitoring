/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getGraduationYearFromRoll, parseRollNumber } from "@/lib/rollNumber";
import { withAuthorization } from "@/middleware/authorization";
import { invalidateAuthCache } from "@/lib/authContext";

/**
 * POST /api/users/bulk-graduate
 *
 * Body: { rolls: string[], graduationYear?: number }
 *
 * Marks ACTIVE students as graduated in a single pass:
 *   - student_details.completed = TRUE, completed_at = <graduation year end of May>
 *   - users.status = 'DEPROVISIONED'
 *
 * Nothing is deleted — historical scan/attendance data is preserved; only the
 * active flag changes. Rolls are validated with the JNTUH 10-char schema;
 * unparseable or already-completed rolls are skipped (reported in the payload).
 *
 * Response: { success, processed, skipped }
 */
async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    if (actorRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sysadmin only" } },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const rolls: unknown = body?.rolls;
    if (!Array.isArray(rolls) || rolls.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Body must include a non-empty rolls array" } },
        { status: 400 }
      );
    }

    // Normalize + validate rolls against the JNTUH schema up front.
    const cleanRolls: string[] = [];
    for (const raw of rolls) {
      if (typeof raw === "string" && parseRollNumber(raw)) cleanRolls.push(raw.trim().toUpperCase());
    }
    if (cleanRolls.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No valid roll numbers supplied" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // 1) Find ACTIVE student users by roll (unique_id).
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id, name, role, status, unique_id")
      .eq("role", "student")
      .eq("status", "ACTIVE")
      .in("unique_id", cleanRolls);
    if (userErr) throw userErr;

    const userById = new Map<string, { id: string; name: string; roll: string }>(
      (users || []).map((u: any) => [u.id, { id: u.id, name: u.name, roll: u.unique_id }])
    );

    if (userById.size === 0) {
      return NextResponse.json({ success: true, processed: 0, skipped: cleanRolls.length, message: "No matching ACTIVE students found." });
    }

    const userIds = Array.from(userById.keys());

    // 2) Check which already have completed = TRUE (skip those).
    const { data: completedRows } = await supabase
      .from("student_details")
      .select("user_id")
      .in("user_id", userIds)
      .eq("completed", true);
    const alreadyCompleted = new Set((completedRows || []).map((c: any) => c.user_id));

    const targetIds = userIds.filter((id) => !alreadyCompleted.has(id));
    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: cleanRolls.length,
        message: "All matched students are already marked completed.",
      });
    }

    // 3) Compute completed_at: end of May of the graduation year.
    //    Per-roll when the caller didn't pin one (handles mixed cohorts).
    const pinnedYear = Number.isInteger(body?.graduationYear) ? (body.graduationYear as number) : null;

    const perRollYear = (roll: string) => {
      if (pinnedYear) return pinnedYear;
      return getGraduationYearFromRoll(roll) ?? new Date().getFullYear();
    };

    const completedAtByUser = new Map<string, string>();
    for (const uid of targetIds) {
      const rec = userById.get(uid)!;
      const year = perRollYear(rec.roll);
      // Graduation = May 31 of the graduation year (before the Jun/Jul AY boundary).
      completedAtByUser.set(uid, new Date(Date.UTC(year, 4, 31, 23, 59, 59)).toISOString());
    }

    // 4) Update student_details (completed + completed_at) for each target.
    const upsertRows = targetIds.map((uid) => ({
      user_id: uid,
      completed: true,
      completed_at: completedAtByUser.get(uid),
    }));
    // Chunk upserts (Supabase .in() pagination safety).
    const CHUNK = 200;
    let updatedDetails = 0;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      const slice = upsertRows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("student_details")
        .upsert(slice, { onConflict: "user_id" });
      if (error) throw error;
      updatedDetails += slice.length;
    }

    // 5) Deprovision the matching users (status flip only — history preserved).
    const deprovisionIds = targetIds;
    for (let i = 0; i < deprovisionIds.length; i += CHUNK) {
      const slice = deprovisionIds.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("users")
        .update({ status: "DEPROVISIONED", updated_at: new Date().toISOString() })
        .in("id", slice);
      if (error) throw error;
    }

    // 6) Revoke sessions + evict auth cache for affected users (best-effort).
    for (const uid of deprovisionIds) {
      try {
        await supabase
          .from("sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("user_id", uid)
          .is("revoked_at", null);
      } catch { /* sessions table optional */ }
      invalidateAuthCache(uid);
    }

    // 7) Audit entry.
    await addAudit({
      userId: actorId,
      action: "BULK_GRADUATE",
      details: {
        timestamp: new Date().toISOString(),
        requested: cleanRolls.length,
        processed: deprovisionIds.length,
        skipped: cleanRolls.length - deprovisionIds.length,
        graduationYear: pinnedYear,
        userRefs: deprovisionIds.map((id) => userById.get(id)).filter(Boolean),
      },
    });

    return NextResponse.json({
      success: true,
      processed: deprovisionIds.length,
      skipped: cleanRolls.length - deprovisionIds.length,
      message: `${deprovisionIds.length} students marked graduated and deprovisioned.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: "sysadmin" });
