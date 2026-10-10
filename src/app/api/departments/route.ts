/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getDepartments, createDepartment, deleteDepartment, updateDepartment } from "@/lib/departments";
import { invalidateCache } from "@/lib/cache";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handleGet() {
  const supabase = getSupabaseServiceClient();

  try {
    const dbDepts = await getDepartments();
    const deptNameMap = new Map<string, string>();
    dbDepts.forEach(d => {
      deptNameMap.set(d.code, d.name);
      if (d.numericCode) deptNameMap.set(d.numericCode, d.name);
    });

    const { data: users, error: usersError } = await supabase.from('users').select('id, department_id, role, name');
    if (usersError) throw usersError;

    const { data: employees } = await supabase.from('employee_details').select('user_id, department_id, is_hod');
    const { data: studentDetails } = await supabase.from('student_details').select('user_id, year');

    const studentYearMap = new Map<string, number | undefined>();
    (studentDetails || []).forEach((sd: any) => {
      studentYearMap.set(sd.user_id, sd.year);
    });

    const departmentsMap = new Map<string, any>();

    // Pre-populate with dbDepts
    dbDepts.forEach(d => {
      departmentsMap.set(d.code, {
        code: d.code,
        name: d.name,
        hod: d.hod || "Not Assigned",
        totalStudents: 0,
        facultyCount: 0,
        heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 },
      });
    });

    (users || []).forEach(u => {
      const dCode = u.department_id;
      if (!dCode) return;

      if (!departmentsMap.has(dCode)) {
        departmentsMap.set(dCode, {
          code: dCode,
          name: deptNameMap.get(dCode) || dCode,
          hod: "Not Assigned",
          totalStudents: 0,
          facultyCount: 0,
          heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 },
        });
      }
      const dept = departmentsMap.get(dCode);
      if (['student', 'HM', 'HF', 'DM', 'DF'].includes(u.role)) {
        dept.totalStudents++;
        const yr = studentYearMap.get(u.id);
        if (yr === 1) dept.heatmap.y1++;
        else if (yr === 2) dept.heatmap.y2++;
        else if (yr === 3) dept.heatmap.y3++;
        else if (yr === 4) dept.heatmap.y4++;
        else dept.heatmap.le++;
      } else if (u.role === 'faculty') {
        dept.facultyCount++;
      }
    });

    (employees || []).forEach(e => {
      if (!e.department_id) return;
      if (e.is_hod) {
        const u = (users || []).find(u => u.id === e.user_id);
        if (u) {
          const dept = departmentsMap.get(e.department_id);
          if (dept) dept.hod = u.name;
        }
      }
    });

    const results = Array.from(departmentsMap.values());

    return NextResponse.json({ success: true, data: results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json();
    const { code, name, numericCode, shortName, hodUserId } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: { message: "Department Code and Name are required" } }, { status: 400 });
    }

    const svc = getSupabaseServiceClient();

    // Check if exists
    const { data: existing } = await svc.from("departments").select("id").eq("code", code).maybeSingle();

    if (existing) {
        await updateDepartment(code, { name, numericCode, shortName });
    } else {
        await createDepartment({ code, name, numericCode, shortName });
    }

    // Reassign HOD
    if (hodUserId) {
      await svc.from("employee_details").update({ is_hod: false }).eq("department_id", code);
      await svc.from("employee_details").update({ is_hod: true, department_id: code }).eq("user_id", hodUserId);
    }

    await addAudit({
      action: "DEPARTMENT_UPSERT",
      userId: auth.userId,
      userName: auth.name,
      role: auth.role,
      details: `Saved department '${code}' (${name}).`,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Missing department code" } }, { status: 400 });
  }

  try {
    await deleteDepartment(code);
    await addAudit({
      action: "DEPARTMENT_DELETED",
      userId: auth.userId,
      userName: auth.email,
      role: auth.role,
      details: `Deleted department ${code}`,
    });
    return NextResponse.json({ success: true, message: `Deleted department ${code}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 400 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin"] });

export const GET = withAuthorization(handleGet);
