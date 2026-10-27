// src/app/api/complaints/notices/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query(
    `SELECT id, title, content, created_at AS "createdAt" FROM public.announcements WHERE category = 'complaint_notice' OR category = 'general' ORDER BY created_at DESC LIMIT 10`,
  );
  return ok({ notices: rows });
}
export const GET = withAuthorization(handleGet);
