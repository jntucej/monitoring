// src/app/api/complaints/config/features/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query(`SELECT value FROM public.system_settings WHERE id = 'feature_flags' LIMIT 1`);
  const flags = (rows[0]?.value as Record<string, boolean>) ?? {};
  return ok({ flags: { complaints: true, antiRagging: true, emergencySos: true, ...flags } });
}
export const GET = withAuthorization(handleGet);
