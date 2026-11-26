// /api/delegations/graph/route.ts
// Machine-readable delegation graph (IMPLEMENTATION_BLUEPRINT STEP 7.2):
// all active delegations as directed edges — the institutional authority
// structure agents can reason about. A delegatee with an active TTL
// delegation CAN act as the delegate role within the scope window;
// nothing is permanent.

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const scope = req.nextUrl.searchParams.get("entityScope");
  const includeExpired = req.nextUrl.searchParams.get("includeExpired") === "true";

  let activeOnly = "d.revoked_at IS NULL AND d.expires_at > now()";
  if (includeExpired) activeOnly = "d.revoked_at IS NULL";

  let sql = `
    SELECT d.id,
           d.delegator_id, u1.name AS delegator_name, u1.role AS delegator_role,
           d.delegatee_id, u2.name AS delegatee_name,
           d.role AS delegated_role,
           d.scope_entity, d.can_mutate,
           d.starts_at, d.expires_at, d.revoked_at, d.note
       FROM public.delegations d
       JOIN public.users u1 ON u1.id = d.delegator_id
       JOIN public.users u2 ON u2.id = d.delegatee_id
      WHERE ${activeOnly}`;
  const params: unknown[] = [];
  if (scope) { sql += ` AND (d.scope_entity IS NULL OR d.scope_entity = $${params.push(scope)})`; }
  sql += " ORDER BY d.expires_at DESC LIMIT 200";

  const { rows } = await query(sql, params);

  // Graph shape: nodes = users, edges = delegations.
  const nodeIds = new Set<string>();
  for (const r of rows) { nodeIds.add(r.delegator_id); nodeIds.add(r.delegatee_id); }
  return ok({
    entityScope: scope,
    includeExpired,
    generatedAt: new Date().toISOString(),
    nodes: [...nodeIds],
    edges: rows.map((r) => ({
      id: r.id,
      from: r.delegator_id, fromName: r.delegator_name, fromRole: r.delegator_role,
      to: r.delegatee_id, toName: r.delegatee_name,
      role: r.delegated_role,
      scope: r.scope_entity,
      canMutate: r.can_mutate,
      active: r.revoked_at === null && new Date(r.expires_at).getTime() > Date.now(),
      startsAt: r.starts_at,
      expiresAt: r.expires_at,
      revokedAt: r.revoked_at,
      note: r.note,
    })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/delegations/graph",
  auth: "user",
  requiredRole: ["admin", "sysadmin", "principal", "dean"],
  rateLimit: { keyPrefix: "delegation-graph", maxRequests: 20, windowMs: 60_000 },
});
