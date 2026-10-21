// src/app/api/announcements/[id]/route.ts
// DELETE /api/announcements/[id] — delete an announcement.
// Admin-only (withAdminMutation).

import { NextRequest } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "id required", 400);

  const { rowCount } = await query(
    `DELETE FROM public.announcements WHERE id = $1`,
    [id],
  );
  if (!rowCount) return fail("NOT_FOUND", "Announcement not found", 404);

  await addAudit({
    action: "ANNOUNCEMENT_DELETED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { id },
  });

  return ok({ deleted: true });
}

export const DELETE = withAdminMutation(handleDelete);
