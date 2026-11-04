"use client";

/**
 * LiveActivityPanel — live-activity side panel for the supervisor console.
 *
 * Desktop: right-side panel (rendered by RoleConsole alongside the board).
 * Mobile: full-width section below the board. No horizontal scroll.
 *
 * Reads GET /api/supervisor/escalations and lists open escalations with
 * team, priority, status, and last-update. Desktop: right-side panel.
 * Mobile: full-width, no h-scroll.
 */

import { useMemo, useCallback } from "react";
import { Radio, Clock, ShieldAlert, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";

interface EscalatedPermissionRow {
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  sla_deadline: string | null;
  student_name: string | null;
  created_at: string;
}

interface ActiveAlertRow {
  id: string;
  severity: string;
  title: string;
  message: string;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
}

interface DecisionRow {
  action: string;
  user_name: string | null;
  user_role: string | null;
  details: string;
  timestamp: string;
}

interface EscalationsResponse {
  success?: boolean;
  data: {
    escalatedPermissions: EscalatedPermissionRow[];
    activeAlerts: ActiveAlertRow[];
    recentDecisions: DecisionRow[];
    counts: { escalated: number; alerts: number; decisions: number };
  };
}

interface LiveActivityPanelProps {
  /** Optional refresh callback; called when the panel's fetch completes. */
  onRefresh?: () => void;
}

export function LiveActivityPanel({ onRefresh }: LiveActivityPanelProps) {
  const { data, loading, refresh } = useApiResource<EscalationsResponse>(
    "/api/supervisor/escalations",
    { ttlMs: 15_000 }
  );

  const escalated = data?.data.escalatedPermissions ?? [];
  const alerts = data?.data.activeAlerts ?? [];
  const decisions = data?.data.recentDecisions ?? [];

  // Derive a merged "open items" list: escalated permissions (open) +
  // critical/high alerts. Sort by last-update desc.
  const openItems = useMemo(() => {
    interface OpenItem {
      key: string;
      type: "escalation" | "alert" | "decision";
      team: string;
      priority: string;
      status: string;
      lastUpdate: string;
      ticket: string;
    }
    const items: OpenItem[] = [];

    for (const r of escalated) {
      items.push({
        key: `esc-${r.ticket_number}`,
        type: "escalation",
        team: r.current_stage,
        priority: "HIGH",
        status: r.status,
        lastUpdate: r.created_at,
        ticket: r.ticket_number,
      });
    }
    for (const a of alerts) {
      items.push({
        key: `alert-${a.id}`,
        type: "alert",
        team: a.gate_name ?? "Gate",
        priority: a.severity.toUpperCase(),
        status: "ACTIVE",
        lastUpdate: a.timestamp,
        ticket: a.id,
      });
    }
    for (const d of decisions) {
      items.push({
        key: `dec-${d.timestamp}`,
        type: "decision",
        team: d.user_role ?? "System",
        priority: "LOW",
        status: d.action,
        lastUpdate: d.timestamp,
        ticket: d.action,
      });
    }

    items.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
    return items.slice(0, 15);
  }, [escalated, alerts, decisions]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0"
      aria-label="Live activity panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            Live Activity
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh live activity"
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
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-rose-400 bg-rose-400/10 border-rose-400/20">
          <ShieldAlert className="w-3 h-3" />
          {data?.data.counts.escalated ?? 0} escalated
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-amber-400 bg-amber-400/10 border-amber-400/20">
          <ShieldAlert className="w-3 h-3" />
          {data?.data.counts.alerts ?? 0} alerts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border font-semibold text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
          <CheckCircle className="w-3 h-3" />
          {data?.data.counts.decisions ?? 0} decisions
        </span>
      </div>

      {/* Open items list */}
      {loading && openItems.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading live activity…</span>
        </div>
      ) : openItems.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-3 py-3">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-muted)]">
              No open escalations or alerts. The desk is clear.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {openItems.map((item) => {
            const priorityTone =
              item.priority === "CRITICAL" || item.priority === "HIGH"
                ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
                : item.priority === "MEDIUM" || item.priority === "ACTIVE"
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                  : "text-[var(--text-muted)] bg-[var(--bg-base)] border-[var(--border)]";
            return (
              <li
                key={item.key}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold border ${priorityTone} shrink-0`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {item.ticket}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                    team: {item.team} · {item.status}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" />
                  {fmt(item.lastUpdate)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer hint */}
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Data refreshed every 15s. Click a ticket in the board for full context.
      </p>
    </section>
  );
}

export default LiveActivityPanel;
