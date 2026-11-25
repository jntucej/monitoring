import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { dismissFeedItem } from "@/lib/student/feed";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const feedId = parts[parts.length - 2];
  await dismissFeedItem(auth.userId, feedId);
  return ok({ dismissed: true, feed_id: feedId });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
