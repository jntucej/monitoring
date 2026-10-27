// src/app/api/cron/audit-rotate/route.ts
// POST /api/cron/audit-rotate — cron: purge old audit_logs / integration_logs /
// security_alerts / api_metrics past their retention windows.
//
// Previously this work only existed in worker/jobs/audit_log_rotation.js,
// which is NOT scheduled anywhere — so api_metrics grew unboundedly until a
// sysadmin manually clicked "Run" on the job in the admin UI. This route
// makes the same work reachable from a host cron entry (see
// scripts/setup-crons.sh), which is the actual scheduled path.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "CRON_SECRET is not configured on server" } },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (secretHeader !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized cron request" } },
      { status: 401 },
    );
  }

  const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "180", 10);
  const integrationLogRetentionDays = parseInt(process.env.INTEGRATION_LOG_RETENTION_DAYS || "30", 10);
  const alertRetentionDays = parseInt(process.env.ALERT_RETENTION_DAYS || "90", 10);
  // API metrics are short-lived telemetry: the dashboard only reads the last
  // window, so 7 days of history is plenty. Keep them bounded so the
  // append-only table can't grow unboundedly and slow down the RPS counter.
  const apiMetricsRetentionDays = parseInt(process.env.API_METRICS_RETENTION_DAYS || "7", 10);

  try {
    const auditRes = await query(
      `DELETE FROM public.audit_logs
        WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays],
    );
    const intRes = await query(
      `DELETE FROM public.integration_logs
        WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [integrationLogRetentionDays],
    );
    const alertRes = await query(
      `DELETE FROM public.security_alerts
        WHERE resolved = TRUE
          AND created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [alertRetentionDays],
    );
    const metricsRes = await query(
      `DELETE FROM public.api_metrics
        WHERE timestamp < NOW() - ($1 || ' days')::INTERVAL`,
      [apiMetricsRetentionDays],
    );

    await addAudit({
      action: "AUDIT_LOG_ROTATION_COMPLETED",
      userId: "system",
      userName: "Background Cron",
      role: "sysadmin",
      details: {
        message: `Rotated logs via /api/cron/audit-rotate`,
        purgedAudit: auditRes.rowCount ?? 0,
        purgedIntegrationLogs: intRes.rowCount ?? 0,
        purgedAlerts: alertRes.rowCount ?? 0,
        purgedApiMetrics: metricsRes.rowCount ?? 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        purgedAudit: auditRes.rowCount ?? 0,
        purgedIntegrationLogs: intRes.rowCount ?? 0,
        purgedAlerts: alertRes.rowCount ?? 0,
        purgedApiMetrics: metricsRes.rowCount ?? 0,
      },
    });
  } catch (err: any) {
    console.error("[cron/audit-rotate] failed:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Audit rotation failed" } },
      { status: 500 },
    );
  }
}
