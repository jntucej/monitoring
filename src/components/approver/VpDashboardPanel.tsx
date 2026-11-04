"use client";

/**
 * VpDashboardPanel — desktop right-panel / mobile full-width dashboard panel
 * for the Vice Principal console.
 *
 * Reads GET /api/principal/dashboard (board source, shared with RoleConsole).
 * Response shape:
 *   { success, data: { pendingApprovals: number, recentAlerts: AlertRow[], campusOccupancy: string } }
 *
 * Lists top-priority items: title (from alert message), priority (severity),
 * status, timestamp. Desktop: rendered as a side section below the board.
 * Mobile: full-width, no h-scroll. EmptyState when no alerts.
 */

import { useMemo, useCallback } from "react";
import { Radio, Clock, ShieldAlert, Loader2, CheckCircle, Inbox } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";

interface AlertRow {
  id: string;
  severity: string;
  message: string;
  title?: string;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  resolved: boolean;
}

interface PrincipalDashboardResponse {
  success?: boolean;
  data: {
    pendingApprovals: number;
    recentAlerts: AlertRow[];
    campusOccupancy: string;
  };
}

interface VpDashboardPanelProps {
  /** Optional refresh callback; called when the panel's fetch completes. */
  onRefresh?: () => void;
}

export function VpDashboardPanel({ onRefresh }: VpDashboardPanelProps) {
  const { data, loading, refresh } = useApiResource<PrincipalDashboardResponse>(
    "/api/principal/dashboard",
    { ttlMs: 15_000 },
  );

  const alerts = useMemo(() => data?.data?.recentAlerts ?? [], [data]);
  const pendingApprovals = data?.data?.pendingApprovals ?? 0;

  // Top-priority items: sort by severity (critical > high > medium > low)
  // then by timestamp desc. Take top 10.
  const topItems = useMemo(() => {
    const priorityOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return [...alerts]
      .sort((a, b) => {
        const pa = priorityOrder[a.severity?.toUpperCase()] ?? 99;
        const pb = priorityOrder[b.severity?.toUpperCase()] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 10);
  }, [alerts]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const fmt = (iso: string | null | undefined) => {
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
  };

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0"
      aria-label="VP dashboard panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            VP Dashboard
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Refresh VP dashboard"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Radio className="w-3 h-3" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Counts */}
      <div className="flex flex-wrap gap-3 mb-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-sky-400 bg-sky-400/10 border-sky-400/20">
          <ShieldAlert className="w-3 h-3" />
          {pendingApprovals} pending
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-amber-400 bg-amber-400/10 border-amber-400/20">
          <ShieldAlert className="w-3 h-3" />
          {alerts.length} active alerts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
          <CheckCircle className="w-3 h-3" />
          {pendingApprovals + alerts.length} records
        </span>
      </div>

      {/* Top-priority items list */}
      {loading && topItems.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading VP dashboard…</span>
        </div>
      ) : topItems.length === 0 ? (
        <EmptyState
          title="No active alerts"
          description="The VP dashboard is clear. No pending alerts to triage."
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
        />
      ) : (
        <ul className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {topItems.map((item) => {
            const priorityTone =
              item.severity?.toUpperCase() === "CRITICAL"
                ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
                : item.severity?.toUpperCase() === "HIGH"
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                  : "text-[var(--text-muted)] bg-[var(--bg-base)] border-[var(--border)]";
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold border shrink-0 ${priorityTone}`}
                    >
                      {item.severity?.toUpperCase() ?? "—"}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {item.title ?? item.message ?? item.id}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                    {item.gate_name ?? "Campus"} · {item.resolved ? "RESOLVED" : "ACTIVE"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" />
                  {fmt(item.timestamp)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer hint */}
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        VP scope = delegated oversight. No hostel/branch filter. Data refreshed every 15s.
      </p>
    </section>
  );
}

export default VpDashboardPanel;
