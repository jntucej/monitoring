import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * PATCH /api/sysadmin/automation-controls/{id}
 *
 * Flips one kill switch. The `id` is the automation_controls.name (e.g.
 * "auto_heal_enabled", "auto_response_enabled"). Body:
 *   { enabled: boolean, reason?: string }
 *
 * Records who disabled it and why (disabled_by + disabled_at + reason).
 * This is the "red button" — one tap, the automation stops.
 */
async function handlePatch(
  req: NextRequest,
  { params }: { params: { id: string } },
  ctx: { auth: AuthContext }
): Promise<Response> {
  const name = decodeURIComponent(params.id);
  if (!name) return fail("BAD_REQUEST", "missing control name in path");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_REQUEST", "invalid JSON body");
  }
  const { enabled, reason } = (body ?? {}) as { enabled?: boolean; reason?: string };
  if (typeof enabled !== "boolean") return fail("BAD_REQUEST", "enabled must be boolean");

  const userId = ctx.auth.userId;
  const res = await query(
    `UPDATE public.automation_controls AS c
        SET enabled = $2,
            reason = COALESCE($3, c.reason),
            disabled_by = CASE WHEN $2::boolean THEN NULL ELSE $4::uuid END,
            disabled_at = CASE WHEN $2::boolean THEN NULL ELSE NOW() END
      WHERE c.name = $1
      RETURNING c.name, c.enabled, c.reason, c.disabled_by, c.disabled_at`,
    [name, enabled, reason ?? null, userId]
  );

  if (res.rowCount === 0) return fail("NOT_FOUND", `unknown control: ${name}`);

  const row = res.rows[0];

  // If we just disabled a switch, write a SEV-3 status_updates row.
  if (!enabled) {
    await query(
      `INSERT INTO public.status_updates (severity, title, detail)
       VALUES ('SEV-3', $1, $2)`,
      [`Kill switch: ${name} disabled`, reason || `Disabled by user ${userId}`]
    ).catch(() => {});
  }

  return ok({ updated: row });
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "sysadmin_automation_controls_patch", maxRequests: 30 }
);
