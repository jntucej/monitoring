import { NextRequest, NextResponse } from "next/server";
import { getAlerts } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Alert } from "@/lib/types";

const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical", "info", "warning"];

/**
 * Resolve the caller's effective tier from the trusted auth context.
 * Multi-role users get the highest tier among their roles so they see
 * the most permissive set of alerts.
 */
function callerTier(auth: { role: string; roles?: string[] }): number {
  const roles = auth.roles?.length ? auth.roles : [auth.role];
  return roles.reduce((max, r) => Math.max(max, getRoleTier(r)), 0);
}

function alertVisibleTo(auth: { role: string; roles?: string[] }, alert: Alert): boolean {
  const { role, roles } = auth;
  const tier = callerTier(auth);

  // Tier gate: user tier must be >= the alert's minimum tier.
  const minTier = alert.minTier;
  if (typeof minTier === "number" && tier < minTier) return false;

  // Role gate: visibleToRoles undefined/null/empty => visible to all
  // callers; otherwise the caller's primary or any of their roles must
  // be in the list.
  const visibleToRoles = alert.visibleToRoles;
  if (Array.isArray(visibleToRoles) && visibleToRoles.length > 0) {
    const roleSet = new Set(roles?.length ? roles : [role]);
    if (!visibleToRoles.some((r: unknown) => typeof r === "string" && roleSet.has(r))) {
      return false;
    }
  }

  return true;
}

/**
 * GET /api/alerts
 * Query params:
 *   resolved=true|false  -> filter by resolution status (omit to get all)
 *   severity=low|medium|high|critical -> filter by severity (e.g. ?severity=critical
 *   for "critical only"; omit to show all)
 *
 * Results are pre-filtered per caller: only alerts whose minTier and
 * visibleToRoles gates pass for the requesting user are returned, so
 * different roles see different alert sets.
 */
async function handleGet(
  req: NextRequest,
  { auth }: { auth: { role: string; roles?: string[] } }
) {
  try {
    const params = req.nextUrl.searchParams;
    const resolvedParam = params.get("resolved");
    const severity = params.get("severity");

    let data: Alert[] = await getAlerts();

    // Role + tier filtering based on the trusted auth context
    data = data.filter((a) => alertVisibleTo(auth, a));

    if (resolvedParam === "true") {
      data = data.filter((a) => a.resolved);
    } else if (resolvedParam === "false") {
      data = data.filter((a) => !a.resolved);
    }
    if (severity && ALLOWED_SEVERITIES.includes(severity.toLowerCase())) {
      data = data.filter((a) => a.severity?.toLowerCase() === severity.toLowerCase());
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load alerts" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin', 'supervisor', 'principal'] }),
  { keyPrefix: 'alerts_list', maxRequests: 60 }
);
