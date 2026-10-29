// src/app/api/notifications/[id]/route.ts
// PATCH /api/notifications/[id] — mark a notification read for its recipient.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  // §8 recipient ownership. A user may only mark read the rows addressed to
  // them (recipient_id = their id) plus true campus-wide broadcasts
  // (recipient_type = 'all'). Anything else — including rows sent to another
  // user or to a role/department they don't belong to — is not theirs to
  // silence. Admins / sysadmins retain cross-recipient read-management.
  // This mirrors /api/notifications/read-all, which keys strictly on
  // recipient_id = auth.userId.
  const isPrivileged = auth.role === "admin" || auth.role === "sysadmin";

  const sql = isPrivileged
    ? `UPDATE public.notifications
         SET read = TRUE, read_at = COALESCE(read_at, NOW())
       WHERE id = $1
       RETURNING id, recipient_id, read_at`
    : `UPDATE public.notifications
         SET read = TRUE, read_at = COALESCE(read_at, NOW())
       WHERE id = $1
         AND (recipient_type = 'all' OR recipient_id = $2)
       RETURNING id, recipient_id, read_at`;
  const params: (string)[] = isPrivileged ? [id] : [id, auth.userId];

  const { rows, rowCount } = await query<{
    id: string;
    recipient_id: string;
    read_at: string | null;
  }>(sql, params);
  if (!rowCount || !rows[0]) return fail("NOT_FOUND", "Notification not found", 404);

  return ok({ id: rows[0].id, readAt: rows[0].read_at });
}

export const PATCH = withAuthorization(handlePatch);
