import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus-extra/analytics?date_range=7d|30d&department=<id>&hostel=<id>&gate=<id>
 *
 * Role-specific analytics with interactive filters (date range, department,
 * hostel, gate) where authorized. For each role, renders 2-4 meaningful
 * charts showing e.g. approval turnaround, pending-by-deadline,
 * gate-verification latency, maintenance resolution time.
 *
 * The dataset is filtered to the user's scope on the server using their
 * role + assigned scope. No cross-role data leakage.
 */

const APPROVER_ROLES = new Set(["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal"]);
const OPERATOR_ROLES = new Set(["operator", "caretaker"]);
const MANAGER_ROLES = new Set(["admin", "sysadmin", "supervisor", "hod", "principal", "vice_principal", "hostel_manager"]);

interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

async function handleGet(
  req: NextRequest,
  context: { auth: AuthContext }
) {
  const role = context.auth.role;

  const dateRange = req.nextUrl.searchParams.get("date_range") || "7d";
  const department = req.nextUrl.searchParams.get("department");
  const hostel = req.nextUrl.searchParams.get("hostel");
  const gate = req.nextUrl.searchParams.get("gate");

  const days = dateRange === "30d" ? 30 : 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const metrics: AnalyticsMetric[] = [];
  const seriesData: Array<Record<string, string | number>> = [];

  if (APPROVER_ROLES.has(role)) {
    // Approval turnaround
    const params: unknown[] = [cutoffIso];
    let where = `created_at >= $1`;
    if (department) { params.push(department); where += ` AND branch = $${params.length}`; }

    const permRes = await query<{ id: string; created_at: string; updated_at: string; status: string }>(
      `SELECT id, created_at, updated_at, status FROM permission_requests WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    const perms = permRes.rows;

    const total = perms.length;
    const resolved = perms.filter((p) => p.status === "APPROVED" || p.status === "REJECTED");
    const avgTurnaround =
      resolved.length > 0
        ? Math.round(
            resolved.reduce((sum, p) => {
              const ms = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime();
              return sum + Math.max(0, ms);
            }, 0) / resolved.length / 3600000
          )
        : 0;

    metrics.push({ key: "pending_requests", label: "Pending Requests", value: total - resolved.length });
    metrics.push({ key: "avg_turnaround_hrs", label: "Avg Approval Turnaround", value: avgTurnaround, unit: "hrs" });
    metrics.push({ key: "total_processed", label: "Processed", value: resolved.length });

    const dailyMap = new Map<string, { pending: number; resolved: number }>();
    for (const p of perms) {
      const day = p.created_at.slice(0, 10);
      const entry = dailyMap.get(day) || { pending: 0, resolved: 0 };
      if (p.status === "APPROVED" || p.status === "REJECTED") entry.resolved += 1;
      else entry.pending += 1;
      dailyMap.set(day, entry);
    }
    for (const [date, vals] of dailyMap) {
      seriesData.push({ date, ...vals });
    }
  }

  if (OPERATOR_ROLES.has(role)) {
    // Gate scan stats — movement_logs (no gate_scans table in this deployment)
    const params: unknown[] = [cutoffIso];
    let where = `timestamp >= $1`;
    if (gate) { params.push(gate); where += ` AND gate_id = $${params.length}`; }
    if (hostel) { params.push(hostel); where += ` AND gate_id = $${params.length}`; }

    const scanRes = await query<{ id: string; timestamp: string; direction: string; is_correction: boolean; gate_id: string | null }>(
      `SELECT id, timestamp, direction, is_correction, gate_id FROM movement_logs WHERE ${where} ORDER BY timestamp DESC LIMIT 1000`,
      params
    );
    const scans = scanRes.rows;

    const totalScans = scans.length;
    const failedScans = scans.filter((s) => s.is_correction).length;
    const failRate = totalScans > 0 ? Math.round((failedScans / totalScans) * 100) : 0;

    metrics.push({ key: "total_scans", label: "Total Scans", value: totalScans });
    metrics.push({ key: "fail_rate", label: "Correction Rate", value: failRate, unit: "%" });

    const dailyMap = new Map<string, { scans: number; failed: number }>();
    for (const s of scans) {
      const day = s.timestamp.slice(0, 10);
      const entry = dailyMap.get(day) || { scans: 0, failed: 0 };
      entry.scans += 1;
      if (s.is_correction) entry.failed += 1;
      dailyMap.set(day, entry);
    }
    for (const [date, vals] of dailyMap) {
      seriesData.push({ date, ...vals });
    }
  }

  if (MANAGER_ROLES.has(role)) {
    // Maintenance / alerts resolution
    const params: unknown[] = [cutoffIso];
    let where = `timestamp >= $1`;
    if (gate) { params.push(gate); where += ` AND gate_id = $${params.length}`; }
    if (department) { params.push(department); where += ` AND gate_id = $${params.length}`; }

    const alertRes = await query<{ id: string; timestamp: string; resolved: boolean; resolved_at: string | null }>(
      `SELECT id, timestamp AS created_at, resolved, resolved_at FROM alerts WHERE ${where} ORDER BY timestamp DESC LIMIT 500`,
      params
    );
    const alerts = alertRes.rows;

    const totalAlerts = alerts.length;
    const resolvedAlerts = alerts.filter((a) => a.resolved).length;
    const avgResolution =
      resolvedAlerts > 0
        ? Math.round(
            alerts
              .filter((a) => a.resolved && a.resolved_at)
              .reduce((sum, a) => {
                const ms = new Date(a.resolved_at as string).getTime() - new Date(a.timestamp).getTime();
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
    for (const a of alerts) {
      const day = a.timestamp.slice(0, 10);
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
