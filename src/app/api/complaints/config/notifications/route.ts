// src/app/api/complaints/config/notifications/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(`SELECT id, type, title, recipient_type AS "recipientType", created_at AS "createdAt" FROM public.notifications WHERE type LIKE '%complaint%' ORDER BY created_at DESC LIMIT 50`);
  return ok({ recentNotifications: rows });
}
export const GET = withAuthorization(handleGet);
