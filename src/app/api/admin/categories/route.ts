import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";

/**
 * GET /api/admin/categories — live, DB-derived categories.
 *
 * The frontend must NEVER hardcode branch / hostel-block / gate / role lists:
 * new branches or blocks appear here automatically. Every value comes from a
 * distinct() over the real tables. Counts are real headcounts (students per
 * block, active gates, distinct in-service roles).
 *
 * Human identifiers only — codes (CSE/IT/…), gate codes, role slugs. No UUIDs.
 */
interface Cat<T> {
  code: T;
  name?: string;
  count: number;
}

async function handleGet(_req: NextRequest) {
  // Departments (live branch codes).
  const { rows: deptRows } = await query<{ code: string; name: string; students: number }>(
    `SELECT d.code, d.name,
            COUNT(sd.user_id) AS students
       FROM public.departments d
       LEFT JOIN public.student_details sd ON sd.department_id = d.code
      GROUP BY d.code, d.name
      ORDER BY students DESC, d.code`,
  ).catch(() => ({ rows: [] as { code: string; name: string; students: number }[] }));

  const departments: Cat<string>[] = deptRows.map((r) => ({
    code: r.code,
    name: r.name,
    count: Number(r.students),
  }));

  // Hostel blocks (distinct non-null, from student_details).
  const { rows: blockRows } = await query<{ block: string; students: number }>(
    `SELECT sd.hostel_block AS block, COUNT(*) AS students
       FROM public.student_details sd
      WHERE sd.hostel_block IS NOT NULL AND btrim(sd.hostel_block) <> ''
      GROUP BY 1
      ORDER BY students DESC, block`,
  ).catch(() => ({ rows: [] as { block: string; students: number }[] }));

  const hostelBlocks: Cat<string>[] = blockRows.map((r) => ({
    code: r.block,
    count: Number(r.students),
  }));

  // Gates (active, by code).
  const { rows: gateRows } = await query<{ code: string; name: string; active: number }>(
    `SELECT gate_code AS code, name,
            COUNT(*) FILTER (WHERE is_active) AS active
       FROM public.gates
      GROUP BY gate_code, name
      ORDER BY gate_code`,
  ).catch(() => ({ rows: [] as { code: string; name: string; active: number }[] }));

  const gates: Cat<string>[] = gateRows.map((r) => ({
    code: r.code,
    name: r.name,
    count: Number(r.active),
  }));

  // Roles (distinct in-service user roles + headcounts).
  const { rows: roleRows } = await query<{ role: string; headcount: number }>(
    `SELECT u.role, COUNT(*) AS headcount
       FROM public.users u
      WHERE u.status = 'ACTIVE'
      GROUP BY 1
      ORDER BY headcount DESC`,
  ).catch(() => ({ rows: [] as { role: string; headcount: number }[] }));

  const roles: Cat<string>[] = roleRows.map((r) => ({
    code: r.role,
    count: Number(r.headcount),
  }));

  return NextResponse.json({
    success: true,
    data: { departments, hostelBlocks, gates, roles },
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/admin/categories",
  auth: "user",
  requiredRole: ["sysadmin", "admin", "principal", "supervisor"],
  rateLimit: { keyPrefix: "categories", maxRequests: 30 },
});
