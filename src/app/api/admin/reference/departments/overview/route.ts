import { type NextRequest } from "next/server";
import { ok, fail } from "@/server/http/response";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  numeric_code: string | null;
  short_name: string | null;
  created_at: string;
  updated_at: string;
  user_count: number;
  student_count: number;
}

async function handler(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const res = await query<DepartmentRow>(
      `WITH dept_students AS (
         SELECT
           d.id AS dept_id,
           COUNT(DISTINCT sd.user_id) AS student_count
         FROM public.departments d
         JOIN public.student_details sd ON (
           sd.department = d.code
           OR sd.department = d.short_name
           OR (sd.department IS NULL AND sd.branch = d.code)
         )
         GROUP BY d.id
       ),
       dept_users AS (
         SELECT
           d.id AS dept_id,
           COUNT(DISTINCT u.id) AS user_count
         FROM public.departments d
         LEFT JOIN public.student_details sd ON (
           sd.department = d.code
           OR sd.department = d.short_name
           OR (sd.department IS NULL AND sd.branch = d.code)
         )
         JOIN public.users u ON (
           u.department_id = d.id::text
           OR u.department_id = d.code
           OR u.department_id = d.short_name
           OR u.id = sd.user_id
         )
         GROUP BY d.id
       )
       SELECT
         d.id,
         d.name,
         d.code,
         d.numeric_code,
         d.short_name,
         d.created_at,
         d.updated_at,
         COALESCE(du.user_count, 0)::int AS user_count,
         COALESCE(ds.student_count, 0)::int AS student_count
       FROM public.departments d
       LEFT JOIN dept_users du ON du.dept_id = d.id
       LEFT JOIN dept_students ds ON ds.dept_id = d.id
       ORDER BY d.name ASC`
    );

    const items = res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      numericCode: row.numeric_code,
      shortName: row.short_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userCount: row.user_count,
      studentCount: row.student_count,
      user_count: row.user_count,
      student_count: row.student_count,
    }));

    return ok({
      departments: items,
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export const GET = withRateLimit(
  withAuthorization(handler, { requiredRole: ["sysadmin", "admin"] }),
  { windowMs: 60000, maxRequests: 60 }
);
