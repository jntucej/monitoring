"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

import type { Person, Scan } from "@/lib/types";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  Loader2,
  ArrowRight,
  Repeat,
  CheckCircle2,
  XCircle,
  AlertCircle
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
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isIn ? "bg-emerald-500/15 text-action-success" : "bg-rose-500/15 text-action-danger"
          }`}
        >
          {isIn ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">
            {isIn ? "Entry" : "Exit"}
            {scan.gateName ? <span className="text-text-muted font-normal"> · {scan.gateName}</span> : null}
          </p>
          <p className="text-xs text-text-muted">
            {scan.isManual ? "Manual entry · " : ""}
            {when}
          </p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-text-muted shrink-0" />
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
            <Repeat className="w-6 h-6 text-action-success" />
            Authorised Movement Information
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Recent authorised entry and exit activity recorded at the gates for your wards
          </p>
        </div>
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
        <div className="rounded-xl border border-border bg-bg-surface p-6 flex items-center gap-3 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading movement records…
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-base/60 p-8 text-center text-sm text-text-muted">
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
                      ? "border-emerald-400/50 bg-emerald-500/10 text-action-success font-semibold"
                      : "border-border bg-bg-surface text-text-secondary hover:bg-bg-elevated"
                  }`}
                >
                  <span className="truncate max-w-40">{w.fullName || w.name || "Ward"}</span>
                  <span className="font-mono text-xs text-text-muted">{roll}</span>
                </button>
              );
            })}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Wards linked", value: String(total), accent: "text-white" },
              { label: "Entries (recent)", value: String(entries), accent: "text-action-success" },
              { label: "Exits (recent)", value: String(exits), accent: "text-action-danger" },
              {
                label: "Last activity",
                value: scans[0]?.timestamp
                  ? new Date(scans[0].timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—",
                accent: "text-action-info",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border bg-bg-surface p-3 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{kpi.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${kpi.accent}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* movement feed */}
          <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  Recent gate movements
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {activeWard ? `Showing ${activeWard.fullName || activeWard.name || "ward"} (last 25 movements)` : ""}
                </p>
              </div>
              <span className="text-xs text-text-muted">{scans.length} movement(s)</span>
            </div>
            {historyError ? (
              <div className="p-4 text-sm text-action-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {historyError}
              </div>
            ) : historyLoading && scans.length === 0 ? (
              <div className="p-6 flex items-center gap-3 text-text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading movements…
              </div>
            ) : scans.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">
                No gate movements recorded for this ward yet.
              </div>
            ) : (
              <div className="px-4 py-2 divide-y divide-border/50">
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
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <MovementInfoInner />
      </Suspense>
    </AuthGuard>
  );
}
