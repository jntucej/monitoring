"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Loader2,
  ListOrdered,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface TransactionRow {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  timestamp: string;
  gate_name: string | null;
}

interface StatsResponse {
  success: boolean;
  data: {
    transactions: TransactionRow[];
    counts: { total: number; entries: number; exits: number };
    gateScoped: boolean;
  };
}

function OperatorStatsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<StatsResponse>("/api/operator/transactions", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data?.transactions ?? [];
  const counts = data?.data?.counts;
  const busy = loading && !data;

  // Top-5 frequent students today
  const topStudents = useMemo(() => {
    const freq: Record<string, { name: string; roll: string; count: number }> = {};
    for (const r of rows) {
      const key = r.roll || r.name || r.id;
      if (!freq[key]) freq[key] = { name: r.name || "—", roll: r.roll || "—", count: 0 };
      freq[key].count += 1;
    }
    return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [rows]);

  const fmtTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">My Stats</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
            {data?.data?.gateScoped
              ? "Scoped to your assigned gate · Asia/Kolkata day"
              : "All active gates · Asia/Kolkata day"}
            {" · "}
            {counts ? `${counts.total} records` : "loading"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            <span className="truncate">Stats unavailable: {error}</span>
          </span>
          <button type="button" onClick={() => void refresh()} className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        {[
          { label: "Total Scans", value: counts?.total ?? 0, tone: "text-[var(--text-primary)]", icon: ListOrdered },
          { label: "Entries", value: counts?.entries ?? 0, tone: "text-emerald-400", icon: ArrowDownLeft },
          { label: "Exits", value: counts?.exits ?? 0, tone: "text-rose-400", icon: ArrowUpRight },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.tone} shrink-0`} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>{busy ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* IN/OUT split visual */}
      <OperatorWidgetBoundary title="Today&apos;s Split">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 min-w-0">
          {counts && counts.total > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Entries</span>
                <span>{counts.entries} ({Math.round((counts.entries / counts.total) * 100)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(counts.entries / counts.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Exits</span>
                <span>{counts.exits} ({Math.round((counts.exits / counts.total) * 100)}%)</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${(counts.exits / counts.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">No scans recorded yet today.</p>
          )}
        </div>
      </OperatorWidgetBoundary>

      {/* Top-5 frequent students */}
      <OperatorWidgetBoundary title="Top 5 Frequent Students Today">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading…
            </div>
          ) : topStudents.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <p className="text-sm text-[var(--text-muted)]">No student activity recorded yet today.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] min-w-0">
              {topStudents.map((s, i) => (
                <li key={s.roll || s.name || i} className="px-4 py-3 flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-[var(--text-muted)] w-5 text-center">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">{s.roll}</p>
                  </div>
                  <span className="rounded-full bg-[var(--action-primary)]/10 text-[var(--action-primary)] text-xs font-bold px-2.5 py-1 shrink-0">
                    {s.count}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorStatsPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorStatsInner />
    </Suspense>
  );
}
