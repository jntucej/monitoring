"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Person, Scan } from "@/lib/types";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Repeat,
} from "lucide-react";

/* ── shapes ── */

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface HistoryResponse {
  success: boolean;
  data?: { history: Scan[] };
}

/* ── feed row ── */

function MovementRow({ scan }: { scan: Scan }) {
  const isIn = String(scan.direction ?? "").toUpperCase().startsWith("IN") || String(scan.direction ?? "").toUpperCase() === "ENTRY";
  const when = new Date(scan.timestamp).toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border)]/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isIn ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
          }`}
        >
          {isIn ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {isIn ? "Entry" : "Exit"}
            {scan.gateName ? <span className="text-[var(--text-muted)] font-normal"> · {scan.gateName}</span> : null}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {scan.isManual ? "Manual entry · " : ""}
            {when}
          </p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
    </div>
  );
}

/* ── main ── */

function MovementInfoInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  // Ward list — the parent-style source (scoped to linked students only).
  const {
    data: persons,
    loading: personsLoading,
    error: personsError,
    refresh: refreshPersons,
  } = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const wards: Person[] = persons?.data ?? [];
  const [selected, setSelected] = useState<string>("");
  const activeRoll = wards.some((w) => (w.uniqueId || w.roll) === selected)
    ? selected
    : (wards[0]?.uniqueId || wards[0]?.roll || "");

  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    refresh: refreshHistory,
  } = useApiResource<HistoryResponse>(
    activeRoll ? `/api/persons/${encodeURIComponent(activeRoll)}/history?limit=25` : null,
    { ttlMs: 60_000, enabled: !!activeRoll }
  );

  useEffect(() => {
    if (!selected && wards[0]) setSelected(wards[0].uniqueId || wards[0].roll || "");
  }, [wards, selected]);

  const scans = useMemo<Scan[]>(() => {
    const h = history?.data?.history;
    return Array.isArray(h) ? h : [];
  }, [history]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshPersons(), refreshHistory()]);
  }, [refreshPersons, refreshHistory]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!userId && wards.length > 0 });

  const activeWard = wards.find((w) => (w.uniqueId || w.roll) === activeRoll);
  const total = wards.length;
  const entries = scans.filter((s) =>
    String(s.direction ?? "").toUpperCase().startsWith("IN") || String(s.direction ?? "").toUpperCase() === "ENTRY"
  ).length;
  const exits = scans.length - entries;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Repeat className="w-6 h-6 text-emerald-400" />
            Authorised Movement Information
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Recent authorised entry and exit activity recorded at the gates for your wards
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={personsLoading || historyLoading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          {(personsLoading || historyLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
          {personsLoading || historyLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {personsError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Could not load ward movement records.
          </span>
          <button
            type="button"
            onClick={() => void refreshPersons()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {personsLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading movement records…
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)]/60 p-8 text-center text-sm text-[var(--text-muted)]">
          No wards linked to your account yet. Movement records appear once a student is linked.
        </div>
      ) : (
        <>
          {/* ward selector */}
          <div className="flex flex-wrap gap-2">
            {wards.map((w) => {
              const roll = w.uniqueId || w.roll || "";
              const isActive = roll === activeRoll;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelected(roll)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors motion-reduce:transition-none ${
                    isActive
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-400 font-semibold"
                      : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span className="truncate max-w-40">{w.fullName || w.name || "Ward"}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{roll}</span>
                </button>
              );
            })}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Wards linked", value: String(total), accent: "text-white" },
              { label: "Entries (recent)", value: String(entries), accent: "text-emerald-400" },
              { label: "Exits (recent)", value: String(exits), accent: "text-rose-400" },
              {
                label: "Last activity",
                value: scans[0]?.timestamp
                  ? new Date(scans[0].timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—",
                accent: "text-sky-400",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{kpi.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${kpi.accent}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* movement feed */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Recent gate movements
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {activeWard ? `Showing ${activeWard.fullName || activeWard.name || "ward"} (last 25 movements)` : ""}
                </p>
              </div>
              <span className="text-xs text-[var(--text-muted)]">{scans.length} movement(s)</span>
            </div>
            {historyError ? (
              <div className="p-4 text-sm text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {historyError}
              </div>
            ) : historyLoading && scans.length === 0 ? (
              <div className="p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading movements…
              </div>
            ) : scans.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                No gate movements recorded for this ward yet.
              </div>
            ) : (
              <div className="px-4 py-2 divide-y divide-[var(--border)]/50">
                {scans.map((s, i) => (
                  <MovementRow key={s.id ?? `${s.timestamp}-${i}`} scan={s} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function MovementInfoPage() {
  return (
    <WidgetBoundary title="Authorised Movement Information">
      <Suspense fallback={<PageLoading />}>
        <MovementInfoInner />
      </Suspense>
    </WidgetBoundary>
  );
}
