// src/app/api/admin/delegation-rules/route.ts
// GET  — list delegation rules.
// POST — create a delegation rule (admin/principal/sysadmin).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(
    `SELECT id, name, workflow_type AS "workflowType", reason,
            max_duration_hours AS "maxDurationHours", max_distance_km AS "maxDistanceKm",
            local_only AS "localOnly", delegate_role AS "delegateRole",
            notification_only_role AS "notificationOnlyRole",
            requires_principal AS "requiresPrincipal", priority, is_active AS "isActive",
            created_at AS "createdAt"
       FROM public.delegation_rules
      ORDER BY priority ASC`,
  );
  return ok({ rules: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    workflowType?: string;
    reason?: string;
    maxDurationHours?: number;
    maxDistanceKm?: number;
    localOnly?: boolean;
    delegateRole?: string;
    notificationOnlyRole?: string;
    requiresPrincipal?: boolean;
    priority?: number;
  };

  const name = (body.name ?? "").trim();
  const workflowType = (body.workflowType ?? "").trim();
  const delegateRole = (body.delegateRole ?? "").trim();

  if (!name || !workflowType || !delegateRole) {
    return fail("VALIDATION_ERROR", "name, workflowType, and delegateRole required", 400);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.delegation_rules (
       name, workflow_type, reason, max_duration_hours, max_distance_km,
       local_only, delegate_role, notification_only_role, requires_principal,
       priority, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid)
     RETURNING id`,
    [
      name,
      workflowType,
      body.reason ?? null,
      body.maxDurationHours ?? null,
      body.maxDistanceKm ?? null,
      Boolean(body.localOnly),
      delegateRole,
      body.notificationOnlyRole ?? null,
      Boolean(body.requiresPrincipal),
      Number(body.priority ?? 100),
      auth.userId,
    ],
  );

  await addAudit({
    action: "DELEGATION_RULE_CREATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ruleId: rows[0].id, name, workflowType },
  });

  return ok({ ruleId: rows[0].id, created: true });
}

export const GET = withAuthorization(handleGet);
export const POST = withAdminMutation(handlePost);
