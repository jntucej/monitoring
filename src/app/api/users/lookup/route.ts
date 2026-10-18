import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";

export interface LookupResult {
  found: boolean;
  id?: string;
  name?: string;
  email?: string;
  uniqueId?: string;
  roll?: string | null;
  employeeId?: string | null;
  role?: string;
  status?: string;
  department?: { code: string; name: string } | null;
  isHodOfDepartment?: string | null;
  eligible?: boolean;
  reason?: string;
  willTransferFrom?: { code: string; name: string } | null;
}

async function handleGet(req: NextRequest) {
  const id = (new URL(req.url).searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { found: false, reason: "ID is required" } satisfies LookupResult,
      { status: 400 }
    );
  }

  const { rows } = await query<{
    id: string;
    name: string;
    unique_id: string;
    email: string;
    role: string;
    status: string;
    department_id: string | null;
    department_name: string | null;
    roll: string | null;
    employee_id: string | null;
    is_hod_of: string | null;
  }>(
    `
      SELECT
        u.id, u.name, u.unique_id, u.email, u.role, u.status,
        u.department_id,
        d.name       AS department_name,
        sd.roll,
        ed.employee_id,
        CASE WHEN u.role = 'hod' THEN u.department_id ELSE NULL END AS is_hod_of
      FROM users u
      LEFT JOIN student_details sd ON sd.user_id = u.id
      LEFT JOIN employee_details ed ON ed.user_id = u.id
      LEFT JOIN departments d ON d.code = u.department_id
      WHERE (
        UPPER(sd.roll) = UPPER($1)
        OR UPPER(ed.employee_id) = UPPER($1)
        OR UPPER(u.unique_id) = UPPER($1)
        OR LOWER(u.email) = LOWER($1)
      )
      LIMIT 1
    `,
    [id]
  );

  const r = rows[0];
  if (!r) {
    return NextResponse.json({
      found: false,
      reason: `No user with ID "${id}"`,
    } satisfies LookupResult);
  }

  const base: LookupResult = {
    found: true,
    id: r.id,
    name: r.name,
    email: r.email,
    uniqueId: r.unique_id,
    roll: r.roll,
    employeeId: r.employee_id,
    role: r.role,
    status: r.status,
    department: r.department_id
      ? { code: r.department_id, name: r.department_name ?? r.department_id }
      : null,
    isHodOfDepartment: r.is_hod_of,
  };

  if (r.status !== "ACTIVE") {
    return NextResponse.json({
      ...base,
      eligible: false,
      reason: `Account is ${r.status.toLowerCase()}`,
    } satisfies LookupResult);
  }
  if (r.role === "student") {
    return NextResponse.json({
      ...base,
      eligible: false,
      reason: "Students cannot be assigned as HOD",
    } satisfies LookupResult);
  }
  if (!["faculty", "staff", "hod"].includes(r.role)) {
    return NextResponse.json({
      ...base,
      eligible: false,
      reason: `Role "${r.role}" is not eligible for HOD`,
    } satisfies LookupResult);
  }

  if (r.role === "hod" && r.department_id) {
    return NextResponse.json({
      ...base,
      eligible: true,
      willTransferFrom: {
        code: r.department_id,
        name: r.department_name ?? r.department_id,
      },
    } satisfies LookupResult);
  }

  return NextResponse.json({ ...base, eligible: true } satisfies LookupResult);
}

export const GET = withAuthorization(handleGet, { requiredRole: "admin" });
