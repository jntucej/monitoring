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
