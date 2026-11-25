import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { buildIdentityQr } from "@/lib/student/qr";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const res = await buildIdentityQr(auth.userId);
  if (!res) return fail("NOT_FOUND", "Student roll number not found", 404);
  return ok(res);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "admin", "sysadmin"],
});
