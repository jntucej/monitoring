// src/app/api/complaints/analytics/domain-breakdown/route.ts
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
    `SELECT cc.domain, COUNT(c.id)::int AS count FROM public.complaint_categories cc LEFT JOIN public.complaints c ON c.category_code = cc.code AND c.deleted_at IS NULL GROUP BY cc.domain ORDER BY count DESC`,
  );
  return ok({ breakdown: rows });
}
export const GET = withAuthorization(handleGet);
