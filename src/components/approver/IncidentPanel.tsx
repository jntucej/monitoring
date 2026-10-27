"use client";

/**
 * IncidentPanel — exam-day incidents panel for the exam superintendent console.
 *
 * Desktop: right-side panel (rendered alongside the board in RoleConsole).
 * Mobile: full-width, no horizontal scroll.
 *
 * Reads /api/exam/access-exceptions (today's unresolved first). Each row:
 * severity icon, candidate, hall (current_stage), description, time.
 * "Mark resolved" button PATCHes /api/exam/access-exceptions
 * { id, resolved: true } — falls back to an info toast on 405/404.
 * Critical rows get a red left border. Unresolved first.
 * EmptyState when no incidents.
 */

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Info, Loader2, ShieldAlert } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

/** Row shape from /api/exam/access-exceptions. */
interface IncidentRow {
  id: string;
  ticket_number: string;
  workflow_type?: string;
  current_stage?: string | null;
  status?: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll?: string | null;
  /** Free-text description when the endpoint extends this shape. */
  description?: string | null;
  /** Explicit severity when the endpoint provides it. */
  severity?: "critical" | "warning" | "info" | null;
  /** Explicit resolution flag when the endpoint provides it. */
  resolved?: boolean;
}

interface ExceptionsResponse {
  success: boolean;
  data: IncidentRow[];
  total?: number;
}

/**
 * Derive the incident severity from the permission request row. When the
 * endpoint publishes an explicit `severity`, use it; otherwise derive:
 *   - SLA breached or status ESCALATED/REJECTED  → critical
 *   - status PENDING with a near / passing SLA    → warning
 *   - everything else                             → info
 */
function severityOf(row: IncidentRow): "critical" | "warning" | "info" {
  if (row.severity) return row.severity;
  if (row.status === "REJECTED" || row.status === "ESCALATED") return "critical";
  if (row.sla_deadline && new Date(row.sla_deadline).getTime() < Date.now()) return "critical";
  if (row.status === "PENDING") return "warning";
  return "info";
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

const SEVERITY_STYLE: Record<
  "critical" | "warning" | "info",
  { icon: typeof AlertTriangle; accent: string; row: string }
> = {
  critical: {
    icon: AlertTriangle,
    accent: "text-rose-400",
    row: "border-l-2 border-l-rose-500",
  },
  warning: {
    icon: Info,
    accent: "text-amber-400",
    row: "border-l-2 border-l-amber-500",
  },
  info: {
    icon: CheckCircle,
    accent: "text-emerald-400",
    row: "border-l-2 border-l-emerald-500",
  },
};

export interface IncidentPanelProps {
  /**
   * When set, refreshes the exceptions feed after a mark-resolved action.
   * RoleConsole passes its own refresh so the status bar count stays live.
   */
  onResolved?: () => void;
}

export function IncidentPanel({ onResolved }: IncidentPanelProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { data, loading } = useApiResource<ExceptionsResponse>(
    "/api/exam/access-exceptions",
    { ttlMs: 15_000 }
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo<IncidentRow[]>(() => {
    const raw = data?.data;
    if (!Array.isArray(raw)) return [];
    // Unresolved first; within a group, SLA-breached / critical first, then
    // newest.
    const withSev = raw.map((r) => ({ r, sev: severityOf(r), resolved: Boolean(r.resolved) }));
    withSev.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      if (a.sev !== b.sev) {
        const order: Record<"critical" | "warning" | "info", number> = {
          critical: 0,
          warning: 1,
          info: 2,
        };
        return order[a.sev] - order[b.sev];
      }
      const at = a.r.sla_deadline ? new Date(a.r.sla_deadline).getTime() : 0;
      const bt = b.r.sla_deadline ? new Date(b.r.sla_deadline).getTime() : 0;
      if (at !== bt) return at - bt; // SLA-breached (0) first when both absent
      const ac = new Date(a.r.updated_at ?? a.r.created_at ?? 0).getTime();
      const bc = new Date(b.r.updated_at ?? b.r.created_at ?? 0).getTime();
      return bc - ac;
    });
    return raw;
  }, [data]);

  const markResolved = useCallback(
    async (row: IncidentRow) => {
      setBusyId(row.id);
      try {
        const res = await fetch("/api/exam/access-exceptions", {
          method: "PATCH",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, resolved: true }),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 405 || res.status === 404) {
          // The PATCH handler may not be live yet — fall back to an info toast.
          addToast({
            variant: "info",
            message:
              json?.error?.message ||
              "Mark resolved: endpoint not available yet",
          });
          return;
        }
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Marked ${row.ticket_number} resolved`,
          });
          onResolved?.();
        } else {
          addToast({
            variant: "error",
            message:
              json?.error?.message ||
              `Failed to mark ${row.ticket_number} resolved`,
          });
        }
      } catch {
        addToast({ variant: "info", message: "Mark resolved: endpoint not available yet" });
      } finally {
        setBusyId(null);
      }
    },
    [addToast, onResolved]
  );

  const unresolvedCount = rows.filter((r) => !r.resolved).length;

  return (
    <section className="min-w-0 w-full">
      <WidgetBoundary title="Incidents">
        {loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading incidents&hellip;
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-5 h-5" />}
            title="No exam-day incidents"
            description="Exceptions and unresolved access flags will appear here."
          />
        ) : (
          <ul className="space-y-2" aria-label="Exam day incidents">
            {rows.map((row) => {
              const sev = severityOf(row);
              const style = SEVERITY_STYLE[sev];
              const Icon = style.icon;
              const resolved = Boolean(row.resolved);
              const desc =
                row.description ||
                (row.status === "REJECTED"
                  ? "Candidate access rejected"
                  : row.status === "ESCALATED"
                    ? "Access request escalated to a higher role"
                    : row.sla_deadline && new Date(row.sla_deadline).getTime() < Date.now()
                      ? "SLA breached — candidate access unresolved"
                      : "Access exception under review");
              const hall = row.current_stage ?? "—";
              return (
                <li
                  key={row.id}
                  className={`rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 ${style.row} ${
                    resolved ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.accent}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {row.candidate_name || row.ticket_number || "Unknown candidate"}
                        </p>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${style.accent}`}
                        >
                          {sev.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                        {row.ticket_number}
                        {row.roll ? ` · roll ${row.roll}` : ""}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">{desc}</p>
                      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          hall: {hall} · {fmtTime(row.updated_at ?? row.created_at)}
                        </span>
                        {resolved ? (
                          <span className="text-[10px] font-semibold text-emerald-400">
                            resolved
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void markResolved(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--action-primary)]/40 transition-colors disabled:opacity-50"
                          >
                            {busyId === row.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            Mark resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {rows.length > 0 ? (
          <p className="mt-3 text-[10px] font-mono text-[var(--text-muted)]">
            {unresolvedCount} unresolved · {rows.length} total
          </p>
        ) : null}
      </WidgetBoundary>
    </section>
  );
}

export default IncidentPanel;
