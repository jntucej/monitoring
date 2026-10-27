// src/app/api/mess/events/[id]/tokens/route.ts
// GET — mess-incharge lists every event token issued for a special event.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function getEventId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);

  const eventId = getEventId(req);
  if (!eventId) return fail("VALIDATION_ERROR", "eventId required", 400);

  const { rows } = await query(
    `SELECT e.id,
            e.jti,
            e.item_labels      AS item_labels,
            e.issued_at         AS issued_at,
            e.expires_at        AS expires_at,
            e.used_at           AS used_at,
            e.used_method       AS used_method,
            e.revoked_at        AS revoked_at,
            e.failed_attempts   AS failed_attempts,
            e.locked_until      AS locked_until,
            e.sms_sent_at       AS sms_sent_at,
            u.name,
            u.unique_id         AS unique_id
       FROM public.mess_event_tokens e
       JOIN public.users u ON u.id = e.user_id
      WHERE e.event_id = $1::uuid
      ORDER BY e.issued_at DESC`,
    [eventId],
  );

  return ok({ eventId, tokens: rows, total: rows.length });
}

export const GET = withAuthorization(handleGet);
