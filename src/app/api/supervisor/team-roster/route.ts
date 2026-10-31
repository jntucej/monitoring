import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/supervisor/team-roster
 *
 * Returns every worker/security/staff member the supervisor oversees, with:
 *   - Staff category (security / maintenance / canteen / driver / office_staff)
 *   - Current gate (either assigned via users.gate_id or last scan)
 *   - In/out status from campus_occupancy
 *   - First-in time today
 *   - Photo + phone last-4 for quick contact
 *
 * Optional `?gateId=X` scopes to a single gate. Optional `?category=security`
 * filters by staff category.
 */
async function handleGet(req: NextRequest) {
  const gateFilter = req.nextUrl.searchParams.get("gateId");
  const categoryFilter = req.nextUrl.searchParams.get("category");

  const staffRoles = ["staff", "worker", "operator", "supervisor"];
  const params: unknown[] = [staffRoles];
  let whereGate = "";
  let whereCategory = "";

  if (gateFilter) {
    params.push(gateFilter);
    whereGate = ` AND COALESCE(co.last_gate_id, u.gate_id) = $${params.length}`;
  }
  if (categoryFilter && categoryFilter !== "all") {
    params.push(categoryFilter);
    whereCategory = ` AND ed.staff_category = $${params.length}`;
  }

  const { rows } = await query<{
    id: string;
    name: string;
    role: string;
    staff_category: string | null;
    designation: string | null;
    gate_id: string | null;
    gate_name: string | null;
    current_status: "IN" | "OUT" | null;
    first_in_time: string | null;
    photo_url: string | null;
    phone_tail: string | null;
  }>(
    `SELECT
       u.id, u.name, u.role,
       ed.staff_category, ed.designation,
       COALESCE(co.last_gate_id, u.gate_id) AS gate_id,
       g.name AS gate_name,
       co.current_status,
       (SELECT timestamp FROM movement_logs
        WHERE user_id = u.id AND direction = 'IN'
          AND timestamp::date = CURRENT_DATE
        ORDER BY timestamp ASC LIMIT 1) AS first_in_time,
       u.photo_url,
       RIGHT(COALESCE(u.phone, ''), 4) AS phone_tail
     FROM users u
     LEFT JOIN employee_details ed ON ed.user_id = u.id
     LEFT JOIN campus_occupancy co ON co.user_id = u.id
     LEFT JOIN gates g ON g.id = COALESCE(co.last_gate_id, u.gate_id)
     WHERE u.role = ANY($1)
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL
       ${whereGate}
       ${whereCategory}
     ORDER BY
       (ed.staff_category = 'security') DESC,
       g.name NULLS LAST,
       ed.staff_category NULLS LAST,
       u.name
     LIMIT 500`,
    params
  ).catch(() => ({ rows: [] }));

  // Group by category for the UI
  const groups: Record<string, Array<(typeof rows)[number]>> = {};
  for (const r of rows) {
    const k = r.staff_category ?? "other";
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  }

  return ok({
    workers: rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      staffCategory: r.staff_category ?? "other",
      designation: r.designation,
      gateId: r.gate_id,
      gateName: r.gate_name,
      status:
        r.current_status === "IN"
          ? "INSIDE"
          : r.current_status === "OUT"
          ? "OUTSIDE"
          : "ABSENT",
      firstInTime: r.first_in_time,
      photoUrl: r.photo_url,
      phoneTail: r.phone_tail,
    })),
    groups: Object.entries(groups).map(([category, list]) => ({
      category,
      count: list.length,
      onPost: list.filter((r) => r.current_status === "IN").length,
    })),
    totals: {
      total: rows.length,
      onPost: rows.filter((r) => r.current_status === "IN").length,
      absent: rows.filter((r) => r.current_status === null).length,
      securityOnDuty: rows.filter(
        (r) => r.staff_category === "security" && r.current_status === "IN"
      ).length,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
