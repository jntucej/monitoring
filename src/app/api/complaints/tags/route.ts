// src/app/api/complaints/tags/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query(`SELECT DISTINCT domain FROM public.complaint_categories WHERE is_active`);
  return ok({ tags: rows.map((r: any) => r.domain) });
}
export const GET = withAuthorization(handleGet);
