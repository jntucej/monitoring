import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";

export async function GET() {
  const supabase = getSupabaseServiceClient();

  const DEFAULT_DEPT_NAMES: Record<string, string> = {
    "01": "Computer Science & Engineering",
    "02": "Information Technology",
    "03": "Electronics & Communication Engineering",
    "04": "Electrical & Electronics Engineering",
    "05": "Mechanical Engineering",
    "06": "Civil Engineering",
    "CSE": "Computer Science & Engineering",
    "IT": "Information Technology",
    "ECE": "Electronics & Communication Engineering",
    "EEE": "Electrical & Electronics Engineering",
    "ME": "Mechanical Engineering",
    "CIVIL": "Civil Engineering"
  };

  try {
    const { data: dbDepts } = await supabase.from('departments').select('*');
    const deptNameMap = new Map<string, string>();
    if (dbDepts && dbDepts.length > 0) {
      dbDepts.forEach((d: any) => {
        deptNameMap.set(d.code, d.name);
      });
    }

    const { data: users, error: usersError } = await supabase.from('users').select('id, department_id, role, name');
    if (usersError) throw usersError;

    const { data: employees } = await supabase.from('employee_details').select('user_id, department_id, is_hod');
    const { data: studentDetails } = await supabase.from('student_details').select('user_id, year');

    const studentYearMap = new Map<string, number | undefined>();
    (studentDetails || []).forEach((sd: any) => {
      studentYearMap.set(sd.user_id, sd.year);
    });

    const departmentsMap = new Map<string, any>();

    // Pre-populate with dbDepts if available
    if (dbDepts && dbDepts.length > 0) {
      dbDepts.forEach((d: any) => {
        departmentsMap.set(d.code, {
          code: d.code,
          name: d.name,
          hod: "Not Assigned",
          totalStudents: 0,
          facultyCount: 0,
          heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 },
        });
      });
    }

    (users || []).forEach(u => {
      const dCode = u.department_id;
      if (!dCode) return;

      if (!departmentsMap.has(dCode)) {
        departmentsMap.set(dCode, {
          code: dCode,
          name: deptNameMap.get(dCode) || DEFAULT_DEPT_NAMES[dCode] || dCode,
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

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
