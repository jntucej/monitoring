import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { getPresence } from "@/lib/student/presence";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const presence = await getPresence(auth.userId);
  return ok(presence ?? { student_id: auth.userId, state: "unknown", block_id: null });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "admin", "sysadmin"],
});
