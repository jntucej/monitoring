// src/app/api/features/route.ts
// GET /api/features — read the `feature_flags` system setting.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";

async function handleGet(_req: NextRequest): Promise<Response> {
  const { rows } = await query<{ value: unknown }>(
    `SELECT value FROM public.system_settings WHERE id = 'feature_flags' LIMIT 1`,
  );
  return ok({ flags: (rows[0]?.value as Record<string, boolean>) ?? {} });
}

export const GET = withAuthorization(handleGet);
