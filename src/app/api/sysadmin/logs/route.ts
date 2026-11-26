import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { redactSensitiveFields } from "@/lib/sysadmin/permissions";

/**
 * GET /api/sysadmin/logs
 *
 * Integrated log view: security alerts, audit events, and worker job
 * errors. Supports ?severity= and ?source= filters. Sensitive fields
 * are redacted server-side before returning.
 *
 * Read-only, sysadmin + admin only.
 */
async function handleGet(req: NextRequest) {
  const severity = req.nextUrl.searchParams.get("severity");
  const source = req.nextUrl.searchParams.get("source") ?? "all";

  const out: Record<string, unknown> = {
    collected_at: new Date().toISOString(),
    security_alerts: [],
    audit_events: [],
    worker_errors: [],
    filters: { severity, source },
  };

  // Security alerts
  try {
    const res = await query(
      `SELECT id, alert_type, severity, status, message, source, created_at
         FROM public.security_alerts
        WHERE ($1::text IS NULL OR severity = $1)
          AND ($2::text = 'all' OR source = $2)
        ORDER BY created_at DESC
        LIMIT 50`,
      [severity, source === "security" ? "security" : null]
    );
    out.security_alerts = redactSensitiveFields(res.rows);
  } catch {
    out.security_alerts_error = "security_alerts table unavailable";
  }

  // Audit events
  try {
    const res = await query(
      `SELECT id, action, user_id, role, details, created_at
         FROM public.audit_events
        WHERE ($1::text = 'all' OR ($1::text IS NULL))
        ORDER BY created_at DESC
        LIMIT 50`,
      [source === "audit" ? "audit" : null]
    );
    out.audit_events = redactSensitiveFields(res.rows);
  } catch {
    out.audit_events_error = "audit_events table unavailable";
  }

  // Worker job errors (from worker_job_heartbeats)
  try {
    const res = await query(
      `SELECT job_name, last_status, last_error, last_run_at, runs_total
         FROM public.worker_job_heartbeats
        WHERE last_status = 'error'
        ORDER BY last_run_at DESC
        LIMIT 20`
    );
    out.worker_errors = redactSensitiveFields(res.rows);
  } catch {
    out.worker_errors_error = "worker_job_heartbeats table unavailable";
  }

  return NextResponse.json({ success: true, data: out });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/logs",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "sysadmin_logs", maxRequests: 120 },
});
