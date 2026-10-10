import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus, setUserFlag, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import type { Role, AccountStatus } from "@/lib/types";
import type { FlagStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

const VALID_ROLES: Role[] = ["operator", "admin", "sysadmin", "parent", "student", "warden", "faculty", "staff"];
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

    // Admins cannot modify sysadmin accounts unless self
    if (!isSelf && actorRole === "admin" && (target.role === "sysadmin" || (body as any)?.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admins cannot modify sysadmin accounts" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();

        // 1. Basic profile fields
        const profileUpdates: Record<string, any> = {};
        if (body.name !== undefined) profileUpdates.name = body.name;
        if (body.email !== undefined) profileUpdates.email = body.email;
        if (body.phone !== undefined) profileUpdates.phone = body.phone;
        if (body.department !== undefined) profileUpdates.department_id = body.department;
        if (body.photoUrl !== undefined) profileUpdates.photo_url = body.photoUrl;
        if (body.uniqueId !== undefined) profileUpdates.unique_id = body.uniqueId;
        if (body.loginIdentifier !== undefined) profileUpdates.login_identifier = body.loginIdentifier;

        if (Object.keys(profileUpdates).length > 0) {
          const { error } = await supabase.from("users").update(profileUpdates).eq("id", id);
          if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // 2. Student details
        if (body.studentDetails || body.roll || body.year || body.hostelRoom) {
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

          if (Object.keys(studentUpdates).length > 0) {
            const { error } = await supabase
              .from("student_details")
              .upsert({ user_id: id, ...studentUpdates }, { onConflict: "user_id" });
            if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
            if (error) return NextResponse.json({ error: error.message }, { status: 400 });
          }
        }

        if (body.role && VALID_ROLES.includes(body.role as Role)) {
          updates.role = body.role;
        }
        if (body.account_status && VALID_STATUSES.includes(body.account_status as AccountStatus)) {
          updates.account_status = body.account_status;
        }
        if (body.flags && Array.isArray(body.flags)) {
          for (const flag of body.flags) {
            if (VALID_FLAGS.includes(flag)) {
              await setUserFlag(id, flag, actorId);
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from("users").update(updates).eq("id", id);
          if (error) {
            return NextResponse.json(
              { success: false, error: { code: "SERVER_ERROR", message: error.message } },
              { status: 500 }
            );
          }
          await addAudit({
            userId: actorId,
            action: "USER_UPDATED",
            details: { timestamp: new Date().toISOString(), targetId: id, updates },
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
    const { error } = await supabase.from("users").update({ account_status: "DEPROVISIONED" }).eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    await addAudit({
      userId: actorId,
      action: "USER_DEPROVISIONED",
      details: { timestamp: new Date().toISOString(), targetId: id },
    });

    return NextResponse.json({ success: true, message: "User deprovisioned" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: "sysadmin" });