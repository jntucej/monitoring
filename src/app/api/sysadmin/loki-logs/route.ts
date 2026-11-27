import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { lokiLabelValues, lokiQueryRange, MONITORING_GRAFANA_URL } from "@/lib/monitoring";
import { query } from "@/lib/postgres";
import { redactSensitiveFields } from "@/lib/sysadmin/permissions";

export interface LokiLogEntry {
  ts: string;
  container: string;
  level: string;
  line: string;
}

function inferLevel(line: string): string {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fatal") || l.includes("exception") || l.includes("panic")) return "error";
  if (l.includes("warn")) return "warn";
  return "info";
}

async function handleGet(req: NextRequest) {
  const container = (req.nextUrl.searchParams.get("container") || "all").trim();
  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  const minutes = Math.min(Math.max(Number(req.nextUrl.searchParams.get("minutes") || 60), 5), 1440);
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 200), 20), 1000);

  const endNs = BigInt(Date.now()) * BigInt(1_000_000);
  const startNs = endNs - BigInt(minutes * 60 * 1000) * BigInt(1_000_000);

  // Build safe LogQL selector
  const safeContainer = container !== "all" ? container.replace(/[^a-zA-Z0-9_.-]/g, "") : "";
  const selector = safeContainer ? `{container="${safeContainer}"}` : `{container=~".+"}`;
  const safeSearch = search.replace(/["\\`]/g, "");
  const logql = safeSearch ? `${selector} |= "${safeSearch}"` : selector;

  try {
    const [labelsRes, rangeRes] = await Promise.all([
      lokiLabelValues("container").catch(() => ({ data: [] as string[] })),
      lokiQueryRange(logql, startNs.toString(), endNs.toString(), limit),
    ]);

    const containers: string[] = Array.isArray(labelsRes?.data) ? labelsRes.data : [];
    const streams: Array<{ stream?: Record<string, string>; values?: Array<[string, string]> }> =
      rangeRes?.data?.result || [];

    const entries: LokiLogEntry[] = [];
    for (const s of streams) {
      const cname = s.stream?.container || s.stream?.service_name || s.stream?.job || "unknown";
      for (const [ns, line] of s.values || []) {
        const ms = Number(BigInt(ns) / BigInt(1_000_000));
        entries.push({
          ts: new Date(ms).toISOString(),
          container: cname,
          level: inferLevel(line),
          line,
        });
      }
    }

    entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));

    return NextResponse.json({
      success: true,
      data: {
        source: "loki",
        lokiReachable: true,
        grafanaUrl: MONITORING_GRAFANA_URL,
        containers,
        entries: entries.slice(0, limit),
        collectedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    // Graceful fallback to DB audit/security/worker logs if mon_loki is not on the same Docker network
    const fallbackEntries: LokiLogEntry[] = [];
    try {
      const [auditRes, alertRes, workerRes] = await Promise.all([
        query<{ action: string; role: string; created_at: string }>(
          `SELECT action, role, created_at FROM public.audit_events ORDER BY created_at DESC LIMIT 40`
        ).catch(() => ({ rows: [] })),
        query<{ severity: string; alert_type: string; message: string; source: string; created_at: string }>(
          `SELECT severity, alert_type, message, source, created_at FROM public.security_alerts ORDER BY created_at DESC LIMIT 30`
        ).catch(() => ({ rows: [] })),
        query<{ job_name: string; last_status: string; last_error: string | null; last_run_at: string }>(
          `SELECT job_name, last_status, last_error, last_run_at FROM public.worker_job_heartbeats ORDER BY last_run_at DESC LIMIT 20`
        ).catch(() => ({ rows: [] })),
      ]);

      for (const r of redactSensitiveFields(auditRes.rows) as Array<{ action: string; role: string; created_at: string }>) {
        fallbackEntries.push({
          ts: new Date(r.created_at).toISOString(),
          container: "gate_web (audit)",
          level: "info",
          line: `[${r.role}] ${r.action}`,
        });
      }
      for (const r of redactSensitiveFields(alertRes.rows) as Array<{ severity: string; alert_type: string; message: string; source: string; created_at: string }>) {
        fallbackEntries.push({
          ts: new Date(r.created_at).toISOString(),
          container: `gate_security (${r.source || "alert"})`,
          level: r.severity === "critical" || r.severity === "high" ? "error" : "warn",
          line: `[${r.alert_type}] ${r.message}`,
        });
      }
      for (const r of redactSensitiveFields(workerRes.rows) as Array<{ job_name: string; last_status: string; last_error: string | null; last_run_at: string }>) {
        fallbackEntries.push({
          ts: new Date(r.last_run_at).toISOString(),
          container: "gate_worker",
          level: r.last_status === "error" ? "error" : "info",
          line: `job=${r.job_name} status=${r.last_status}${r.last_error ? ` err=${r.last_error}` : ""}`,
        });
      }
      fallbackEntries.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    } catch {
      /* ignore */
    }

    const filtered = safeSearch
      ? fallbackEntries.filter((e) => e.line.toLowerCase().includes(safeSearch.toLowerCase()) || e.container.toLowerCase().includes(safeSearch.toLowerCase()))
      : fallbackEntries;

    return NextResponse.json({
      success: true,
      data: {
        source: "db-fallback",
        lokiReachable: false,
        lokiError: err instanceof Error ? err.message : String(err),
        grafanaUrl: MONITORING_GRAFANA_URL,
        containers: Array.from(new Set(fallbackEntries.map((e) => e.container))),
        entries: filtered.slice(0, limit),
        collectedAt: new Date().toISOString(),
      },
    });
  }
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/loki-logs",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "loki_logs", maxRequests: 120 },
});
