// src/app/api/admin/approval-password-status/[userId]/route.ts
// GET /api/admin/approval-password-status/[userId] — whether a user has set a
// step-up approval password, lockout state, and failed-attempt count.
// Admin / sysadmin only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getUserId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  if (!["admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const userId = getUserId(req);
  if (!userId) return fail("VALIDATION_ERROR", "userId required", 400);

  const { rows } = await query<{
    has_password: boolean;
    set_at: string | null;
    failed: number | null;
    locked_until: string | null;
  }>(
    `SELECT (approval_password_hash IS NOT NULL)  AS has_password,
            approval_password_set_at               AS set_at,
            approval_password_failed_count         AS failed,
            approval_password_locked_until         AS locked_until
       FROM public.users
      WHERE id = $1
      LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "User not found", 404);

  return ok(rows[0]);
}

export const GET = withAuthorization(handleGet);
