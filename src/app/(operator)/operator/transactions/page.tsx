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
  ListOrdered,
  Clock,
  Inbox,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

/* ── response shapes (mirror src/app/api/operator/transactions/route.ts) ── */

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
  scan_type: string | null;
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

type DirectionFilter = "ALL" | "IN" | "OUT";

function OperatorTransactionsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<TransactionsResponse>("/api/operator/transactions", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const [filter, setFilter] = useState<DirectionFilter>("ALL");
  const busy = loading && !data;
  const rows = data?.data?.transactions ?? [];
  const counts = data?.data?.counts;

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    return rows.filter((r) => r.direction === filter);
  }, [rows, filter]);

  const fmtTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <ListOrdered className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
              Today&rsquo;s Gate Transactions
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
            {data?.data?.gateScoped
              ? "Scoped to your assigned gate · Asia/Kolkata day"
              : "All active gates · Asia/Kolkata day"}
            {" · "}
            {counts ? `${counts.total} records` : "loading"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} />
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Transactions unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Movement Log">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          {/* Counts strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b border-[var(--border)]">
            {[
              { label: "Total", value: counts?.total ?? 0, tone: "text-[var(--text-primary)]" },
              { label: "Entries", value: counts?.entries ?? 0, tone: "text-emerald-400" },
              { label: "Exits", value: counts?.exits ?? 0, tone: "text-rose-400" },
              { label: "Manual", value: counts?.manual ?? 0, tone: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="px-4 py-3 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {s.label}
                </p>
                <p className={`text-xl font-bold tabular-nums mt-0.5 ${s.tone}`}>
                  {busy ? "—" : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Direction filter */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] overflow-x-auto no-scrollbar min-w-0">
            {(["ALL", "IN", "OUT"] as DirectionFilter[]).map((f) => (
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
                {f === "ALL" ? "All" : f === "IN" ? "Entries" : "Exits"}
              </button>
            ))}
            <span className="ml-auto text-xs text-[var(--text-muted)] shrink-0">
              {busy ? "…" : `${filtered.length} shown`}
            </span>
          </div>

          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading today&rsquo;s movements…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                No {filter === "ALL" ? "" : filter === "IN" ? "entry" : "exit"} transactions
                recorded yet today.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-semibold">Time</th>
                    <th className="text-left px-3 py-2 font-semibold">Person</th>
                    <th className="text-left px-3 py-2 font-semibold">Direction</th>
                    <th className="text-left px-3 py-2 font-semibold">Reason</th>
                    <th className="text-left px-3 py-2 font-semibold">Gate</th>
                    <th className="text-left px-3 py-2 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((r) => (
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
                        {r.person_type && (
                          <span className="ml-1.5 rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] uppercase">
                            {r.person_type}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.direction === "IN" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Entry
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Exit
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs">
                        {r.reason || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] text-xs">
                        {r.gate_name || r.gate_id || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {r.scan_type === "manual" || r.scan_type === "MANUAL" ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-amber-400 font-medium">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            {r.scan_type === "correction" ? "Correction" : "Scan"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2.5 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Auto-refreshes every 30 seconds.
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorTransactionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OperatorTransactionsInner />
    </Suspense>
  );
}
