// src/app/api/complaints/config/permissions/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT code, display_name AS "displayName", is_privileged AS "isPrivileged" FROM public.config_roles_registry WHERE is_active`);
  return ok({ roles: rows });
}
export const GET = withAuthorization(handleGet);
