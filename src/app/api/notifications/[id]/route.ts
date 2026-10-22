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

  const { rows, rowCount } = await query<{
    id: string;
    recipient_id: string;
    read_at: string | null;
  }>(
    `UPDATE public.notifications
        SET read = TRUE, read_at = COALESCE(read_at, NOW())
      WHERE id = $1 AND (recipient_id = $2 OR recipient_type IN ('all','role'))
      RETURNING id, recipient_id, read_at`,
    [id, auth.userId],
  );
  if (!rowCount || !rows[0]) return fail("NOT_FOUND", "Notification not found", 404);

  return ok({ id: rows[0].id, readAt: rows[0].read_at });
}

export const PATCH = withAuthorization(handlePatch);
