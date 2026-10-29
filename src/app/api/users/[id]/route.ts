/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus, setUserFlag, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { hashPassword } from "@/lib/auth-token";
import { assertPasswordPolicy } from "@/server/policy/passwords";
import { query } from "@/lib/postgres";
import type { Role, AccountStatus } from "@/lib/types";
import type { FlagStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { invalidateAuthCache } from "@/lib/authContext";

const VALID_ROLES: (Role | string)[] = ["operator", "admin", "sysadmin", "supervisor", "guardian", "parent", "hod", "student", "faculty", "staff", "worker", "visitor", "caretaker", "deputy_warden", "hostel_manager", "principal", "vice_principal", "oie", "exam_branch"];
const VALID_STATUSES: AccountStatus[] = ["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"];
const VALID_FLAGS: Array<FlagStatus> = ["OVERDUE", "UNAUTHORIZED_EXIT", "NO_GATE_PASS", "SUSPENDED", "CURFEW_VIOLATION", "MANUAL_LOCKDOWN"]; // null handled separately in setUserFlag

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

/** PATCH /api/users/[id] update user profile administrative settings. */
async function handlePatch(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const isSelf = actorId === id;
    const isAdmin = actorRole === "admin" || actorRole === "sysadmin";

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const target = await findUserById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const { role, status, pin, password, flagStatus, flag_status, flags } = body || {};

    if ((flagStatus !== undefined || flag_status !== undefined || flags !== undefined) && !["admin", "sysadmin", "principal"].includes(actorRole)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only administrators and principal can flag or suspend accounts" } },
        { status: 403 }
      );
    }

    // Admins cannot modify sysadmin accounts unless self
    if (!isSelf && actorRole === "admin" && (target.role === "sysadmin" || (body as any)?.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admins cannot modify sysadmin accounts" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();

    if (body && typeof body === "object") {
      // Basic profile fields
      const profileUpdates: Record<string, any> = {};
      if (body.name !== undefined) profileUpdates.name = body.name;
      if (body.email !== undefined) profileUpdates.email = body.email;
      if (body.phone !== undefined) profileUpdates.phone = body.phone;
      if (body.department !== undefined) profileUpdates.department_id = body.department;
      // Direct department assignment (sysadmin assigning a branch to a HOD, etc.)
      if (body.department_id !== undefined) profileUpdates.department_id = body.department_id === "" ? null : body.department_id;
      if (body.photoUrl !== undefined) profileUpdates.photo_url = body.photoUrl;
      if (body.uniqueId !== undefined) profileUpdates.unique_id = body.uniqueId;
      if (body.loginIdentifier !== undefined) profileUpdates.login_identifier = body.loginIdentifier;

      // Gate assignment (sysadmin/admin only — operators can't reassign themselves)
      if (isAdmin && body.gateId !== undefined) {
        const gid = body.gateId;
        if (typeof gid !== "string" && gid !== null) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_GATE_ID", message: "gateId must be a UUID or null" } },
            { status: 400 }
          );
        }
        if (gid !== null) {
          // Validate the gate exists and is active
          const gateRes = await query<{ id: string; is_active: boolean }>(
            `SELECT id, is_active FROM public.gates WHERE id = $1`,
            [gid]
          );
          const gate = gateRes.rows[0];
          if (!gate) {
            return NextResponse.json(
              { success: false, error: { code: "GATE_NOT_FOUND", message: `Gate ${gid} does not exist.` } },
              { status: 404 }
            );
          }
          if (!gate.is_active) {
            return NextResponse.json(
              { success: false, error: { code: "GATE_INACTIVE", message: `Gate ${gid} is not active.` } },
              { status: 400 }
            );
          }
        }
        profileUpdates.gate_id = gid || null;
      }

      // Designate kiosk default operator (admin/sysadmin only)
      if (isAdmin && body.isKioskDefault !== undefined) {
        if (typeof body.isKioskDefault !== "boolean") {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_FLAG", message: "isKioskDefault must be a boolean" } },
            { status: 400 }
          );
        }
        if (body.isKioskDefault) {
          // Only operators can be kiosk defaults
          if (target.role !== "operator") {
            return NextResponse.json(
              { success: false, error: { code: "NOT_OPERATOR", message: "Only operator accounts can be designated as kiosk default." } },
              { status: 400 }
            );
          }
          // Clear the flag from all other users first (single-flag invariant)
          await supabase.from("users").update({ is_kiosk_default: false }).neq("id", id);
        }
        profileUpdates.is_kiosk_default = body.isKioskDefault;
      }

      // B2: supervisor's supervised_gates + hostel manager / caretaker's
      // assigned_hostel — elevated fields, admin/sysadmin only. Without this,
      // these fields can only be set at account creation, so scoping a
      // supervisor or hostel staff after the fact was impossible.
      if (isAdmin && body.supervisedGates !== undefined) {
        const ok =
          body.supervisedGates === null ||
          (Array.isArray(body.supervisedGates) &&
            body.supervisedGates.every((g: unknown) => typeof g === "string"));
        if (!ok) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_SUPERVISED_GATES", message: "supervisedGates must be null or an array of gate UUIDs" } },
            { status: 400 }
          );
        }
        profileUpdates.supervised_gates = body.supervisedGates === null ? null : body.supervisedGates;
      }

      if (isAdmin && body.assignedHostel !== undefined) {
        if (body.assignedHostel !== null && typeof body.assignedHostel !== "string") {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_ASSIGNED_HOSTEL", message: "assignedHostel must be a string or null" } },
            { status: 400 }
          );
        }
        profileUpdates.assigned_hostel = body.assignedHostel;
      }

      // Password update — admin-set password is an initial credential, so it
      // must be rotated by the target on next use (password_must_change flag).
      if (body.password) {
        if (typeof body.password !== "string") {
          return NextResponse.json(
            { success: false, error: { message: "Password must be a string" } },
            { status: 400 }
          );
        }
        try {
          assertPasswordPolicy(body.password);
        } catch (e) {
          return NextResponse.json(
            { success: false, error: { message: e instanceof Error ? e.message : "Password does not meet policy." } },
            { status: 400 }
          );
        }
        profileUpdates.password_hash = await hashPassword(body.password);
        profileUpdates.password_must_change = true;
        profileUpdates.last_password_change = new Date().toISOString();
        profileUpdates.failed_login_count = 0;
        profileUpdates.locked_until = null;
      }

      // Security PIN update
      if (body.pin) {
        if (typeof body.pin !== "string" || !/^\d{4,8}$/.test(body.pin.trim())) {
          return NextResponse.json(
            { success: false, error: { message: "Security PIN must be 4-8 digits" } },
            { status: 400 }
          );
        }
        profileUpdates.pin_hash = await hashPassword(body.pin.trim());
        profileUpdates.pin_must_change = false;
        profileUpdates.pin_set_at = new Date().toISOString();
        if (actorId) profileUpdates.pin_set_by = actorId;
      }

      // Explicit unlock or status recovery
      if (body.unlock || (body.status === "ACTIVE" && target.status !== "ACTIVE")) {
        profileUpdates.failed_login_count = 0;
        profileUpdates.locked_until = null;
      }

      // Bump session_version when credentials change — immediately
      // invalidates every existing JWT (login & PIN login tokens embed the
      // current session_version; authContext rejects tokens whose version
      // no longer matches the DB row).
      const credentialsChanged = Boolean(body.password || body.pin);
      if (credentialsChanged) {
        profileUpdates.session_version = ((target as any).session_version ?? 0) + 1;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase.from("users").update(profileUpdates).eq("id", id);
        if (error) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
      }

      // Clear rate-limiting pin login attempts if password/pin updated or unlocked
      if (body.password || body.unlock || body.pin) {
        const idents = Array.from(new Set([
          target.uniqueId,
          target.email,
          target.identifier,
          profileUpdates.unique_id,
          profileUpdates.email,
        ].filter(Boolean)));

        for (const ident of idents) {
          await query(
            `DELETE FROM pin_login_attempts WHERE UPPER(identifier) = UPPER($1)`,
            [ident]
          );
        }
      }

      // When credentials change, also revoke any rows in the sessions table
      // (Supabase-Auth style deployments) and evict the cached user row so
      // the bumped session_version is enforced on the very next request.
      // Failure is non-fatal — session_version already invalidates every
      // existing JWT issued before this write.
      if (credentialsChanged) {
        await query(
          `UPDATE public.sessions
              SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL`,
          [id]
        ).catch(() => null);
        invalidateAuthCache(id);
      }

      // 2. Student details
      if (body.studentDetails || body.roll || body.year || body.hostelRoom || body.completed !== undefined || body.completedAt !== undefined) {
        const sd = body.studentDetails ?? body;
        const studentUpdates: Record<string, any> = {};
        if (sd.roll !== undefined) studentUpdates.roll = sd.roll;
        if (sd.year !== undefined) studentUpdates.year = sd.year;
        if (sd.section !== undefined) studentUpdates.section = sd.section;
        if (sd.batch !== undefined) studentUpdates.batch = sd.batch;
        if (sd.hostelBlock !== undefined) studentUpdates.hostel_block = sd.hostelBlock;
        if (sd.hostelRoom !== undefined) studentUpdates.room_number = sd.hostelRoom;
        if (sd.roomNumber !== undefined) studentUpdates.room_number = sd.roomNumber;
        if (sd.guardianId !== undefined) studentUpdates.guardian_id = sd.guardianId;
        if (sd.studentType !== undefined) studentUpdates.student_type = sd.studentType;
        if (sd.gender !== undefined) studentUpdates.gender = sd.gender;
        if (sd.wardenId !== undefined) studentUpdates.warden_id = sd.wardenId;
        // Graduation flag: completed=TRUE + completed_at for passed-out students.
        if (sd.completed !== undefined) studentUpdates.completed = sd.completed;
        if (sd.completedAt !== undefined) studentUpdates.completed_at = sd.completedAt;

        if (Object.keys(studentUpdates).length > 0) {
          const { error } = await supabase
            .from("student_details")
            .upsert({ user_id: id, ...studentUpdates }, { onConflict: "user_id" });
          if (error) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
        }
      }

      // 2b. Graduation / alumni fields (student_details.completed + completed_at).
      // Accepted on both the flat body and a nested studentDetails object.
      // Only admins/sysadmins may flip graduation state (it implies deprovisioning).
      const flatCompleted = body.completed;
      const flatCompletedAt = body.completedAt;
      const sdCompleted = body.studentDetails?.completed;
      const sdCompletedAt = body.studentDetails?.completedAt;
      if (flatCompleted !== undefined || flatCompletedAt !== undefined || sdCompleted !== undefined || sdCompletedAt !== undefined) {
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "Only administrators can mark graduation state" } },
            { status: 403 }
          );
        }
        const completion: Record<string, any> = { user_id: id };
        if (sdCompleted !== undefined) completion.completed = sdCompleted;
        else if (flatCompleted !== undefined) completion.completed = flatCompleted;
        if (sdCompletedAt !== undefined) completion.completed_at = sdCompletedAt;
        else if (flatCompletedAt !== undefined) completion.completed_at = flatCompletedAt;

        const { error } = await supabase
          .from("student_details")
          .upsert(completion, { onConflict: "user_id" });
        if (error) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });

        // Marking a student completed implies they have left campus: deprovision
        // the account unless the caller explicitly wants to keep it active.
        const completedFlag = completion.completed;
        if (completedFlag === true) {
          const explicitStatus = body.status || body.account_status;
          const targetStatus: AccountStatus = explicitStatus && VALID_STATUSES.includes(explicitStatus)
            ? explicitStatus
            : "DEPROVISIONED";
          if (target.status !== "ACTIVE") {
            await updateAccountStatus(id, targetStatus);
          }
        }
      }

      // 3. Employee details
      if (body.employeeDetails || body.designation || body.staffCategory) {
        const ed = body.employeeDetails ?? body;
        const empUpdates: Record<string, any> = {};
        if (ed.employeeId !== undefined) empUpdates.employee_id = ed.employeeId;
        if (ed.designation !== undefined) empUpdates.designation = ed.designation;
        if (ed.departmentId !== undefined) empUpdates.department_id = ed.departmentId;
        if (ed.isHod !== undefined) empUpdates.is_hod = ed.isHod;
        if (ed.staffCategory !== undefined) empUpdates.staff_category = ed.staffCategory;

        if (Object.keys(empUpdates).length > 0) {
          const { error } = await supabase
            .from("employee_details")
            .upsert({ user_id: id, ...empUpdates }, { onConflict: "user_id" });
          if (error) return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
        }
      }

      if (isAdmin && (body.hostelScope === "boys" || body.hostelScope === "girls" || body.hostelScope === "both")) {
      const db = getSupabaseServiceClient();
      await db.from("users").update({ hostel_scope: body.hostelScope }).eq("id", id);
 }

    if (body.role && VALID_ROLES.includes(body.role as Role)) {
        await updateUserRole(id, body.role as Role, actorId);
      }
      if (body.status || body.account_status) {
        const targetStatus = (body.status || body.account_status) as AccountStatus;
        if (VALID_STATUSES.includes(targetStatus)) {
          await updateAccountStatus(id, targetStatus);
        }
      }
      if (body.flags && Array.isArray(body.flags)) {
        for (const flag of body.flags) {
          if (VALID_FLAGS.includes(flag)) {
            await setUserFlag(id, flag, actorId);
          }
        }
      }
      if (body.flagStatus !== undefined || body.flag_status !== undefined) {
        const rawFlag = body.flagStatus !== undefined ? body.flagStatus : body.flag_status;
        if (rawFlag === null || rawFlag === "" || rawFlag === "NONE") {
          await setUserFlag(id, null, actorId);
        } else if (typeof rawFlag === "string") {
          const upper = rawFlag.toUpperCase() as FlagStatus;
          if (VALID_FLAGS.includes(upper)) {
            await setUserFlag(id, upper, actorId);
          } else if (rawFlag === "suspicious" || rawFlag === "FLAGGED") {
            await setUserFlag(id, "MANUAL_LOCKDOWN", actorId);
          }
        }
      }

      await addAudit({
        userId: actorId,
        action: "USER_UPDATED",
        details: { timestamp: new Date().toISOString(), targetId: id, updates: body, sessions_revoked: credentialsChanged, kiosk_default_changed: body.isKioskDefault !== undefined },
      });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

