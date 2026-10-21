// src/app/api/admin/anti-ragging-alert-config/route.ts
// GET   — read anti-ragging alert configuration.
// PATCH — update anti-ragging alert configuration.

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
    `SELECT value FROM public.system_settings WHERE id = 'anti_ragging_alert_config' LIMIT 1`,
  );
  return ok({ config: rows[0]?.value ?? null });
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const patch = await req.json().catch(() => ({}));
  const { rows } = await query(
    `UPDATE public.system_settings
        SET value = value || $1::jsonb, updated_at = NOW()
      WHERE id = 'anti_ragging_alert_config'
      RETURNING value`,
    [JSON.stringify(patch)],
  );

  await addAudit({
    action: "ANTI_RAGGING_CONFIG_UPDATED",
    userId: auth.userId,
    role: auth.role as Role,
    details: patch,
  });

  return ok({ config: rows[0].value });
}

export const GET = withAuthorization(handleGet);
export const PATCH = withAdminMutation(handlePatch);
