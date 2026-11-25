import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const pollId = parts[parts.length - 2];
  const body = await req.json().catch(() => null);
  const vote = String(body?.vote ?? "").toLowerCase();

  if (!pollId || !["yes", "maybe", "no"].includes(vote)) {
    return fail("INVALID_VOTE", "vote must be yes, maybe, or no", 400);
  }

  const { rows: pollRows } = await query<{ status: string; closes_at: string }>(
    `SELECT status, closes_at FROM public.mess_interest_polls WHERE id = $1::uuid LIMIT 1`,
    [pollId],
  );
  const poll = pollRows[0];
  if (!poll) return fail("NOT_FOUND", "Poll not found", 404);
  if (poll.status !== "open" || new Date(poll.closes_at).getTime() < Date.now()) {
    return fail("POLL_CLOSED", "Poll is closed", 409);
  }

  await query(
    `INSERT INTO public.mess_interest_votes (poll_id, user_id, vote, voted_at)
     VALUES ($1::uuid, $2::uuid, $3, NOW())
     ON CONFLICT (poll_id, user_id) DO UPDATE
       SET vote = EXCLUDED.vote, voted_at = NOW()`,
    [pollId, auth.userId, vote],
  );

  return ok({ poll_id: pollId, vote });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "staff", "admin", "sysadmin"],
});