/** DELETE /api/users/[id] deprovision user (sysadmin only). */
async function handleDelete(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    if (!actorId || actorRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sysadmin only" } },
        { status: 403 }
      );
    }

    const target = await findUserById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (target.role === "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot delete sysadmin" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // Check for historical data (passes, movements)
    const [{ count: passCount }, { count: logCount }] = await Promise.all([
      supabase.from("gate_passes").select("id", { count: "exact", head: true }).or(`requested_by_id.eq.${id},guardian_approver_id.eq.${id},admin_approver_id.eq.${id}`),
      supabase.from("movement_logs").select("id", { count: "exact", head: true }).eq("user_id", id),
    ]);

    const hasHistory = (passCount ?? 0) > 0 || (logCount ?? 0) > 0;

    if (hasHistory) {
      await supabase
        .from("users")
        .update({ status: "DEPROVISIONED", updated_at: new Date().toISOString() })
        .eq("id", id);

      await supabase.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("user_id", id).is("revoked_at", null);

      await addAudit({
        userId: actorId,
        action: "USER_DEACTIVATED",
        details: { targetId: id, mode: "soft_delete", passes: passCount, movements: logCount },
      });

      return NextResponse.json({ success: true, mode: "soft_delete", message: `Staff member deactivated (has ${passCount} passes and ${logCount} movements).` });
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    try {
      await supabase.auth.admin.deleteUser(id);
    } catch {
      // Ignore if auth user doesn't exist
    }

    await addAudit({
      userId: actorId,
      action: "USER_DELETED",
      details: { timestamp: new Date().toISOString(), targetId: id, mode: "hard_delete" },
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: "sysadmin" });