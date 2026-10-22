// src/app/api/admin/complaint-categories/[code]/route.ts
// PATCH — update complaint category configuration (admin/principal/sysadmin).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { invalidateCategoryCache } from "@/lib/complaint-taxonomy";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getCode(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const code = getCode(req);
  if (!code) return fail("VALIDATION_ERROR", "Category code required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    isActive?: boolean;
    slaHours?: number;
    anonymousAllowed?: boolean;
  };

  const { rows } = await query<{ code: string }>(
    `UPDATE public.complaint_categories
        SET is_active = COALESCE($2::boolean, is_active),
            sla_hours = COALESCE($3::int, sla_hours),
            anonymous_allowed = COALESCE($4::boolean, anonymous_allowed)
      WHERE code = $1
      RETURNING code`,
    [code, body.isActive ?? null, body.slaHours ?? null, body.anonymousAllowed ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Category not found", 404);

  invalidateCategoryCache();

  await addAudit({
    action: "ANTI_RAGGING_CONFIG_UPDATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { categoryCode: code, patch: body },
  });

  return ok({ updated: true, code });
}

export const PATCH = withAdminMutation(handlePatch);
