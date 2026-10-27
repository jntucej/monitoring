"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Loader2,
  AlertTriangle,
  Inbox,
  Clock,
  ShieldAlert,
} from "lucide-react";

/* ── response shapes ── */

interface TransactionRow {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  scan_type: boolean | null;
  is_correction: boolean | null;
  created_at: string | null;
}

interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: TransactionRow[];
    counts: { total: number; entries: number; exits: number; manual: number; flagged: number };
    gateScoped: boolean;
    gateId: string | null;
  };
}

interface PermissionsResponse {
  success: boolean;
  data: Array<{
    id: string;
    ticket_number?: string;
    workflow_type?: string;
    status?: string;
    created_at?: string;
    student?: { name?: string; unique_id?: string } | null;
  }>;
  total?: number;
}

type Filter = "ALL" | "FLAGGED" | "DENIED" | "MANUAL";

function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function ExceptionsInner() {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<Filter>("ALL");

  const {
    data: transactions,
    loading: txLoading,
    error: txError,
    refresh: refreshTransactions,
  } = useApiResource<TransactionsResponse>("/api/operator/transactions", {
    ttlMs: 30_000,
  });

  // Rejected permissions that touched the main-gate stage today — the
  // operator's denied-entries source.
  const {
    data: deniedPerms,
    loading: permLoading,
    error: permError,
    refresh: refreshPerms,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=hostel&status=REJECTED",
    { ttlMs: 60_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshTransactions(), refreshPerms()]);
  }, [refreshTransactions, refreshPerms]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = transactions?.data?.transactions ?? [];
  const busy = txLoading && !transactions;

  const isFlagged = (r: TransactionRow) =>
    Boolean(r.is_correction) ||
    (r.reason !== null && r.reason !== undefined &&
      /denied|rejected|blocked|violation|exception|correction|hold/i.test(
        String(r.reason)
      ));

  const isDenied = (r: TransactionRow) =>
    r.reason !== null &&
    r.reason !== undefined &&
    /denied|rejected|blocked/i.test(String(r.reason));

  const isManual = (r: TransactionRow) =>
    r.scan_type === true;

  const filtered = useMemo(() => {
    switch (filter) {
      case "FLAGGED":
        return rows.filter(isFlagged);
      case "DENIED":
        return rows.filter(isDenied);
      case "MANUAL":
        return rows.filter(isManual);
      default:
        return rows.filter((r) => isFlagged(r) || isDenied(r) || isManual(r));
    }
     
  }, [rows, filter]);

  const deniedPermissionRows = useMemo(() => {
    const cutoff = new Date().setHours(0, 0, 0, 0);
    return (deniedPerms?.data ?? []).filter((p) => {
      const created = p.created_at ? new Date(p.created_at).getTime() : 0;
      return created >= cutoff;
    });
     
  }, [deniedPerms]);

  const fmtTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {(txError || permError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate min-w-0">
            {[txError, permError].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}

      <WidgetBoundary title="Today&rsquo;s Exceptions">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] overflow-x-auto no-scrollbar min-w-0">
            {(["ALL", "FLAGGED", "DENIED", "MANUAL"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 ${
                  filter === f
                    ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {f === "ALL"
                  ? "All exceptions"
                  : f === "FLAGGED"
                    ? "Flagged"
                    : f === "DENIED"
                      ? "Denied"
                      : "Manual"}
              </button>
            ))}
            <span className="ml-auto text-xs text-[var(--text-muted)] shrink-0">
              {busy ? "…" : `${filtered.length} shown`}
            </span>
          </div>

          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading exceptions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                No exceptions {filter === "ALL" ? "" : filter.toLowerCase()}
                recorded in the selected filter today.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards — no horizontal scroll */}
              <ul className="sm:hidden divide-y divide-[var(--border)]">
                {filtered.map((r) => {
                  const tags: string[] = [];
                  if (isDenied(r)) tags.push("Denied");
                  if (isFlagged(r)) tags.push("Flagged");
                  if (isManual(r)) tags.push("Manual");
                  if (Boolean(r.is_correction)) tags.push("Correction");
                  return (
                    <li key={r.id} className="px-3 py-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {r.name || "—"}
                            {r.roll && (
                              <span className="ml-1.5 font-mono text-xs text-[var(--text-muted)]">{r.roll}</span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {fmtTime(r.timestamp)} · {safeText(r.gate_name ?? r.gate_id)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                                t === "Denied"
                                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                  : t === "Flagged"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                    : "border-sky-500/30 bg-sky-500/10 text-sky-400"
                              }`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      {r.reason && <p className="text-xs text-[var(--text-muted)]">Reason: {r.reason}</p>}
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2 font-semibold">Time</th>
                      <th className="text-left px-3 py-2 font-semibold">Person</th>
                      <th className="text-left px-3 py-2 font-semibold">Tag</th>
                      <th className="text-left px-3 py-2 font-semibold">Reason</th>
                      <th className="text-left px-3 py-2 font-semibold">Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filtered.map((r) => {
                      const tags: string[] = [];
                      if (isDenied(r)) tags.push("Denied");
                      if (isFlagged(r)) tags.push("Flagged");
                      if (isManual(r)) tags.push("Manual");
                      if (Boolean(r.is_correction))
                        tags.push("Correction");
                      return (
                        <tr key={r.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                          <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs whitespace-nowrap">
                            {fmtTime(r.timestamp)}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-primary)] min-w-0">
                            <span className="font-semibold">{r.name || "—"}</span>
                            {r.roll && (
                              <span className="ml-1.5 font-mono text-xs text-[var(--text-muted)]">
                                {r.roll}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {tags.length ? (
                                tags.map((t) => (
                                  <span
                                    key={t}
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                      t === "Denied"
                                        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                        : t === "Flagged"
                                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                          : "border-sky-500/30 bg-sky-500/10 text-sky-400"
                                    }`}
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[var(--text-muted)] text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs max-w-[220px] truncate">
                            {r.reason || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs whitespace-nowrap">
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

      {/* Denied hostel passes (workflow) */}
      <WidgetBoundary title="Rejected Passes Today">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              Hostel passes rejected at the main-gate stage today
            </span>
          </div>
          {permLoading && !deniedPerms ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading rejected passes…
            </div>
          ) : deniedPermissionRows.length === 0 ? (
            <div className="p-4 text-center min-w-0">
              <Clock className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">
                No hostel passes were rejected at the main-gate stage today.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] min-w-0">
              {deniedPermissionRows.map((p) => (
                <li key={p.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {p.student?.name || "Unknown applicant"}
                      {p.student?.unique_id && (
                        <span className="ml-1.5 font-mono text-xs text-[var(--text-muted)]">
                          {p.student.unique_id}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {p.ticket_number || p.id}
                    </p>
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 shrink-0">
                    REJECTED
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorExceptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExceptionsInner />
    </Suspense>
  );
}
