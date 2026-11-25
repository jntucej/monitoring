import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { getActiveShift } from "@/lib/security/shift";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const gateId = parts[parts.length - 2];
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (auth.role === "operator") {
    const shift = await getActiveShift(auth.userId);
    if (!shift || shift.gate_id !== gateId) {
      return fail("FORBIDDEN", "Operator can only view logs for their assigned gate", 403);
    }
  }

  const { rows } = await query(
    `SELECT ml.id, ml.user_id, u.unique_id AS roll_no, u.name AS person_name,
            ml.direction, ml.category, ml.gate_id, ml.gate_name,
            ml.operator_name, ml.timestamp, ml.outcome, ml.curfew_violation, ml.is_manual
       FROM public.movement_logs ml
       LEFT JOIN public.users u ON u.id = ml.user_id
      WHERE ml.gate_id = $1::uuid
        AND ($2 = '' OR u.unique_id ILIKE '%' || $2 || '%' OR u.name ILIKE '%' || $2 || '%' OR ml.direction ILIKE '%' || $2 || '%')
      ORDER BY ml.timestamp DESC
      LIMIT 100`,
    [gateId, q],
  );

  return ok({ gate_id: gateId, logs: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["operator", "supervisor", "principal", "hod", "dean", "admin", "sysadmin"],
});
