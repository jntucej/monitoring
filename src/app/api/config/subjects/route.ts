"use client";
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { Subject } from "@/contracts/classes";

/** snake_case DB row from public.subjects. */
interface SubjectDbRow {
  code: string;
  label: string;
  department_id: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
}

/** Map a public.subjects row (snake_case) → contract Subject (camelCase). */
function toSubject(r: SubjectDbRow): Subject {
  return {
    code: r.code,
    label: r.label,
    departmentId: r.department_id,
    color: r.color,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  };
}

// READ — src/app/api/config/subjects/route.ts
// Contract: src/contracts/classes.ts  (faculty|hod|admin|student scope)
// Return all active subjects, optionally filtered by `?department=<code>`.
// Ordered by sort_order. The subjects table has no RLS, so reads are safe
// for any authenticated caller in the allowed roles.
export const GET = withRateLimit(
  withAuthorization(async (req: NextRequest, _ctx) => {
    try {
      const department = req.nextUrl.searchParams.get("department")?.trim();

      let sql = `SELECT code, label, department_id, color, sort_order, is_active
                   FROM public.subjects
                  WHERE is_active`;
      const params: string[] = [];

      if (department && department.length > 0) {
        params.push(department);
        sql += ` AND department_id = $1`;
      }

      sql += ` ORDER BY sort_order, code`;

      const { rows } = await query<SubjectDbRow>(sql, params);
      return ok(rows.map(toSubject));
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: ["faculty", "hod", "admin", "student", "sysadmin"] }),
  { keyPrefix: "subjects", maxRequests: 30, windowMs: 60_000 }
);
