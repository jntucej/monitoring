// src/app/api/principal/inbound/[flagId]/respond/route.ts
// POST /api/principal/inbound/[flagId]/respond — Principal acknowledges / responds / resolves a VP flag.
// Body: { action: "ACKNOWLEDGED" | "RESOLVED", note?: string }
// Updates the original flag row's status (so the VP's GET reflects it) and, if the
// Principal adds a response note, inserts a reciprocal row (from='principal').

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

function getFlagId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const flagId = getFlagId(req);
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    note?: string;
  };
  const action = body.action?.toUpperCase();
  if (action !== "ACKNOWLEDGED" && action !== "RESOLVED") {
    return fail("BAD_REQUEST", 'action must be "ACKNOWLEDGED" or "RESOLVED"', 400);
  }
  const note = (body.note ?? "").trim();

  // Load the original flag
  const orig = await query<{
    id: string;
    from_role: string;
    ticket_id: string | null;
    status: string;
    note: string;
  }>(
    `SELECT id, from_role, ticket_id, status, note FROM public.vp_flags WHERE id = $1::uuid`,
    [flagId]
  );
  if (orig.rows.length === 0) {
    return fail("NOT_FOUND", "Flag not found", 404);
  }
  const flag = orig.rows[0];

  // Update the original flag's status
  await query(
    `UPDATE public.vp_flags SET status = $1, responded_by = $2, responded_at = NOW() WHERE id = $3::uuid`,
    [action, auth.userId, flag.id]
  );

  // If the Principal adds a note, record a reciprocal row
  if (note) {
    const nameRes = await query<{ name: string | null }>(
      `SELECT u.name FROM public.users u WHERE u.id = $1`,
      [auth.userId]
    );
    const actorName = nameRes.rows[0]?.name ?? auth.email;
    await query(
      `INSERT INTO public.vp_flags (from_role, to_role, ticket_id, note, created_by, created_by_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'RESOLVED')`,
      [
        "principal",
        flag.from_role,
        flag.ticket_id,
        note,
        auth.userId,
        actorName,
      ]
    );
  }

  await logAuditEvent({
    action: "VP_BRIDGE_RESPONSE",
    userId: auth.userId,
    userName: auth.email,
    userRole: auth.role,
    details: { flagId: flag.id, responseAction: action, note: note.slice(0, 200) },
  });

  return ok({ flagId: flag.id, status: action, responseNote: note || null });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["principal", "admin", "sysadmin"],
});
