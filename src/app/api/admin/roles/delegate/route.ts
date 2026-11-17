// /api/admin/roles/delegate/route.ts
// Time-bound delegation (STEP 3.9 / JNTUH_CEJ_ROLE_HIERARCHY control 7):
// admin/sysadmin grant a delegatee a role for a window + scope. The
// delegatee acts through resolveEffectiveRole (entityAuthorization.ts)
// — the delegation id is carried into the audit trail.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    delegateeId?: string;
    role?: string;
    scopeEntity?: string | null;
    startsAt?: string;
    expiresAt?: string;
    canMutate?: boolean;
    note?: string;
  } | null;
  if (!body?.delegateeId || !body.role) {
    return fail("VALIDATION_ERROR", "delegateeId and role are required", 400);
  }
  if (!body.expiresAt || new Date(body.expiresAt).getTime() <= Date.now()) {
    return fail("VALIDATION_ERROR", "expiresAt must be in the future", 400);
  }
  const startsAt = body.startsAt ? new Date(body.startsAt).toISOString() : new Date().toISOString();

  const { rows } = await query(
    `INSERT INTO public.delegations
       (delegator_id, delegatee_id, role, scope_entity, can_mutate,
        starts_at, expires_at, note, approved_by)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $1)
     RETURNING id, expires_at`,
    [auth.userId, body.delegateeId, body.role, body.scopeEntity ?? null,
     body.canMutate ?? false, startsAt, body.expiresAt, body.note?.trim() || null],
  );

  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "role_delegation_grant",
    resource: "delegations", resourceId: rows[0].id,
    afterState: { delegateeId: body.delegateeId, role: body.role,
                  scopeEntity: body.scopeEntity ?? null, canMutate: body.canMutate ?? false,
                  expiresAt: body.expiresAt },
  });
  return ok({ delegationId: rows[0].id, expiresAt: rows[0].expires_at });
}

// GET — list active delegations (admin/sysadmin; a delegatee can see their own).
async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const mine = req.nextUrl.searchParams.get("mine") === "true";
  const { rows } = mine
    ? await query(`SELECT id, delegator_id, role, scope_entity, can_mutate,
                          starts_at, expires_at, revoked_at, note
                     FROM public.delegations
                    WHERE delegatee_id = $1 AND revoked_at IS NULL
                    ORDER BY expires_at DESC LIMIT 50`, [auth.userId])
    : await query(`SELECT id, delegator_id, delegatee_id, role, scope_entity, can_mutate,
                          starts_at, expires_at, revoked_at, note
                     FROM public.delegations
                    WHERE revoked_at IS NULL AND expires_at > now()
                    ORDER BY expires_at DESC LIMIT 100`);
  return ok({ delegations: rows });
}

export const GET = withAuthorization(implGet, { requiredRole: ["admin", "sysadmin"] });

export const POST = withMutationGuard(implPost, {
  requiredRole: ["admin", "sysadmin"],
  rateLimit: { keyPrefix: "admin-delegate", maxRequests: 5 },
});
