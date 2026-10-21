// src/app/api/complaints/config/routing/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT category_code AS "categoryCode", position, role, sla_hours AS "slaHours" FROM public.complaint_escalation_chains ORDER BY category_code, position`);
  return ok({ chains: rows });
}
export const GET = withAuthorization(handleGet);
