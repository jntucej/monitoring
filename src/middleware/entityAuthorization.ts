// src/middleware/entityAuthorization.ts
// Phase 0 enforcement layer (see docs/IMPLEMENTATION_BLUEPRINT.md STEP 4):
//   1. requiredRole match (existing withAuthorization does this)
//   2. delegation fallback: if the caller lacks the role but holds an
//      active, un-revoked TTL delegation for that role (optionally scoped
//      to an entity), grant effective access and record the delegation id.
//   3. audit write: every mutation that passes through recordMutationAudit
//      lands in public.audit_events with actor_type + role context.
//
// Design notes:
// - Delegations are checked against public.delegations: now() BETWEEN
//   starts_at AND expires_at AND revoked_at IS NULL AND role matches.
//   The delegation is granted by a senior user (see
//   /api/principal/delegations and /api/admin delegation endpoints);
//   requires_approval rows are honoured at grant time, not read time.
// - The helper does NOT weaken existing withAuthorization. Routes opt in
//   by passing allowDelegation: true in the options (see withEntityAuth).
// - audit_events is append-only for gate_app; only admin can update/delete.

import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/roles";
import { query } from "@/lib/postgres";

export interface EntityAuthContext extends AuthContext {
  effectiveRole: Role | string;       // the role actually used (own or delegated)
  delegationId: string | null;        // set when acting via a delegation
  entityScope: string | null;         // entity_code scope, if the route declared one
}

interface DelegationRow {
  id: string;
  scope_entity: string | null;
}

/**
 * Resolve whether the caller may act with `requiredRole`, either natively
 * or through an active time-bound delegation. Returns the effective role
 * and the delegation id (null when acting natively).
 *
 * scopeEntity: when provided, the delegation must be campus-wide
 * (scope_entity IS NULL) or bound to this entity code.
 */
export async function resolveEffectiveRole(
  auth: AuthContext,
  requiredRole: Role | string[],
  scopeEntity: string | null = null,
): Promise<{ effectiveRole: string; delegationId: string | null }> {
  const wanted = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const callerRoles: string[] = auth.roles?.length ? auth.roles : [auth.role];

  // 1. Native role match — the fast path, no delegation lookup.
  if (wanted.some((r) => callerRoles.includes(r))) {
    return { effectiveRole: callerRoles.find((r) => wanted.includes(r))!, delegationId: null };
  }

  // 2. Delegation fallback: look up an active delegation for any of the
  //    wanted roles, un-revoked, inside its window, matching the scope.
  const result = await query<DelegationRow>(
    `SELECT id, scope_entity
       FROM public.delegations
      WHERE delegatee_id = $1
        AND role = ANY ($2::text[])
        AND now() BETWEEN starts_at AND expires_at
        AND revoked_at IS NULL
        AND (scope_entity IS NULL OR scope_entity = $3)
      LIMIT 1`,
    [auth.userId, wanted, scopeEntity ?? null],
  );
  const row = result.rows[0];
  if (row) {
    return { effectiveRole: wanted[0], delegationId: row.id };
  }

  // 3. No native role and no active delegation → caller keeps their
  //    native role; the route's requiredRole check (done by
  //    withAuthorization) will reject with 403 as before.
  return { effectiveRole: callerRoles[0], delegationId: null };
}

/**
 * Write a structured mutation audit event. Fire-and-forget: audit
 * failures must never break the request path.
 */
export async function recordMutationAudit(params: {
  actorId: string;
  actorType?: "human" | "agent" | "system";
  roleContext: string;
  entityScope?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  delegationId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  latencyMs?: number | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO public.audit_events
         (actor_id, actor_type, role_context, entity_scope, action, resource,
          resource_id, delegation_id, before_state, after_state, latency_ms,
          ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        params.actorId,
        params.actorType ?? "human",
        params.roleContext,
        params.entityScope ?? null,
        params.action,
        params.resource,
        params.resourceId ?? null,
        params.delegationId ?? null,
        params.beforeState ? JSON.stringify(params.beforeState) : null,
        params.afterState ? JSON.stringify(params.afterState) : null,
        params.latencyMs ?? null,
        params.ip ?? null,
        params.userAgent ?? null,
      ],
    );
  } catch (err) {
    // Audit must never break the request path.
    console.error("audit_events write failed:", err);
  }
}
