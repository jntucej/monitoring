// src/app/api/class-messages/[id]/release/route.ts
// POST — coordinator (or the author in relay mode) tap-releases a held relay
// message. The cron auto-release is the backstop path; both share the
// releaseClassMessage kernel (D-release-path: two paths, one table,
// released_by distinguishes human vs system).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { releaseClassMessage } from "@/lib/class-message-release";
import { getActiveCoordinators } from "@/lib/class-coordinator";

function getMessageId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[2] ?? "");
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getMessageId(req);
  if (!id) return fail("MISSING_PARAM", "Message id required", 400);

  const { rows: msgs } = await query<{ mode: string; author_id: string; released_at: string | null; class_ids: string[] }>(
    `SELECT mode, author_id, released_at, class_ids FROM public.class_messages WHERE id = $1::uuid`,
    [id],
  );
  if (msgs.length === 0) return fail("NOT_FOUND", "Message not found", 404);
  const msg = msgs[0];
  if (msg.released_at) return fail("CONFLICT", "Message already released", 409);

  // Authority: the author (self-release), an active coordinator of a target
  // class, or admin/sysadmin.
  let authorized = auth.userId === msg.author_id || auth.role === "admin" || auth.role === "sysadmin";
  if (!authorized && Array.isArray(msg.class_ids)) {
    for (const raw of msg.class_ids) {
      const { rows: cls } = await query<{ name: string }>(
        `SELECT name FROM public.classes WHERE id = $1::uuid LIMIT 1`, [raw]);
      if (cls.length === 0) continue;
      const coords = await getActiveCoordinators(cls[0].name);
      if (coords.some(c => c.studentId === auth.userId)) { authorized = true; break; }
    }
  }
  if (!authorized) return fail("FORBIDDEN", "Not the author or an active coordinator of a target class", 403);

  const result = await releaseClassMessage(id, auth.userId, "human");
  return ok(result);
}

export const POST = withAuthorization(implPost, {});
