import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { finalizeInterestPoll } from "@/lib/mess/interest";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const pollId = parts[parts.length - 2];
  if (!pollId) return fail("MISSING_ID", "Poll id is required", 400);

  const body = await req.json().catch(() => ({}));
  const decision =
    body?.decision === "approved" || body?.decision === "rejected"
      ? body.decision
      : undefined;

  const res = await finalizeInterestPoll(pollId, auth.userId, decision);
  if (!res) return fail("NOT_FOUND", "Poll not found", 404);

  await addAudit({
    action: "MESS_INTEREST_POLL_CLOSED",
    userId: auth.userId,
    role: auth.role,
    details: { pollId, status: res.status, scheduleId: res.schedule_id },
  });

  return ok(res);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
});
