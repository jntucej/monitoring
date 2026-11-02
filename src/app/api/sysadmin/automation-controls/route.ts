import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/sysadmin/automation-controls
 *
 * Returns every kill-switch row in automation_controls plus the
 * escalation_contacts ladder so the sysadmin dashboard can render the
 * "Automation" section: one toggle per autonomous job + the escalation
 * chain.
 *
 * PATCH /api/sysadmin/automation-controls/{name}
 *   body: { enabled: boolean, reason?: string }
 *
 * Flips one kill switch. Records who disabled it and why (disabled_by +
 * disabled_at + reason). This is the "red button" that makes the
 * autonomous system safe to leave running.
 */

interface ControlRow {
  name: string;
  enabled: boolean;
  reason: string | null;
  disabled_by: string | null;
  disabled_at: string | null;
}

async function handleGet(_req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const controls = await query<ControlRow>(
    `SELECT c.name, c.enabled, c.reason,
            u.login_identifier AS disabled_by, c.disabled_at
       FROM public.automation_controls c
       LEFT JOIN public.users u ON u.id = c.disabled_by
      ORDER BY c.name`
  );

  const ladder = await query<{
    level: number;
    role: string;
    user_id: string | null;
    notify_at_min: number;
    channels: string[];
  }>(
    `SELECT level, role, user_id, notify_at_min, channels
       FROM public.escalation_contacts
      ORDER BY level`
  );

  return ok({ controls: controls.rows, ladder: ladder.rows });
}

async function handlePatch(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  // PATCH /api/sysadmin/automation-controls/{name}
  const url = new URL(req.url);
  const name = url.pathname.split("/").pop();
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

  const row = res.rows[0] as ControlRow;

  // If we just disabled, write a status_updates row (SEV-3) + Telegram note.
  if (!enabled) {
    await query(
      `INSERT INTO public.status_updates (severity, title, detail)
       VALUES ('SEV-3', $1, $2)`,
      [`Kill switch: ${name} disabled`, reason || `Disabled by ${userId}`]
    ).catch(() => {});
  }

  return ok({ updated: row });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "sysadmin_automation_controls", maxRequests: 120 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "sysadmin_automation_controls_patch", maxRequests: 30 }
);
