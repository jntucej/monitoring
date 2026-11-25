import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const isApprover = ["admin", "sysadmin", "principal"].includes(auth.role);
  const { rows } = await query(
    isApprover
      ? `SELECT ar.*, u.name AS requester_name, u.unique_id AS requester_code, u.role AS current_role
           FROM public.access_requests ar
           JOIN public.users u ON u.id = ar.requester_id
          ORDER BY ar.created_at DESC LIMIT 50`
      : `SELECT ar.* FROM public.access_requests ar
          WHERE ar.requester_id = $1::uuid
          ORDER BY ar.created_at DESC LIMIT 20`,
    isApprover ? [] : [auth.userId],
  );
  return ok({ requests: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const requestedRole = String(b?.requested_role ?? "").trim();
  const resourceScope = b?.resource_scope ? String(b.resource_scope).trim() : null;
  const reason = String(b?.reason ?? "").trim();

  if (!requestedRole || !reason) {
    return fail("INVALID_INPUT", "requested_role and reason are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.access_requests (requester_id, requested_role, resource_scope, reason)
     VALUES ($1::uuid, $2, $3, $4)
     RETURNING *`,
    [auth.userId, requestedRole, resourceScope, reason],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "staff", "operator", "worker", "hod", "supervisor", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "faculty", "staff", "operator", "worker", "hod", "supervisor", "principal", "admin", "sysadmin"],
});
