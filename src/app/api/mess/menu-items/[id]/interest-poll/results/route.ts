// GET /api/mess/menu-items/[id]/interest-poll/results — aggregate vote counts
// for the open/closed poll. Restricted to mess_incharge + hostel_manager +
// admin (NOT other residents — that would out voters).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function itemId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["mess_incharge", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const wid = itemId(_req);
  const { rows: polls } = await query<{ id: string; status: string; closes_at: string; min_interest_pct: string }>(
    `SELECT id, status, closes_at, min_interest_pct
       FROM public.mess_item_interest_polls
      WHERE weekly_item_id = $1 ORDER BY opens_at DESC`,
    [wid]
  );
  const results = await Promise.all(
    polls.map(async (p) => {
      const { rows } = await query<{ yes: number; no: number; maybe: number; total: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE vote='yes')   AS yes,
           COUNT(*) FILTER (WHERE vote='no')    AS "no",
           COUNT(*) FILTER (WHERE vote='maybe') AS maybe,
           COUNT(*)                              AS total
           FROM public.mess_item_interest_votes
          WHERE poll_id = $1`,
        [p.id]
      );
      const r = rows[0];
      const total = parseInt(String(r.total), 10) || 1;
      const yesPct = (parseInt(String(r.yes), 10) / total) * 100;
      const passed = p.status === "open"
        ? null
        : yesPct >= parseFloat(p.min_interest_pct) * 100;
      return {
        poll_id: p.id, status: p.status, yes: r.yes, no: r["no"], maybe: r.maybe,
        total: r.total, yes_pct: Math.round(yesPct * 10) / 10, passed,
      };
    })
  );
  return ok({ results });
}

export const GET = withAuthorization(handleGet);
