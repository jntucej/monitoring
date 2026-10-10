import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { listAlerts } from "@/server/services/alerts/list";
import { ok } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const result = await listAlerts(req.nextUrl.searchParams);
  return ok(result.alerts);
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "supervisor", "warden"] }),
  { keyPrefix: "alerts_list", maxRequests: 60 }
);
