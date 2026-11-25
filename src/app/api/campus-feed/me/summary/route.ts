import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { summarizeFeedForUser } from "@/lib/student/feed";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const summary = await summarizeFeedForUser(auth.userId);
  return ok(summary);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
