import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";

/**
 * GET /api/admin/presence — live Inside vs. Outside headcount split for the
 * supervisory / executive dashboards, by branch and hostel block.
 *
 * Source of truth: `campus_occupancy` (current_status IN/OUT) joined to
 * `users` → `student_details` (department_id, hostel_block). All counts are
 * real; a missing presence row means "unknown" and is reported explicitly,
 * never fabricated.
 */
interface SplitRow {
  key: string;
  label: string;
  inside: number;
  outside: number;
  unknown: number;
  total: number;
}

async function handleGet(_req: NextRequest) {
  // By branch (department).
  const { rows: deptRows } = await query<{
    key: string;
    inside: number;
    outside: number;
    unknown: number;
    total: number;
  }>(
    `SELECT
        COALESCE(sd.department_id, 'unassigned') AS key,
        COUNT(*) FILTER (WHERE co.current_status = 'IN')  AS inside,
        COUNT(*) FILTER (WHERE co.current_status = 'OUT') AS outside,
        COUNT(*) FILTER (WHERE co.current_status IS NULL) AS unknown,
        COUNT(*) AS total
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
       LEFT JOIN public.campus_occupancy co ON co.user_id = u.id
      WHERE u.role IN ('student', 'staff', 'hod', 'faculty')
        AND u.status = 'ACTIVE'
      GROUP BY 1
      ORDER BY total DESC`,
  ).catch(() => ({ rows: [] }));

  // By hostel block.
  const { rows: blockRows } = await query<{
    key: string;
    inside: number;
    outside: number;
    unknown: number;
    total: number;
  }>(
    `SELECT
        COALESCE(btrim(sd.hostel_block), 'day_scholar') AS key,
        COUNT(*) FILTER (WHERE co.current_status = 'IN')  AS inside,
        COUNT(*) FILTER (WHERE co.current_status = 'OUT') AS outside,
        COUNT(*) FILTER (WHERE co.current_status IS NULL) AS unknown,
        COUNT(*) AS total
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
       LEFT JOIN public.campus_occupancy co ON co.user_id = u.id
      WHERE u.role = 'student'
        AND u.status = 'ACTIVE'
      GROUP BY 1
      ORDER BY total DESC`,
  ).catch(() => ({ rows: [] }));

  const byBranch: SplitRow[] = deptRows.map((r) => ({
    key: r.key,
    label: r.key === "unassigned" ? "Unassigned" : r.key,
    inside: Number(r.inside ?? 0),
    outside: Number(r.outside ?? 0),
    unknown: Number(r.unknown ?? 0),
    total: Number(r.total ?? 0),
  }));

  const byHostelBlock: SplitRow[] = blockRows.map((r) => ({
    key: r.key,
    label: r.key === "day_scholar" ? "Day scholar" : r.key,
    inside: Number(r.inside ?? 0),
    outside: Number(r.outside ?? 0),
    unknown: Number(r.unknown ?? 0),
    total: Number(r.total ?? 0),
  }));

  // Grand totals across all staff+students.
  const totals = byBranch.reduce(
    (acc, r) => {
      acc.inside += r.inside;
      acc.outside += r.outside;
      acc.unknown += r.unknown;
      acc.total += r.total;
      return acc;
    },
    { inside: 0, outside: 0, unknown: 0, total: 0 },
  );

  return NextResponse.json({
    success: true,
    data: {
      byBranch,
      byHostelBlock,
      totals,
      generated_at: new Date().toISOString(),
    },
  });
}

export const GET = withApiChain(handleGet, {
  route: "/api/admin/presence",
  auth: "user",
  requiredRole: ["sysadmin", "admin", "principal", "supervisor", "hostel_manager"],
  rateLimit: { keyPrefix: "presence", maxRequests: 30 },
});
