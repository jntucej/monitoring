// src/app/api/complaints/search/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return fail("VALIDATION_ERROR", "q required", 400);

  const { rows } = await query(
    `SELECT id, complaint_number AS "complaintNumber", title, status FROM public.complaints WHERE (complaint_number ILIKE $1 OR title ILIKE $1) AND deleted_at IS NULL LIMIT 20`,
    [`%${q}%`],
  );
  return ok({ results: rows });
}
export const GET = withAuthorization(handleGet);
