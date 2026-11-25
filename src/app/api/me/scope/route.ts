import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { resolveScope } from "@/lib/student/scope";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const scope = await resolveScope(auth.userId);
  return ok(scope);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
