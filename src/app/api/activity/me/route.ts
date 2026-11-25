import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { listActivityForUser } from "@/lib/student/activity";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const items = await listActivityForUser(auth.userId, {
    category: sp.get("category") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  return ok({ items });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "admin", "sysadmin"],
});
