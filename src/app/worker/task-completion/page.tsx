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
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

/* response shapes */

interface MyWorkResponse {
  success: boolean;
  data: {
    tasks: unknown[];
    completedLastWeek: number;
    todayShift: {
      checkIn: string | null;
      checkOut: string | null;
      scans: number;
    } | null;
  };
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

function WorkerTaskCompletionInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<MyWorkResponse>("/api/workers/my-work", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const completed = data?.data?.completedLastWeek ?? 0;
  const open = data?.data?.tasks?.length ?? 0;
  const shift = data?.data?.todayShift;

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

      {error && <WidgetError message={`Completion data unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Task Completion">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Task Completion</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">Last 7 days</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading completion stats…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 min-w-0 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Completed (7d)</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-400">{completed}</p>
                    <p className="text-xs text-slate-500">Tasks closed in your queue this week</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 min-w-0 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Still Open</p>
                    <p className="mt-1 text-2xl font-bold text-amber-400">{open}</p>
                    <p className="text-xs text-slate-500">Tasks awaiting your next action</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wide">Completion ratio</p>
                <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden min-w-0">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width:
                        open + completed > 0
                          ? `${Math.round((completed / (open + completed)) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 min-w-0">
                  {shift?.checkIn
                    ? `Today: checked in ${new Date(shift.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · ${shift.scans} scan(s)`
                    : "No gate check-in recorded today yet."}
                  {open === 0 && completed > 0
                    ? " All open tasks are cleared — well done."
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerTaskCompletionPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerTaskCompletionInner />
    </Suspense>
  );
}
