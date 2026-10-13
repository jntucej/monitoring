"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Timer,
  UserCheck,
  LogOut,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface ShiftSummary {
  shiftStatus?: string;
  myRecent?: unknown[];
  openWorkOrders?: unknown[];
  todayShifts?: Array<{
    id?: string;
    name?: string;
    worker_id?: string;
    check_in?: string | null;
    check_out?: string | null;
    scans?: number;
  }>;
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function hoursBetween(a: string | null, b: string | null): string {
  if (!a || !b) return "0.0";
  try {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return (Math.max(0, ms) / 3_600_000).toFixed(1);
  } catch {
    return "0.0";
  }
}

function WorkerShiftInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/workers/my-shift", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const summary = ((data as { data?: ShiftSummary } | null)?.data) as ShiftSummary | undefined;
  const today = summary?.todayShifts?.[0];
  const onShift = Boolean(today?.check_in && !today.check_out);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/worker"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <WidgetError message={`Shift data unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Shift Information">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Today&apos;s Shift</span>
            <span className="ml-auto">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                  onShift
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : today?.check_in
                      ? "border-slate-600/40 bg-slate-700/20 text-slate-400"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                }`}
              >
                {onShift ? "On shift" : today?.check_in ? "Shift complete" : "Awaiting check-in"}
              </span>
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading shift information…
            </div>
          ) : today?.check_in || today?.check_out ? (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0 flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Check-in</p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-400">{fmtTime(today.check_in)}</p>
                    <p className="text-xs text-slate-500">Gate scan recorded</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0 flex items-start gap-3">
                  <LogOut className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Check-out</p>
                    <p className="mt-0.5 text-xl font-bold text-sky-400">
                      {today.check_out ? fmtTime(today.check_out) : "—"}
                    </p>
                    <p className="text-xs text-slate-500">{onShift ? "Still on duty" : "Shift closed"}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0 flex items-start gap-3">
                  <Timer className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Hours Logged</p>
                    <p className="mt-0.5 text-xl font-bold text-amber-400">
                      {hoursBetween(
                        today.check_in ?? null,
                        today.check_out ?? (onShift ? new Date().toISOString() : null)
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{today.scans ?? 0} gate scan(s)</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Shift data is derived from your own gate scan log. Worker shift records are
                personal — you do not see other workers&apos; shifts.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No gate scans recorded for today yet. Your shift check-in appears here as
                soon as your first gate scan of the day is captured.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerShiftPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerShiftInner />
    </Suspense>
  );
}
