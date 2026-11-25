"use client";

import { Suspense, useMemo, useState, useCallback } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { useApiResource } from "@/hooks/useApiResource";
import {
  Loader2,
  AlertTriangle,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { scanInspection } from "@/components/shared/inspectionModels";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

/* ── response shape (mirrors /api/admin/exceptions) ── */

interface ExceptionRow {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  scan_type: string | null;
  is_correction: boolean | null;
  created_at: string | null;
}

interface ExceptionsResponse {
  success: boolean;
  data: {
    transactions: ExceptionRow[];
    counts: {
      total: number;
      corrections: number;
      manual: number;
      denied: number;
    };
    allGates: boolean;
  };
}

type Filter = "ALL" | "CORRECTIONS" | "MANUAL" | "DENIED";

function safeText(v: string | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function tagsForRow(r: ExceptionRow): string[] {
  const tags: string[] = [];
  const reason = String(r.reason ?? "");
  if (/denied|rejected|blocked/i.test(reason)) tags.push("Denied");
  else if (/flagged|hold|violation|exception|correction/i.test(reason)) tags.push("Flagged");
  if (r.scan_type === "manual" || r.scan_type === "MANUAL" || r.scan_type === "true" || r.scan_type === "True") tags.push("Manual");
  if (Boolean(r.is_correction)) tags.push("Correction");
  return tags;
}

function tagClass(t: string): string {
  if (t === "Denied") return "text-action-danger";
  if (t === "Flagged") return "text-action-warning";
  return "text-action-info";
}

function AdminExceptionsInner() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const {
    data: resp,
    loading,
    error,
    refresh,
  } = useApiResource<ExceptionsResponse>("/api/admin/exceptions", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const rows = resp?.data?.transactions ?? [];
  const counts = resp?.data?.counts;
  const busy = loading && !resp;

  const filtered = useMemo(() => {
    switch (filter) {
      case "CORRECTIONS":
        return rows.filter((r) => Boolean(r.is_correction));
      case "MANUAL":
        return rows.filter((r) => r.scan_type === "manual" || r.scan_type === "MANUAL" || r.scan_type === "true" || r.scan_type === "True");
      case "DENIED":
        return rows.filter((r) => /denied|rejected|blocked/i.test(String(r.reason ?? "")));
      default:
        return rows;
    }
  }, [rows, filter]);

  const [activeException, setActiveException] = useState<ExceptionRow | null>(null);

  /** Standardized inspection model for a scan exception (context → timeline → actions). */
  /** Standardized inspection model for a scan exception (the registry). */
  const exceptionInspection = activeException ? scanInspection(activeException) : null;


  const fmtTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div className="space-y-6 min-w-0">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Today's flagged, denied, manual, and corrected gate scans across every gate"
        why="Decisions you make here update student statuses and gate logs in real time."
        contextLabel="Today's flagged, denied, manual, and corrected gate scans across every gate"
        statusSummary="Review current today's flagged, denied, manual, and corrected gate scans across every gate state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <PageHeader
        title="Scan Exceptions"
        subtitle="Today's flagged, denied, manual, and corrected gate scans across every gate"
        onRefresh={refreshAll}
      />

      <p className="text-xs text-text-muted max-w-2xl flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-action-warning shrink-0 mt-0.5" />
        Read-only review surface. Corrections and manual entries recorded by gate
        operators, plus scans the gate software flagged or denied. To investigate a
        person, open their roster entry from the Student/Staff module.
      </p>

      {/* Counts strip */}
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Exceptions today", value: counts.total },
            { label: "Corrections", value: counts.corrections },
            { label: "Manual entries", value: counts.manual },
            { label: "Denied scans", value: counts.denied },
          ].map((c) => (
            <div key={c.label} className="surface-card bg-bg-surface p-3 min-w-0">
              <p className="text-xl font-black text-text-primary">{c.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <WidgetBoundary title="Exceptions">
        <div className="rounded-xl bg-bg-elevated overflow-hidden min-w-0">
          {/* Filter tabs */}
          <div className="surface-card flex flex-wrap items-center gap-2 px-3 py-2 min-w-0">
            {(["ALL", "CORRECTIONS", "MANUAL", "DENIED"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={` min-h-11 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 "bg-action-primary/10 text-action-primary" "text-text-muted hover:text-text-primary" `}
              >
                {f === "ALL"
                  ? "All"
                  : f === "CORRECTIONS"
                    ? "Corrections"
                    : f === "MANUAL"
                      ? "Manual"
                      : "Denied"}
              </button>
            ))}
            <span className="ml-auto text-xs text-text-muted shrink-0">
              {busy ? "…" : `${filtered.length} shown`}
            </span>
          </div>

          {error ? (
            <div className="p-4 flex items-center gap-2 text-sm text-action-danger min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="truncate min-w-0">{error}</span>
            </div>
          ) : busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading exceptions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                No {filter === "ALL" ? "" : filter.toLowerCase() + " "}
                exceptions recorded across all gates today.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <ul className="sm:hidden divide-y divide-border">
                {filtered.map((r) => {
                  const tags = tagsForRow(r);
                  return (
                    <li
                      key={r.id}
                      className="px-3 py-3 space-y-1.5 cursor-pointer hover:bg-bg-surface/40 transition-colors"
                      onClick={() => setActiveException(r)}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {r.name || "—"}
                            {r.roll && (
                              <span className="ml-1.5 font-mono text-xs text-text-muted">{r.roll}</span>
                            )}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {fmtTime(r.timestamp)} · {safeText(r.gate_name ?? r.gate_id)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className={` rounded-full px-1.5 py-0.5 text-xs font-medium ${tagClass(t)}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      {r.reason && <p className="text-xs text-text-muted">Reason: {r.reason}</p>}
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w160">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2 font-semibold">Time</th>
                      <th className="text-left px-3 py-2 font-semibold">Person</th>
                      <th className="text-left px-3 py-2 font-semibold">Direction</th>
                      <th className="text-left px-3 py-2 font-semibold">Tag</th>
                      <th className="text-left px-3 py-2 font-semibold">Reason</th>
                      <th className="text-left px-3 py-2 font-semibold">Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r) => {
                      const tags = tagsForRow(r);
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-bg-surface transition-colors cursor-pointer"
                          onClick={() => setActiveException(r)}
                        >
                          <td className="px-3 py-2.5 text-text-muted text-xs whitespace-nowrap">
                            {fmtTime(r.timestamp)}
                          </td>
                          <td className="px-3 py-2.5 text-text-primary min-w-0">
                            <span className="font-semibold">{r.name || "—"}</span>
                            {r.roll && (
                              <span className="ml-1.5 font-mono text-xs text-text-muted">{r.roll}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-text-muted text-xs whitespace-nowrap">
                            {r.direction || "—"}
                          </td>
                          <td className="px-3 py-2.5 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {tags.length ? (
                                tags.map((t) => (
                                  <span
                                    key={t}
                                    className={` rounded-full px-2 py-0.5 text-xs font-medium ${tagClass(t)}`}
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-text-muted text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-text-muted text-xs max-w-55 truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-text-muted text-xs whitespace-nowrap">
                            {safeText(r.gate_name ?? r.gate_id)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspector inspection={exceptionInspection} onClose={() => setActiveException(null)} />
    </div>
  );
}

export default function AdminExceptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminExceptionsInner />
    </Suspense>
  );
}
