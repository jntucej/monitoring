import { withAuthorization } from "@/middleware/authorization";
import { getVisitorAnalytics } from "@/server/services/analytics/visitors";
import { ok } from "@/server/http/response";

export const GET = withAuthorization(async (req) => {
  const params = req.nextUrl.searchParams;
  const from = params.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = params.get("to") || new Date().toISOString().slice(0, 10);
  
  const analytics = await getVisitorAnalytics({ from, to });
  return ok(analytics);
}, { requiredRole: ["admin", "sysadmin"] });
