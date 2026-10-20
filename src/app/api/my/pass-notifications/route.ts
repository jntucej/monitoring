// src/app/api/my/pass-notifications/route.ts
// GET /api/my/pass-notifications — the caller's recent pass-related notifications.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const { rows } = await query(
    `SELECT id, title, message,
            recipient_type AS recipient_type,
            read, created_at AS created_at
       FROM public.notifications
      WHERE recipient_id = $1
        AND type LIKE 'pass_%'
      ORDER BY created_at DESC
      LIMIT 50`,
    [auth.userId],
  );

  return ok({ notifications: rows });
}

export const GET = withAuthorization(handleGet);
