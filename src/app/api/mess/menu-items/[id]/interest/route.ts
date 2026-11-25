// POST /api/mess/menu-items/[id]/interest — a resident/staff casts a vote on
// the open poll for this weekly menu item.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function itemId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const wid = itemId(req);
  const body = (await req.json().catch(() => ({}))) as { vote?: "yes" | "no" | "maybe" };
  if (!body.vote) return fail("VALIDATION_ERROR", "vote required", 400);

  const { rows } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM public.mess_item_interest_polls
      WHERE weekly_item_id = $1 ORDER BY opens_at DESC LIMIT 1`,
    [wid]
  );
  if (rows.length === 0) return fail("NOT_FOUND", "no open poll for this item", 404);
  if (rows[0].status !== "open") return fail("POLL_CLOSED", "poll is not open", 409);

  await query(
    `INSERT INTO public.mess_item_interest_votes (poll_id, user_id, vote)
     VALUES ($1, $2, $3)
     ON CONFLICT (poll_id, user_id)
     DO UPDATE SET vote = $3, voted_at = now()`,
    [rows[0].id, auth.userId, body.vote]
  );
  await addAudit({ action: "MESS_POLL_VOTE", userId: auth.userId, role: auth.role, details: { pollId: rows[0].id, vote: body.vote } });
  return ok({ recorded: true, poll_id: rows[0].id });
}

export const POST = withAuthorization(handlePost);
