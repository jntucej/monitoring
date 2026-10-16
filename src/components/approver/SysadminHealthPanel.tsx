"use client";

/**
 * SysadminHealthPanel — the sysadmin's service-health side panel.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board feed).
 * Mobile: a full-width section below the board. No horizontal scroll.
 *
 * Reads service health from GET /api/sysadmin/application-health (the same
 * board source the shell uses, so the app-level service rows are free) and,
 * when reachable, container telemetry from GET /api/sysadmin/services. Each
 * row shows a service name, its status, and the last-check timestamp. When
 * there is nothing to report, an EmptyState is shown.
 */

import { useMemo } from "react";
import { Loader2, Server } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";

/** A single app-level service row as derived from health.components.services. */
interface ServiceRow {
  key: string;
  status: "healthy" | "degraded" | "unhealthy";
  detail?: string;
}

/** A container row as returned by /api/sysadmin/services. */
interface ContainerRow {
  name: string;
  running: boolean;
  cpuPercent: number;
  memoryBytes: number;
  restartsLastHour: number;
}

/** Response shape for /api/sysadmin/application-health. */
interface ApplicationHealthResponse {
  success: boolean;
  data: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptimeSeconds: number;
    services: { status: "healthy" | "degraded" | "unhealthy"; [key: string]: unknown };
    database: { status: string; latencyMs: number };
    gateways: { status: string; online: number; offline: number; total: number };
    recentAlerts: Array<{ id: string; severity: string; message: string; timestamp?: string }>;
  };
}

/** Response shape for /api/sysadmin/services. */
interface ServicesResponse {
  success: boolean;
  data: {
    status?: "healthy" | "degraded" | "unhealthy";
    services?: { status: string; [key: string]: unknown };
    database?: { status: string; latencyMs?: number };
    containers: ContainerRow[] | null;
    containersError?: string | null;
  };
}

type HealthStatus = "healthy" | "degraded" | "unhealthy";

const STATUS_TONE: Record<HealthStatus, string> = {
  healthy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  degraded: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  unhealthy: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "Up",
  degraded: "Degraded",
  unhealthy: "Down",
};

function normalizeStatus(raw: unknown): HealthStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "healthy" || s === "up" || s === "ok") return "healthy";
  if (s === "degraded" || s === "warn" || s === "warning") return "degraded";
  return "unhealthy";
}

function fmtLastCheck(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Derive a clean, readable detail string for an app-level service row. */
function serviceDetail(entry: unknown): string | undefined {
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    if (typeof e.error === "string" && e.error) return e.error;
    return undefined;
  }
  return undefined;
}

export function SysadminHealthPanel() {
  const { data: healthData, loading: healthLoading } =
    useApiResource<ApplicationHealthResponse>("/api/sysadmin/application-health", {
      ttlMs: 15_000,
    });
  const { data: servicesData, loading: servicesLoading } =
    useApiResource<ServicesResponse>("/api/sysadmin/services", {
      ttlMs: 15_000,
    });

  // App-level service rows: each named entry under health.data.services that
  // carries its own status (e.g. "auth"). We skip the aggregate "status" key.
  const serviceRows = useMemo<ServiceRow[]>(() => {
    const services = healthData?.data?.services;
    if (!services) return [];
    const rows: ServiceRow[] = [];
    for (const [key, value] of Object.entries(services)) {
      if (key === "status") continue;
      const entry = value as { status?: string };
      if (!entry || typeof entry.status !== "string") continue;
      rows.push({
        key,
        status: normalizeStatus(entry.status),
        detail: serviceDetail(value),
      });
    }
    // Surface the database / gateways components as named rows too.
    if (healthData?.data?.database) {
      rows.push({
        key: "database",
        status: normalizeStatus(healthData.data.database.status),
        detail:
          typeof healthData.data.database.latencyMs === "number"
            ? `${healthData.data.database.latencyMs}ms`
            : undefined,
      });
    }
    if (healthData?.data?.gateways) {
      const g = healthData.data.gateways;
      rows.push({
        key: "gateways",
        status: normalizeStatus(g.status),
        detail: `${g.online}/${g.total} online`,
      });
    }
    return rows;
  }, [healthData]);

  const containers = useMemo<ContainerRow[]>(
    () => (servicesData?.data?.containers ?? []) as ContainerRow[],
    [servicesData]
  );

  const lastCheck = healthData?.data?.timestamp ?? null;
  const loading = healthLoading || servicesLoading;
  const visible = serviceRows.length > 0 ? serviceRows : [];

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Server className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
          Service Health
        </span>
        {lastCheck ? (
          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)] shrink-0">
            last check {fmtLastCheck(lastCheck)}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px]">Loading service health…</span>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No service health reported"
          description="The health engine has not reported any services yet."
          icon={<Server className="w-5 h-5" />}
        />
      ) : (
        <ul className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 mb-3">
          {visible.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {row.key}
                  {row.detail ? (
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-[var(--text-muted)]">
                      {row.detail}
                    </span>
                  ) : null}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${STATUS_TONE[row.status]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {STATUS_LABEL[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Container telemetry (only when Prometheus is reachable). */}
      {containers.length > 0 ? (
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Containers
          </p>
          <ul className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {containers.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {c.name}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] truncate">
                    cpu {c.cpuPercent}% · {Math.round(c.memoryBytes / 1024 / 1024)}MB ·{" "}
                    {c.restartsLastHour} restarts/h
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${
                    c.running
                      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                      : "text-rose-400 bg-rose-400/10 border-rose-400/20"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.running ? "Running" : "Down"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export default SysadminHealthPanel;
