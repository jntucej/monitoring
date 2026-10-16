"use client";

/**
 * EscalationPanel — per-row escalation board for the supervisor console.
 *
 * Desktop: right-side panel (rendered by RoleConsole alongside the board).
 * Mobile: full-width section below the board. No horizontal scroll.
 *
 * Reads GET /api/supervisor/escalations and renders a filterable list of
 * open items (escalated permissions + active alerts) with per-row
 * Assign / Resolve / Escalate actions.
 *
 * Filter tabs: All | Alerts | Escalated | Overdue (client-side filter).
 * Red banner at top when critical alert count > 0.
 */

import { useMemo, useCallback, useState } from "react";
import {
  Radio,
  Clock,
  ShieldAlert,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

/* ── response shapes (mirror the API route) ───────────────────────── */

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

interface AssigneeRow {
  id: string;
  name: string;
  role: string;
}

interface AssigneesResponse {
  success?: boolean;
  data: AssigneeRow[];
}

/* ── merged row type ──────────────────────────────────────────────── */

type FilterTab = "all" | "alerts" | "escalated" | "overdue";

interface MergedRow {
  key: string;
  type: "alert" | "escalation";
  severity: string;
  title: string;
  gate: string;
  assignedTo: string | null;
  age: string;
  slaBadge: string | null;
  alertId: string | null;
  ticketNumber: string | null;
  isOverdue: boolean;
}

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "alerts", label: "Alerts" },
  { id: "escalated", label: "Escalated" },
  { id: "overdue", label: "Overdue" },
];

/** Compute a human-readable age string from an ISO timestamp. */
function fmtAge(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
  } catch {
    return "—";
  }
}

export interface EscalationPanelProps {
  /** Optional refresh callback; called when a row action completes. */
  onRefresh?: () => void;
}

