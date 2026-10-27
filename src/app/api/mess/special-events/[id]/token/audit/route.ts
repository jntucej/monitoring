import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);

function eventIdFromUrl(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("audit");
  return i > 1 ? parts[i - 2] : "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const eventId = eventIdFromUrl(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const { rows: tokens } = await query<{
    id: string; user_id: string; name: string; unique_id: string;
    jti: string; item_labels: string[];
    issued_at: string; expires_at: string; used_at: string | null;
    used_method: string | null; revoked_at: string | null;
    failed_attempts: number; locked_until: string | null;
  }>(
    `SELECT t.id, t.user_id, u.name, u.unique_id, t.jti, t.item_labels,
            t.issued_at, t.expires_at, t.used_at, t.used_method, t.revoked_at,
            t.failed_attempts, t.locked_until
       FROM public.mess_event_tokens t
       JOIN public.users u ON u.id = t.user_id
      WHERE t.event_id = $1
      ORDER BY t.issued_at DESC`,
    [eventId],
  );

  const { rows: audit } = await query<{
    action: string; user_name: string | null; details: Record<string, unknown> | null; timestamp: string;
  }>(
    `SELECT action, user_name, details, timestamp
       FROM public.audit_logs
      WHERE action LIKE 'MESS_TOKEN_%'
        AND details->>'eventId' = $1
      ORDER BY timestamp DESC
      LIMIT 100`,
    [eventId],
  );

  return ok({ tokens, audit });
}

export const GET = withAuthorization(handleGet, {});
