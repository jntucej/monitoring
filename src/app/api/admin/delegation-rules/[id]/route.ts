// src/app/api/admin/delegation-rules/[id]/route.ts
// PATCH  — update delegation rule.
// DELETE — delete delegation rule.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    isActive?: boolean;
    priority?: number;
  };

  const { rows } = await query<{ id: string }>(
    `UPDATE public.delegation_rules
        SET is_active = COALESCE($2::boolean, is_active),
            priority = COALESCE($3::int, priority),
            updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id`,
    [id, body.isActive ?? null, body.priority ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Rule not found", 404);

  await addAudit({
    action: "DELEGATION_RULE_UPDATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ruleId: id, patch: body },
  });

  return ok({ updated: true, ruleId: id });
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows } = await query<{ id: string }>(
    `DELETE FROM public.delegation_rules WHERE id = $1::uuid RETURNING id`,
    [id],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Rule not found", 404);

  await addAudit({
    action: "DELEGATION_RULE_DELETED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { ruleId: id },
  });

  return ok({ deleted: true, ruleId: id });
}

export const PATCH = withAdminMutation(handlePatch);
export const DELETE = withAdminMutation(handleDelete);
