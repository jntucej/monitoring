import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { evaluateInterestPoll } from "@/lib/mess/interest";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const pollId = parts[parts.length - 2];
  if (!pollId) return fail("MISSING_ID", "Poll id is required", 400);

  const evaluation = await evaluateInterestPoll(pollId);
  if (!evaluation) return fail("NOT_FOUND", "Poll not found", 404);

  return ok(evaluation);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["mess_incharge", "hostel_manager", "admin", "sysadmin"],
});
