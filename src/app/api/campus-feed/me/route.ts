import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { listFeedForUser } from "@/lib/student/feed";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const filter = (req.nextUrl.searchParams.get("filter") ?? "all") as "all" | "unread" | "expiring";
  const kind = req.nextUrl.searchParams.get("kind") ?? undefined;
  const items = await listFeedForUser(auth.userId, { filter, kind });
  return ok({ items });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
