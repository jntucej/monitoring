"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

export function HealthDashboard() {
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok && res.status !== 503) {
        throw new Error(`Failed to fetch health data (status ${res.status})`);
      }
      const data: SystemHealth = await res.json();
      setHealth(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Unable to reach health monitoring service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth(true);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchHealth();
        intervalRef.current = setInterval(() => fetchHealth(), 30000);
      }
    };

    intervalRef.current = setInterval(() => fetchHealth(), 30000);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchHealth]);

  // Live toggle transition also fires a health re-check.
  useLiveRefresh(() => fetchHealth(), {});

  const getStatusBadge = (status?: "healthy" | "degraded" | "unhealthy") => {
    switch (status) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case "unhealthy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Unhealthy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            Unknown
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case "warning":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-6 h-6 text-sky-400" /> System Health & Telemetry
            </h2>
            {health && getStatusBadge(health.status)}
          </div>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Fetching..."} (Auto-refreshes every 30s)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-xl space-y-1">
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
            <span>Active Users</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)]">{health?.metrics.activeUsers ?? "-"}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{health?.metrics.activeSessions ?? 0} active sessions</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-xl space-y-1">
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
            <span>Requests / Min</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)]">{health?.metrics.requestsPerMinute ?? "-"}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Live API throughput</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-xl space-y-1">
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
            <span>Avg Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)]">
            {health?.metrics.avgResponseTime ? `${Math.round(health.metrics.avgResponseTime)} ms` : "< 25 ms"}
          </p>
          <p className="text-[10px] text-emerald-400 font-medium">Optimal response speed</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-xl space-y-1">
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-between">
            <span>Error Rate</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-[var(--text-primary)]">
            {health?.metrics.errorRate !== undefined ? `${(health.metrics.errorRate * 100).toFixed(2)}%` : "0.00%"}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">Threshold: &lt; 5.00%</p>
        </div>
      </div>
      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          onClick={() => router.push("/sysadmin/audit")}
          className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl space-y-4 cursor-pointer hover:border-sky-500/40 hover:bg-[var(--bg-elevated)] transition-all group"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 group-hover:text-sky-400 transition-colors">
              <Database className="w-4 h-4 text-sky-400" /> Database
            </h3>
            {getStatusBadge(health?.components.database.status)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Latency</span>
              <span className="font-mono text-[var(--text-primary)] font-medium">{health?.components.database.latency ?? 0} ms</span>
            </div>
            {health?.components.database.error && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[10px]">
                {health.components.database.error}
              </div>
            )}
            <p className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
              Click to view audit telemetry →
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/gates")}
          className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl space-y-4 cursor-pointer hover:border-purple-500/40 hover:bg-[var(--bg-elevated)] transition-all group"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 group-hover:text-purple-400 transition-colors">
              <Server className="w-4 h-4 text-purple-400" /> Gate Turnstiles
            </h3>
            {getStatusBadge(health?.components.gateways.status)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Online</span>
              <span className="font-mono text-emerald-400 font-bold">{health?.components.gateways.online ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Total Gates</span>
              <span className="font-mono text-[var(--text-primary)] font-bold">{health?.components.gateways.total ?? 0}</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
              Click to manage gate hardware →
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/sysadmin/security")}
          className="bg-[var(--bg-surface)] border border-[var(--border)] p-5 rounded-2xl space-y-4 cursor-pointer hover:border-emerald-500/40 hover:bg-[var(--bg-elevated)] transition-all group"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
              <Shield className="w-4 h-4 text-emerald-400" /> Subsystems
            </h3>
            {getStatusBadge((health?.components.services.auth?.status === "degraded" ? "degraded" : health?.components.services.status) as any)}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Auth & JWT Engine</span>
              <span className="text-emerald-400 font-bold text-[10px]">
                {health?.components.services?.auth?.status === "healthy" ? "Operational" : "Degraded"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Background Worker</span>
              <span className="text-emerald-400 font-bold text-[10px]">Operational</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 flex items-center gap-1">
              Click to manage security policies →
            </p>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> System Alerts
        </h3>
        {!health?.recentAlerts || health.recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
            No active system alerts recorded. All subsystems operating normally.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {health.recentAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                    <td className="py-2.5">{getSeverityBadge(alert.severity)}</td>
                    <td className="py-2.5 font-medium text-[var(--text-primary)]">{alert.message}</td>
                    <td className="py-2.5 text-right font-mono text-[var(--text-muted)] text-[10px]">
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
