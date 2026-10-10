import { NextRequest, NextResponse } from "next/server";
import { findStudentByRoll, getStudentHistory, getStudentStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * Extract the [roll] dynamic segment from the request URL.
 * This avoids needing Next.js route context which doesn't propagate
 * through our middleware wrappers.
 */
function getRoll(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/students/:roll
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(req: NextRequest, { auth }: { auth?: any } = {}) {
  try {
    const roll = getRoll(req);
    const authUserId = auth?.userId || req.headers.get("x-user-id");
    const authRole = auth?.role || req.headers.get("x-user-role");

    // Authorization Check: Admins and SysAdmins can view any student record
    const isAllowedRole = ["admin", "sysadmin"].includes(authRole || "");

    if (!isAllowedRole) {
      if (authRole === "student") {
        // Student must be accessing their own record.
        const service = getSupabaseServiceClient();
        const { data: profile, error } = await service
          .from("users")
          .select("unique_id")
          .eq("id", authUserId)
          .maybeSingle();
        if (error || !profile || profile.unique_id !== roll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own student record." } },
            { status: 403 }
          );
        }
      } else {
        // Other roles like operator, parent are forbidden.
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

async function handlePatch(req: NextRequest, { auth }: { auth?: any } = {}) {
  try {
    const roll = getRoll(req);
    const authRole = auth?.role || req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
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

async function handleDelete(req: NextRequest, { auth }: { auth?: any } = {}) {
  try {
    const roll = getRoll(req);
    const authRole = auth?.role || req.headers.get("x-user-role");
    if (authRole !== "sysadmin") {
      return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "SysAdmin access required to delete students" } }, { status: 403 });
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } }, { status: 404 });
    }

    const supabase = getSupabaseServiceClient();
    await supabase.from("users").update({ status: "DEPROVISIONED" }).eq("id", student.id);
    try {
      await supabase.auth.admin.deleteUser(student.id);
    } catch {}

    return NextResponse.json({ success: true, message: `Student ${roll} removed successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to delete student" } }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "student"] }),
  { keyPrefix: "student_details", maxRequests: 100 }
);

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin"] });
