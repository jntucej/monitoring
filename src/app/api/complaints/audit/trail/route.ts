// src/app/api/complaints/audit/trail/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const complaintId = new URL(req.url).searchParams.get("complaintId");
  if (!complaintId) return fail("VALIDATION_ERROR", "complaintId required", 400);

  const { rows } = await query(
    `SELECT id, action, user_id AS "userId", user_name AS "userName", user_role AS "userRole", details, timestamp FROM public.audit_logs WHERE details->>'complaintId' = $1 ORDER BY timestamp DESC LIMIT 100`,
    [complaintId],
  );
  return ok({ auditTrail: rows });
}
export const GET = withAuthorization(handleGet);
