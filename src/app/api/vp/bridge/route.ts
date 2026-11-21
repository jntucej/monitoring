// src/app/api/vp/bridge/route.ts
// GET  /api/vp/bridge  — flags VP raised to Principal + Principal's responses
// POST /api/vp/bridge  — VP flags an item to Principal { ticketId?, note }
//
// The read side of the two-way bridge. Principal's GET is /api/principal/inbound
// and their POST is /api/principal/inbound/[id]/respond. Every transition is
// audit-logged and a notification is fired to the recipient role.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

const BRIDGE_ROLES = ["vice_principal", "principal", "admin", "sysadmin"] as const;
interface FlagRow {
  id: string;
  from_role: string;
  to_role: string;
  ticket_id: string | null;
  note: string;
  status: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  responded_by: string | null;
  responded_at: string | null;
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const rows = await query<FlagRow>(
    `SELECT f.* FROM public.vp_flags f ORDER BY f.created_at DESC LIMIT 100`
  );
  return ok({
    // flags VP raised (to Principal)
    vpToPrincipal: rows.rows.filter((r) => r.from_role === "vice_principal"),
    // Principal's responses / flags down to VP
    principalToVp: rows.rows.filter((r) => r.from_role === "principal"),
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as {
    ticketId?: string;
    note?: string;
  };
  const note = (body.note ?? "").trim();
  if (!note) {
    return fail("BAD_REQUEST", "note is required", 400);
  }
  const ticketId = body.ticketId ?? null;

  const result = await query<{ name: string | null }>(
    `SELECT u.name FROM public.users u WHERE u.id = $1`,
    [auth.userId]
  );
  const actorName = result.rows[0]?.name ?? auth.email;

  const insertRes = await query<FlagRow>(
    `INSERT INTO public.vp_flags (from_role, to_role, ticket_id, note, created_by, created_by_name)
     VALUES ($1, 'principal', $2, $3, $4, $5)
     RETURNING *`,
    [auth.role, ticketId, note, auth.userId, actorName]
  );
  const flag = insertRes.rows[0];

  await logAuditEvent({
    action: "VP_BRIDGE_FLAG",
    userId: auth.userId,
    userName: actorName,
    userRole: auth.role,
    details: { flagId: flag?.id, ticketId, note: note.slice(0, 200) },
  });

  return ok({ flag });
}

export const GET = withAuthorization(handleGet, { requiredRole: [...BRIDGE_ROLES] });
export const POST = withAuthorization(handlePost, { requiredRole: ["vice_principal", "admin", "sysadmin"] });
