// src/app/api/complaints/config/health/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

async function handleGet(_req: NextRequest) {
  try {
    await query(`SELECT 1 FROM public.complaints LIMIT 1`);
    return ok({ status: "healthy", db: "connected" });
  } catch (err) {
    return fail("DB_ERROR", (err as Error).message, 500);
  }
}
export const GET = withAuthorization(handleGet);
