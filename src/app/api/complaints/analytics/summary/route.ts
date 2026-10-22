// src/app/api/complaints/analytics/summary/route.ts
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
    `SELECT status, COUNT(*)::int AS count FROM public.complaints WHERE deleted_at IS NULL GROUP BY status`,
  );
  return ok({ summary: rows });
}
export const GET = withAuthorization(handleGet);
