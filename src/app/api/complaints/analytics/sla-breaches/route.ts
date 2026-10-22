// src/app/api/complaints/analytics/sla-breaches/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(
    `SELECT id, complaint_number AS "complaintNumber", category_code AS "categoryCode", current_owner_role AS "currentOwner", sla_deadline AS "slaDeadline" FROM public.complaints WHERE status IN ('submitted','acknowledged','assigned','in_progress') AND sla_deadline < NOW() AND deleted_at IS NULL LIMIT 100`,
  );
  return ok({ breaches: rows });
}
export const GET = withAuthorization(handleGet);
