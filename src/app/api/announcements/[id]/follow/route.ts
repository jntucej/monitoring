// src/app/api/announcements/[id]/follow/route.ts
// GET  /api/announcements/[id]/follow — is the caller following this announcement?
// POST /api/announcements/[id]/follow { following } — follow or unfollow.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const { rows } = await query(
    `SELECT 1 AS one FROM public.announcement_follows
      WHERE user_id = $1 AND announcement_id = $2`,
    [auth.userId, id],
  );
  return ok({ announcementId: id, following: rows.length > 0 });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const { following } = (await req.json().catch(() => ({}))) as {
    following?: boolean;
  };

  if (following === false) {
    await query(
      `DELETE FROM public.announcement_follows
        WHERE user_id = $1 AND announcement_id = $2`,
      [auth.userId, id],
    );
    return ok({ announcementId: id, following: false });
  }

  await query(
    `INSERT INTO public.announcement_follows (user_id, announcement_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, announcement_id) DO NOTHING`,
    [auth.userId, id],
  );
  return ok({ announcementId: id, following: true });
}

export const GET = withAuthorization(handleGet);
export const POST = withAuthorization(handlePost);
