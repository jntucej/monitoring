// src/app/api/principal/inbound/route.ts
// GET /api/principal/inbound — items VP flagged to Principal (the Principal's side of the bridge).
// The VP's side is /api/vp/bridge. This returns the same rows but filtered to
// to_role='principal', with open/acknowledged counts for the Principal's dashboard.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface InboundRow {
  id: string;
  from_role: string;
  ticket_id: string | null;
  ticket_number: string | null;
  note: string;
  status: string;
  created_by_name: string | null;
  created_at: string;
  responded_by: string | null;
  responded_at: string | null;
  response_note: string | null;
}

async function handleGet(_req: NextRequest, _context: { auth: AuthContext }) {
  const rows = await query<InboundRow>(
    `SELECT f.id, f.from_role, f.ticket_id, p.ticket_number,
            f.note, f.status, f.created_by_name, f.created_at,
            f.responded_by, f.responded_at,
            resp.note AS response_note
       FROM public.vp_flags f
       LEFT JOIN public.permissions p ON p.id = f.ticket_id
       LEFT JOIN LATERAL (
         SELECT r.note FROM public.vp_flags r
          WHERE r.from_role = 'principal' AND r.to_role = f.from_role
            AND (r.ticket_id = f.ticket_id OR f.ticket_id IS NULL)
            AND r.created_at >= f.created_at
          ORDER BY r.created_at ASC LIMIT 1
       ) resp ON TRUE
      WHERE f.to_role = 'principal'
      ORDER BY f.created_at DESC
      LIMIT 100`
  );

  const all = rows.rows;
  return ok({
    items: all,
    open: all.filter((r) => r.status === "OPEN").length,
    acknowledged: all.filter((r) => r.status === "ACKNOWLEDGED").length,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["principal", "admin", "sysadmin"],
});
