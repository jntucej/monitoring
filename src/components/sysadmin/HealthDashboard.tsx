"use client";
import { errMsg } from "@/lib/err-msg";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Database,
  Shield,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Zap,
} from "lucide-react";
import { SystemHealth } from "@/lib/health";
import { getAuthHeaders } from "@/lib/utils";

export function HealthDashboard() {
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [_loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health/full", { headers: getAuthHeaders(), cache: "no-store" });
      if (!res.ok && res.status !== 503) {
        throw new Error(`Failed to fetch health data (status ${res.status})`);
      }
      const data: SystemHealth = await res.json();
      setHealth(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(errMsg(err) || "Unable to reach health monitoring service");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only. /api/health reflects the live stack and is cheap to
  // call, but the 15s/60s timer was still the source of the request-spike
  // the user was seeing on the sysadmin area. Manual refresh remains
  // available via the Refresh button in the panel header.
  useEffect(() => {
    fetchHealth(true);
  }, [fetchHealth]);

  const getStatusBadge = (status?: "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-action-success border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-action-warning border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case "unhealthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-action-danger border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Unhealthy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-bg-elevated0/10 text-text-muted border border-border/20">
            Unknown
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-action-danger border border-rose-500/30">CRITICAL</span>;
      case "warning":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-action-warning border border-amber-500/30">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-500/20 text-action-info border border-sky-500/30">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-6 h-6 text-action-info" /> System Health & Telemetry
            </h2>
            {health && getStatusBadge(health.status)}
          </div>
          <p className="text-xs text-text-muted flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Fetching..."} (refresh on demand)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-action-danger text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-action-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-surface border border-border p-4 rounded-xl space-y-1">
          <div className="text-xs text-text-muted flex items-center justify-between">
            <span>Active Users</span>
            <Users className="w-4 h-4 text-action-info" />
          </div>
          <p className="text-2xl font-black text-text-primary">{health?.metrics?.activeUsers ?? "-"}</p>
          <p className="text-xs text-text-muted">{health?.metrics?.activeSessions ?? 0} active sessions</p>
        </div>

        <div className="bg-bg-surface border border-border p-4 rounded-xl space-y-1">
          <div className="text-xs text-text-muted flex items-center justify-between">
            <span>Requests / Min</span>
            <Zap className="w-4 h-4 text-action-warning" />
          </div>
          <p className="text-2xl font-black text-text-primary">{health?.metrics?.requestsPerMinute ?? "-"}</p>
          <p className="text-xs text-text-muted">Live API throughput</p>
        </div>

        <div className="bg-bg-surface border border-border p-4 rounded-xl space-y-1">
          <div className="text-xs text-text-muted flex items-center justify-between">
            <span>Avg Latency</span>
            <Clock className="w-4 h-4 text-action-success" />
          </div>
          <p className="text-2xl font-black text-text-primary">
            {health?.metrics?.avgResponseTime !== undefined ? `${Math.round(health.metrics.avgResponseTime)} ms` : "—"}
          </p>
          <p className="text-xs text-text-muted">
            {health?.metrics?.avgResponseTime ? (health.metrics.avgResponseTime < 50 ? "Optimal" : health.metrics.avgResponseTime < 200 ? "Acceptable" : "Elevated") : "Capturing data..."}
          </p>
        </div>

        <div className="bg-bg-surface border border-border p-4 rounded-xl space-y-1">
          <div className="text-xs text-text-muted flex items-center justify-between">
            <span>Error Rate</span>
            <AlertTriangle className="w-4 h-4 text-action-danger" />
          </div>
          <p className="text-2xl font-black text-text-primary">
            {health?.metrics?.errorRate !== undefined ? `${(health.metrics.errorRate * 100).toFixed(2)}%` : "0.00%"}
          </p>
          <p className="text-xs text-text-muted">Threshold: &lt; 5.00%</p>
        </div>
      </div>
      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => router.push("/sysadmin/audit")}
          className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4 cursor-pointer hover:border-sky-500/40 hover:bg-bg-elevated transition-all group"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 group-hover:text-action-info transition-colors">
              <Database className="w-4 h-4 text-action-info" /> Database
            </h3>
            {getStatusBadge(health?.components?.database?.status)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Latency</span>
              <span className="font-mono text-text-primary font-medium">{health?.components?.database?.latency ?? 0} ms</span>
            </div>
            {health?.components?.database?.error && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-action-danger font-mono text-xs">
                {health.components.database.error}
              </div>
            )}
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              Click to view audit telemetry →
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/gates")}
          className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4 cursor-pointer hover:border-purple-500/40 hover:bg-bg-elevated transition-all group"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 group-hover:text-unit-c transition-colors">
              <Server className="w-4 h-4 text-unit-c" /> Gate Turnstiles
            </h3>
            {getStatusBadge(health?.components?.gateways?.status)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Online</span>
              <span className="font-mono text-action-success font-bold">{health?.components?.gateways?.online ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total Gates</span>
              <span className="font-mono text-text-primary font-bold">{health?.components?.gateways?.total ?? 0}</span>
            </div>
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              Click to manage gate hardware →
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/sysadmin/security")}
          className="bg-bg-surface border border-border p-5 rounded-2xl space-y-4 cursor-pointer hover:border-emerald-500/40 hover:bg-bg-elevated transition-all group"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2 group-hover:text-action-success transition-colors">
              <Shield className="w-4 h-4 text-action-success" /> Subsystems
            </h3>
            {getStatusBadge((health?.components?.services?.auth?.status === "degraded" ? "degraded" : health?.components?.services?.status) as any)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Auth & JWT Engine</span>
              <span className="text-action-success font-bold text-xs">
                {health?.components?.services?.auth?.status === "healthy" ? "Operational" : "Degraded"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Background Worker</span>
              <span className="text-action-success font-bold text-xs">Operational</span>
            </div>
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              Click to manage security policies →
            </p>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-bg-surface border border-border p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-action-warning" /> System Alerts
        </h3>
        {!health?.recentAlerts || health.recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
            No active system alerts recorded. All subsystems operating normally.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(health?.recentAlerts || []).map((alert) => (
                  <tr key={alert.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-2.5">{getSeverityBadge(alert.severity)}</td>
                    <td className="py-2.5 font-medium text-text-primary">{alert.message}</td>
                    <td className="py-2.5 text-right font-mono text-text-muted text-xs">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
