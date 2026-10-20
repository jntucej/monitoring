// src/app/api/notifications/read-all/route.ts
// POST /api/notifications/read-all — mark every notification for the caller read.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(_req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const { rowCount } = await query(
    `UPDATE public.notifications
        SET read = TRUE, read_at = COALESCE(read_at, NOW())
      WHERE recipient_id = $1 AND read = FALSE`,
    [auth.userId],
  );

  return ok({ markedRead: rowCount ?? 0 });
}

export const POST = withAuthorization(handlePost);
