import { withAuthorization } from "@/middleware/authorization";
import { getVisitorAnalytics } from "@/server/services/analytics/visitors";
import { ok } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";

export const GET = withAuthorization(async (req) => {
  const params = req.nextUrl.searchParams;
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);
  const from = params.get("from") || getIstDateString(monthAgo);
  const to = params.get("to") || getIstDateString();
  
  const analytics = await getVisitorAnalytics({ from, to });
  return ok(analytics);
}, { requiredRole: ["admin", "sysadmin"] });
