"use client";

/**
 * PrincipalDashboardPanel — top-priority items panel for the Principal console.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board).
 * Mobile: full-width section below the board. No horizontal scroll.
 *
 * Reads GET /api/principal/dashboard. The endpoint exposes
 * `data.pendingApprovals` (count of PENDING exam permissions at the principal
 * stage) and `data.recentAlerts` (the 5 newest unresolved alerts, newest
 * first) but has no dedicated "top-priority items" field, so the panel lists
 * the recent alerts — each with title, severity, status and timestamp — and
 * shows an EmptyState when none are active.
 */

import { useMemo } from "react";
import { Radio, Loader2, ShieldAlert } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";

interface AlertRow {
  id: string;
  severity: string;
  title: string;
  message?: string;
  gate_id?: string | null;
  gate_name?: string | null;
  timestamp: string;
  resolved?: boolean;
}

interface PrincipalDashboardResponse {
  success?: boolean;
  data: {
    pendingApprovals?: number;
    recentAlerts?: AlertRow[];
    campusOccupancy?: string;
  };
}

function severityTone(severity: string): string {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "text-rose-400";
  if (s === "high") return "text-amber-400";
  return "text-[var(--text-secondary)]";
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function PrincipalDashboardPanel() {
  const { data, loading } = useApiResource<PrincipalDashboardResponse>(
    "/api/principal/dashboard",
    { ttlMs: 30_000 },
  );

  const alerts = useMemo(() => {
    const raw = data?.data?.recentAlerts;
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const pendingApprovals = data?.data?.pendingApprovals ?? 0;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            Principal Dashboard
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {pendingApprovals} pending
        </span>
      </div>

      {/* Body: recent alerts (top-priority items) or EmptyState */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading dashboard…
        </div>
      ) : alerts.length > 0 ? (
        <ul className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {a.title || a.message || "Alert"}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                  {a.gate_name || a.gate_id || "campus"} · {a.severity}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-[10px] font-mono font-bold uppercase ${severityTone(a.severity)}`}>
                  {a.severity}
                </span>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">
                  {fmtTime(a.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mb-0"
          title="No active alerts"
          description="Top-priority items will appear here when alerts are raised."
          icon={<ShieldAlert className="w-4 h-4 text-[var(--text-muted)]" />}
        />
      )}
    </section>
  );
}

export default PrincipalDashboardPanel;