export function EscalationPanel({ onRefresh }: EscalationPanelProps) {
  const addToast = useUIStore((s) => s.addToast);

  const { data: escData, loading: escLoading, refresh: refreshEsc } =
    useApiResource<EscalationsResponse>("/api/supervisor/escalations", {
      ttlMs: 15_000,
    });

  const { data: assigneeData, loading: assigneeLoading, refresh: refreshAssignees } =
    useApiResource<AssigneesResponse>("/api/supervisor/assignees", {
      ttlMs: 60_000,
    });

  const [filter, setFilter] = useState<FilterTab>("all");
  const [assigningRow, setAssigningRow] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const escalated = escData?.data.escalatedPermissions ?? [];
  const alerts = escData?.data.activeAlerts ?? [];
  const assignees = assigneeData?.data ?? [];

  /* ── merge rows ─────────────────────────────────────────────────── */

  const rows = useMemo<MergedRow[]>(() => {
    const out: MergedRow[] = [];

    for (const a of alerts) {
      const overdue =
        a.severity === "critical" || a.severity === "high";
      out.push({
        key: `alert-${a.id}`,
        type: "alert",
        severity: a.severity.toUpperCase(),
        title: a.title,
        gate: a.gate_name ?? "Gate",
        assignedTo: null, // no assigned_to column in schema yet
        age: fmtAge(a.timestamp),
        slaBadge: a.severity === "critical" ? "SLA 30m" : a.severity === "high" ? "SLA 1h" : null,
        alertId: a.id,
        ticketNumber: null,
        isOverdue: overdue,
      });
    }

    for (const p of escalated) {
      const overdue =
        p.sla_deadline !== null &&
        new Date(p.sla_deadline).getTime() < Date.now();
      out.push({
        key: `esc-${p.ticket_number}`,
        type: "escalation",
        severity: "ESCALATED",
        title: `Ticket ${p.ticket_number}`,
        gate: p.current_stage,
        assignedTo: p.student_name ?? null,
        age: fmtAge(p.created_at),
        slaBadge: p.sla_deadline
          ? overdue
            ? "SLA breached"
            : "SLA active"
          : null,
        alertId: null,
        ticketNumber: p.ticket_number,
        isOverdue: overdue,
      });
    }

    // Sort: overdue first, then critical, then by age desc.
    out.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.severity === "CRITICAL" && b.severity !== "CRITICAL") return -1;
      if (b.severity === "CRITICAL" && a.severity !== "CRITICAL") return 1;
      const tA = a.alertId ? alerts.find((x) => x.id === a.alertId)?.timestamp ?? "" : "";
      const tB = b.ticketNumber ? escalated.find((x) => x.ticket_number === b.ticketNumber)?.created_at ?? "" : "";
      return new Date(tB).getTime() - new Date(tA).getTime();
    });

    return out;
  }, [alerts, escalated]);

  /* ── client-side filter ─────────────────────────────────────────── */

  const filtered = useMemo(() => {
    switch (filter) {
      case "alerts":
        return rows.filter((r) => r.type === "alert");
      case "escalated":
        return rows.filter((r) => r.type === "escalation");
      case "overdue":
        return rows.filter((r) => r.isOverdue);
      default:
        return rows;
    }
  }, [rows, filter]);

  /* ── critical banner ───────────────────────────────────────────── */

  const criticalCount = useMemo(
    () => rows.filter((r) => r.severity === "CRITICAL").length,
    [rows]
  );

  /* ── row actions ───────────────────────────────────────────────── */

  const handleAssign = useCallback(
    async (row: MergedRow, assigneeId: string) => {
      if (!row.alertId) return;
      const assignee = assignees.find((a) => a.id === assigneeId);
      setBusyKey(row.key);
      try {
        const res = await fetch("/api/alerts/assign", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            alert_id: row.alertId,
            assignee_user_id: assigneeId,
            assignee_role: assignee?.role ?? "operator",
            note: `Assigned by supervisor panel`,
          }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Alert assigned to ${assignee?.name ?? assigneeId}`,
          });
          setAssigningRow(null);
          void refreshEsc();
          onRefresh?.();
        } else {
          addToast({
            variant: "error",
            message: json?.error?.message || "Failed to assign alert",
          });
        }
      } catch {
        addToast({ variant: "error", message: "Network error during assignment" });
      } finally {
        setBusyKey(null);
      }
    },
    [addToast, assignees, refreshEsc, onRefresh]
  );

  const handleResolve = useCallback(
    async (row: MergedRow) => {
      if (!row.alertId) return;
      setBusyKey(row.key);
      try {
        const res = await fetch(
          `/api/alerts/${encodeURIComponent(row.alertId)}`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            // No JSON body: resolveAlert only needs the alert id + user id
            // from the auth headers (x-user-id).
          }
        );
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Alert ${row.title} resolved`,
          });
          void refreshEsc();
          onRefresh?.();
        } else {
          addToast({
            variant: "error",
            message: json?.error?.message || "Failed to resolve alert",
          });
        }
      } catch {
        addToast({ variant: "error", message: "Network error during resolve" });
      } finally {
        setBusyKey(null);
      }
    },
    [addToast, refreshEsc, onRefresh]
  );

  const handleEscalate = useCallback(
    async (row: MergedRow) => {
      if (!row.ticketNumber) return;
      setBusyKey(row.key);
      try {
        const res = await fetch(
          `/api/permissions/${encodeURIComponent(row.ticketNumber)}`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: "ESCALATE" }),
          }
        );
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Ticket ${row.ticketNumber} escalated`,
          });
          void refreshEsc();
          onRefresh?.();
        } else {
          addToast({
            variant: "error",
            message: json?.error?.message || "Failed to escalate ticket",
          });
        }
      } catch {
        addToast({ variant: "error", message: "Network error during escalation" });
      } finally {
        setBusyKey(null);
      }
    },
    [addToast, refreshEsc, onRefresh]
  );

  const handleRefresh = useCallback(() => {
    void refreshEsc();
    void refreshAssignees();
  }, [refreshEsc, refreshAssignees]);

  /* ── severity icon ─────────────────────────────────────────────── */

  function severityIcon(sev: string) {
    if (sev === "CRITICAL") return <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    if (sev === "HIGH") return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (sev === "ESCALATED") return <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    return <Radio className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />;
  }

  /* ── render ────────────────────────────────────────────────────── */

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0"
      aria-label="Escalation panel"
    >
      {/* Critical banner */}
      {criticalCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-bold text-rose-400">
            {criticalCount} critical {criticalCount === 1 ? "item" : "items"} require immediate attention
          </span>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            Escalations
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {rows.length} items
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={escLoading}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Refresh escalation panel"
        >
          {escLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Radio className="w-3 h-3" />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Filter escalations">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors ${
              filter === tab.id
                ? "border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading / empty state */}
      {escLoading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading escalations…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-3 py-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-muted)]">
              {filter === "all"
                ? "No open escalations or alerts. The desk is clear."
                : `No ${filter} items match the current filter.`}
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map((row) => {
            const isActive = assigningRow === row.key;
            const isBusy = busyKey === row.key;
            return (
              <li
                key={row.key}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 min-w-0"
              >
                {/* Row header: severity icon + title + age + SLA badge */}
                <div className="flex items-center gap-2 min-w-0">
                  {severityIcon(row.severity)}
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate flex-1 min-w-0">
                    {row.title}
                  </span>
                  {row.slaBadge ? (
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-mono font-bold border shrink-0 ${
                        row.slaBadge === "SLA breached"
                          ? "text-rose-400 bg-rose-400/10 border-rose-400/20"
                          : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                      }`}
                    >
                      {row.slaBadge}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    {row.age}
                  </span>
                </div>

                {/* Sub-row: gate + assigned_to */}
                <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                  <span className="truncate">
                    gate: {row.gate}
                  </span>
                  {row.assignedTo ? (
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <UserPlus className="w-3 h-3 shrink-0" />
                      {row.assignedTo}
                    </span>
                  ) : null}
                  {row.ticketNumber ? (
                    <span className="text-[var(--text-muted)]/60">
                      ticket: {row.ticketNumber}
                    </span>
                  ) : null}
                </div>

                {/* Per-row actions */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {/* Assign button (alerts only) */}
                  {row.alertId ? (
                    <button
                      type="button"
                      onClick={() => setAssigningRow(isActive ? null : row.key)}
                      disabled={isBusy}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors disabled:opacity-40 ${
                        isActive
                          ? "border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                          : "border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40"
                      }`}
                    >
                      <UserPlus className="w-3 h-3" />
                      Assign
                      {isActive ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : null}
                    </button>
                  ) : null}

                  {/* Resolve button (alerts only) */}
                  {row.alertId ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(row)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Resolve
                    </button>
                  ) : null}

                  {/* Escalate button (escalated permissions only) */}
                  {row.ticketNumber ? (
                    <button
                      type="button"
                      onClick={() => handleEscalate(row)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-rose-400/30 bg-rose-400/10 text-rose-400 hover:bg-rose-400/20 transition-colors disabled:opacity-40"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Escalate
                    </button>
                  ) : null}

                  {/* Busy indicator */}
                  {isBusy ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--text-muted)]" />
                  ) : null}
                </div>

                {/* Assignee dropdown (shown when Assign is toggled) */}
                {isActive && row.alertId && !isBusy ? (
                  <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 p-2">
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 block">
                      Assign to
                    </label>
                    {assigneeLoading ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Loading assignees…</span>
                      </div>
                    ) : assignees.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        No assignees available.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignees.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleAssign(row, a.id)}
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40 hover:text-[var(--text-primary)] transition-colors"
                          >
                            {a.name}
                            <span className="text-[var(--text-muted)]/60">
                              ({a.role})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer hint */}
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Data refreshed every 15s. Supervised-gates scope applied server-side
        via <code className="font-mono">users.supervised_gates</code>.
      </p>
    </section>
  );
}

export default EscalationPanel;
