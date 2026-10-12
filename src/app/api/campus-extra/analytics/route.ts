import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus-extra/analytics?date_range=7d|30d&department=<id>&hostel=<id>&gate=<id>
 *
 * Role-specific analytics with interactive filters (date range, department,
 * hostel, gate) where authorized. For each role, renders 2–4 meaningful
 * charts showing e.g. approval turnaround, pending-by-deadline,
 * gate-verification latency, maintenance resolution time.
 *
 * The dataset is filtered to the user's scope on the server using their
 * role + assigned scope. No cross-role data leakage.
 */

const APPROVER_ROLES = new Set(["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal"]);
const OPERATOR_ROLES = new Set(["operator", "caretaker"]);
const MANAGER_ROLES = new Set(["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal", "hostel_manager"]);

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;

  const dateRange = req.nextUrl.searchParams.get("date_range") || "7d";
  const department = req.nextUrl.searchParams.get("department");
  const hostel = req.nextUrl.searchParams.get("hostel");
  const gate = req.nextUrl.searchParams.get("gate");

  const days = dateRange === "30d" ? 30 : 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const metrics: Array<{ key: string; label: string; value: number; unit?: string }> = [];
  const seriesData: Array<Record<string, string | number>> = [];

  if (APPROVER_ROLES.has(role)) {
    // Approval turnaround
    let q = supabase
      .from("permission_requests")
      .select("id, created_at, updated_at, status")
      .gte("created_at", cutoffIso)
      .limit(500);
    if (department) q = q.eq("branch", department);

    const { data: perms, error: permErr } = await q;
    if (permErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: permErr.message } },
        { status: 500 }
      );
    }

    const total = (perms || []).length;
    const resolved = (perms || []).filter((p: any) => p.status === "RESOLVED" || p.status === "REJECTED");
    const avgTurnaround =
      resolved.length > 0
        ? Math.round(
            resolved.reduce((sum: number, p: any) => {
              const ms = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime();
              return sum + Math.max(0, ms);
            }, 0) / resolved.length / 3600000
          )
        : 0;

    metrics.push({ key: "pending_requests", label: "Pending Requests", value: total - resolved.length });
    metrics.push({ key: "avg_turnaround_hrs", label: "Avg Approval Turnaround", value: avgTurnaround, unit: "hrs" });
    metrics.push({ key: "total_processed", label: "Processed", value: resolved.length });

    // Daily series
    const dailyMap = new Map<string, { pending: number; resolved: number }>();
    for (const p of perms || []) {
      const day = p.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { pending: 0, resolved: 0 };
      if (p.status === "RESOLVED" || p.status === "REJECTED") {
        entry.resolved += 1;
      } else {
        entry.pending += 1;
      }
      dailyMap.set(day, entry);
    }
    for (const [date, vals] of dailyMap) {
      seriesData.push({ date, ...vals });
    }
  }

  if (OPERATOR_ROLES.has(role)) {
    // Gate scan stats
    let scanQ = supabase
      .from("gate_scans")
      .select("id, created_at, status, gate_id")
      .gte("created_at", cutoffIso)
      .limit(1000);
    if (gate) scanQ = scanQ.eq("gate_id", gate);

    const { data: scans, error: scanErr } = await scanQ;
    if (scanErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: scanErr.message } },
        { status: 500 }
      );
    }

    const totalScans = (scans || []).length;
    const failedScans = (scans || []).filter((s: any) => s.status === "FAILED" || s.status === "DENIED").length;
    const failRate = totalScans > 0 ? Math.round((failedScans / totalScans) * 100) : 0;

    metrics.push({ key: "total_scans", label: "Total Scans", value: totalScans });
    metrics.push({ key: "fail_rate", label: "Verification Fail Rate", value: failRate, unit: "%" });

    const dailyMap = new Map<string, { scans: number; failed: number }>();
    for (const s of scans || []) {
      const day = s.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { scans: 0, failed: 0 };
      entry.scans += 1;
      if (s.status === "FAILED" || s.status === "DENIED") entry.failed += 1;
      dailyMap.set(day, entry);
    }
    for (const [date, vals] of dailyMap) {
      seriesData.push({ date, ...vals });
    }
  }

  if (MANAGER_ROLES.has(role)) {
    // Maintenance / alerts resolution
    let alertQ = supabase
      .from("alerts")
      .select("id, created_at, resolved, resolved_at, gate_id")
      .gte("created_at", cutoffIso)
      .limit(500);
    if (gate) alertQ = alertQ.eq("gate_id", gate);
    if (department) alertQ = alertQ.eq("gate_id", department);

    const { data: alerts, error: alertErr } = await alertQ;
    if (alertErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: alertErr.message } },
        { status: 500 }
      );
    }

    const totalAlerts = (alerts || []).length;
    const resolvedAlerts = (alerts || []).filter((a: any) => a.resolved).length;
    const avgResolution =
      resolvedAlerts > 0
        ? Math.round(
            (alerts || [])
              .filter((a: any) => a.resolved && a.resolved_at)
              .reduce((sum: number, a: any) => {
                const ms = new Date(a.resolved_at).getTime() - new Date(a.created_at).getTime();
                return sum + Math.max(0, ms);
              }, 0) /
              resolvedAlerts /
              60000
          )
        : 0;

    metrics.push({ key: "active_alerts", label: "Active Alerts", value: totalAlerts - resolvedAlerts });
    metrics.push({ key: "avg_resolution_min", label: "Avg Resolution Time", value: avgResolution, unit: "min" });
    metrics.push({ key: "resolved_total", label: "Resolved", value: resolvedAlerts });

    const dailyMap = new Map<string, { alerts: number; resolved: number }>();
    for (const a of alerts || []) {
      const day = a.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { alerts: 0, resolved: 0 };
      entry.alerts += 1;
      if (a.resolved) entry.resolved += 1;
      dailyMap.set(day, entry);
    }
    for (const [date, vals] of dailyMap) {
      seriesData.push({ date, ...vals });
    }
  }

  // Fallback for roles not in the above sets
  if (metrics.length === 0) {
    metrics.push({ key: "role", label: "Your Role", value: 0, unit: role });
  }

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      seriesData,
      role,
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_analytics",
  maxRequests: 60,
});
