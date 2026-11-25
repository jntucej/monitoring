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
  const requestId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const vote = String(b?.vote ?? "").toLowerCase();

  if (!requestId || !["yes", "maybe", "no"].includes(vote)) {
    return fail("INVALID_VOTE", "vote must be yes, maybe, or no", 400);
  }

  await query(
    `INSERT INTO public.class_request_interest (request_id, student_id, vote, voted_at)
     VALUES ($1::uuid, $2::uuid, $3, NOW())
     ON CONFLICT (request_id, student_id) DO UPDATE
       SET vote = EXCLUDED.vote, voted_at = NOW()`,
    [requestId, auth.userId, vote],
  );

  return ok({ request_id: requestId, vote });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student"],
});
