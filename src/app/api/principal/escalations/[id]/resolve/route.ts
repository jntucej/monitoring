// PR-12 — /api/principal/escalations/:id/resolve
import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

import type { Role } from "@/lib/types";
const WRITE_ROLES: Role[] = ["principal", "admin", "sysadmin"];

async function impl(req: NextRequest, ctx: { auth: AuthContext }) {
  const auth = ctx.auth;
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const id = segments[3] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("BAD_REQUEST", "Escalation id must be a uuid", 400);
  const body = await req.json().catch(() => null);
  const status = (body?.status ?? "RESOLVED") as "RESOLVED" | "DISMISSED";
  if (!["RESOLVED", "DISMISSED"].includes(status)) return fail("BAD_REQUEST", "status must be RESOLVED or DISMISSED", 400);
  try {
    const { rows } = await query(
      `UPDATE public.escalations SET status = $2, resolved_by = $3, resolved_at = now()
        WHERE id = $1 AND status = 'OPEN'
       RETURNING id, case_id, reason, severity, status, created_at`,
      [id, status, auth.userId],
    );
    if (rows.length === 0) return fail("NOT_FOUND", "Escalation not found or already resolved", 404);
    return ok({ escalation: rows[0] });
  } catch (e) {
    return fail("INTERNAL", e instanceof Error ? e.message : "Failed to resolve escalation", 500);
  }
}

export const POST = withMutationGuard(impl, { requiredRole: WRITE_ROLES });
