import { NextRequest, NextResponse } from "next/server";
import { findStudentByRoll, getStudentHistory, getStudentStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getRoll(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/");
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const roll = getRoll(req);
    // Authorization Check: Admins and SysAdmins can view any student record
    const isAllowedRole = ["admin", "sysadmin"].includes(auth.role || "");

    if (!isAllowedRole) {
      if (auth.role === "student") {
        if (auth.loginIdentifier !== roll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own student record." } },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to view student details." } },
          { status: 403 }
        );
      }
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } },
        { status: 404 }
      );
    }

    const status = await getStudentStatus(roll);
    const history = await getStudentHistory(roll, 20);

    return NextResponse.json({
      success: true,
      data: {
        student,
        campusStatus: status.status,
        lastScan: status.lastScan,
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student data" } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const roll = getRoll(req);
    if (!["admin", "sysadmin"].includes(auth.role || "")) {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseServiceClient();

    // 1. Update users profile
    const userUpdates: Record<string, any> = {};
    if (body.name !== undefined) userUpdates.name = body.name;
    if (body.email !== undefined) userUpdates.email = body.email;
    if (body.phone !== undefined) userUpdates.phone = body.phone;
    if (body.department !== undefined) userUpdates.department_id = body.department;
    if (body.status !== undefined) userUpdates.status = body.status;
    if (body.photoUrl !== undefined) userUpdates.photo_url = body.photoUrl;

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      await supabase.from("users").update(userUpdates).eq("id", student.id);
    }

    // 2. Update student_details
    const studentUpdates: Record<string, any> = {};
    if (body.year !== undefined) studentUpdates.year = body.year;
    if (body.section !== undefined) studentUpdates.section = body.section;
    if (body.batch !== undefined) studentUpdates.batch = body.batch;
    if (body.hostelBlock !== undefined) studentUpdates.hostel_block = body.hostelBlock;
    if (body.hostelRoom !== undefined) studentUpdates.room_number = body.hostelRoom;
    if (body.roomNumber !== undefined) studentUpdates.room_number = body.roomNumber;
    if (body.guardianId !== undefined) studentUpdates.guardian_id = body.guardianId;
    if (body.studentType !== undefined) studentUpdates.student_type = body.studentType;
    if (body.gender !== undefined) studentUpdates.gender = body.gender;

    if (Object.keys(studentUpdates).length > 0) {
      await supabase.from("student_details").upsert({ user_id: student.id, roll, ...studentUpdates }, { onConflict: "user_id" });
    }

    return NextResponse.json({ success: true, message: "Student updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update student" } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const roll = getRoll(req);
    const supabase = getSupabaseServiceClient();

    // 1. Locate the student
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, name, email, status")
      .eq("unique_id", roll)
      .eq("role", "student")
      .maybeSingle();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // 2. Check for historical data
    const [{ count: passCount }, { count: logCount }] = await Promise.all([
      supabase.from("gate_passes").select("id", { count: "exact", head: true }).or(`requested_by_id.eq.${user.id},guardian_approver_id.eq.${user.id},admin_approver_id.eq.${user.id}`),
      supabase.from("movement_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const hasHistory = (passCount ?? 0) > 0 || (logCount ?? 0) > 0;

    if (hasHistory) {
      // Soft delete
      await supabase
        .from("users")
        .update({ status: "DEPROVISIONED", updated_at: new Date().toISOString() })
        .eq("id", user.id);

      await addAudit({
        action: "USER_DEACTIVATED",
        userId: auth.userId,
        role: auth.role as Role,
        details: { target_user_id: user.id, roll, mode: "soft_delete", passes: passCount, movements: logCount },
        userName: auth.email
      });

      return NextResponse.json({
        success: true,
        mode: "soft_delete",
        message: `Account deactivated. ${passCount} passes and ${logCount} movements preserved.`,
      });
    }

    // 3. Hard delete
    if (user.id === '80eb29e3-7e71-48cb-a44c-6e0caa7f83f5') return NextResponse.json({ success: false, error: { message: "System core account cannot be deleted" } }, { status: 403 });
    const { error: delErr } = await supabase.from("users").delete().eq("id", user.id);

    await addAudit({
      action: "USER_DELETED",
      userId: auth.userId,
      role: auth.role as Role,
      details: { target_user_id: user.id, roll, mode: "hard_delete" },
      userName: auth.email
    });

    return NextResponse.json({ success: true, mode: "hard_delete" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to delete" } }, { status: 500 });
  }
}

export const GET = withRateLimit(withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "student"] }), { keyPrefix: "student_details", maxRequests: 100 });
export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin"] });
