"use client";

/**
 * AdminAlertsPanel — the admin's open-alerts side panel.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board feed).
 * Mobile: a full-width section below the board. No horizontal scroll.
 *
 * Reads open alerts from GET /api/admin/alerts (the same board source the
 * shell configures, but the panel reads `data.items` directly because the
 * board feed's itemKey is decorative for this role). Each row shows title,
 * severity, and timestamp. An EmptyState is shown when there are no open
 * alerts.
 */

import { useMemo } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Alert } from "@/lib/types";

/** Response shape for /api/admin/alerts (GET, open + optionally recently
 *  resolved). */
interface AdminAlertsResponse {
  success: boolean;
  data: {
    items: Alert[];
    unresolvedCount: number;
  };
}

const SEVERITY_TONE: Record<Alert["severity"], string> = {
  critical: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  high: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  medium: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  low: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

function fmtTime(iso: string | null | undefined): string {
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

export function AdminAlertsPanel() {
  const { data, loading } = useApiResource<AdminAlertsResponse>(
    "/api/admin/alerts",
    { ttlMs: 15_000 }
  );

  const openAlerts = useMemo<Alert[]>(() => {
    const items = data?.data?.items ?? [];
    return items.filter((a) => !a.resolved);
  }, [data]);

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
          Open Alerts
        </span>
        {openAlerts.length > 0 ? (
          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)] shrink-0">
            {openAlerts.length} active
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px]">Loading alerts…</span>
        </div>
      ) : openAlerts.length === 0 ? (
        <EmptyState
          title="No open alerts"
          description="All campus alerts are resolved."
          icon={<Bell className="w-5 h-5" />}
        />
      ) : (
        <ul className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
          {openAlerts.map((alert) => {
            const tone = SEVERITY_TONE[alert.severity] ?? SEVERITY_TONE.low;
            return (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {alert.title}
                  </p>
                  {alert.message ? (
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {alert.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${tone}`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">
                    {fmtTime(alert.timestamp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AdminAlertsPanel;
