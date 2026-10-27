// src/app/api/complaints/watchlist/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT id, complaint_number AS "complaintNumber", title FROM public.complaints WHERE priority = 'critical' AND status NOT IN ('closed','rejected') AND deleted_at IS NULL LIMIT 50`);
  return ok({ watchlist: rows });
}
export const GET = withAuthorization(handleGet);
