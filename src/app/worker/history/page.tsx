"use client";

import { Suspense, useCallback, useState } from "react";
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
  History,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Inbox,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

/* response shapes */

interface HistoryShift {
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  scans: number;
  gates: number;
}

interface HistoryResponse {
  success: boolean;
  data: {
    days: number;
    shifts: HistoryShift[];
    recentlyCompleted: Array<{
      id: string;
      ticket: string;
      status: string;
      updatedAt: string;
    }>;
    totals: {
      totalDays: number;
      checkIns: number;
      checkOuts: number;
    } | null;
  };
}

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

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

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDay(d: string): string {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function WorkerHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const [rangeDays, setRangeDays] = useState<number>(30);
  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<HistoryResponse>(
    `/api/workers/personal-history?days=${rangeDays}`,
    { ttlMs: 30_000, deps: [rangeDays] }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const d = data?.data;
  const shifts = d?.shifts ?? [];
  const completed = d?.recentlyCompleted ?? [];

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
        <div className="flex items-center gap-2 shrink-0">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setRangeDays(o.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                rangeDays === o.value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <WidgetError message={`History unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Personal History">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              My Shift &amp; Work History
            </span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {d ? `${d.days}-day window` : "—"}
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading personal history…
            </div>
          ) : (
            <div className="p-4 min-w-0 space-y-5">
              {/* Totals strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CalendarDays className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Shift Days</span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-sky-400">
                    {d?.totals?.totalDays ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">days with at least one gate scan</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Check-ins / Check-outs
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-emerald-400">
                    {d?.totals?.checkIns ?? 0} / {d?.totals?.checkOuts ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Work Items Closed
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-amber-400">{completed.length}</p>
                </div>
              </div>

              {/* Shift days table */}
              {shifts.length > 0 ? (
                <div className="overflow-x-auto min-w-0">
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recent shift days
                  </p>
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5">Day</th>
                        <th className="text-left px-4 py-2.5">Check-in</th>
                        <th className="text-left px-4 py-2.5">Check-out</th>
                        <th className="text-left px-4 py-2.5">Scans</th>
                        <th className="text-left px-4 py-2.5">Gates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {shifts.slice(0, 20).map((s) => (
                        <tr key={s.day} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5 text-slate-200 font-medium whitespace-nowrap">
                            {fmtDay(s.day)}
                          </td>
                          <td className="px-4 py-2.5 text-emerald-400 text-xs whitespace-nowrap">
                            {s.checkIn ? fmtTs(s.checkIn) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-sky-400 text-xs whitespace-nowrap">
                            {s.checkOut ? fmtTs(s.checkOut) : "On duty"}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">{s.scans}</td>
                          <td className="px-4 py-2.5 text-slate-400">{s.gates}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center">
                  <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    No shift days in this window. History appears here from your own gate
                    scans — other persons&apos; movement records are not accessible at this
                    tier.
                  </p>
                </div>
              )}

              {/* Recently closed work items */}
              {completed.length > 0 && (
                <div>
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recently closed work items
                  </p>
                  <div className="px-4 space-y-2 min-w-0">
                    {completed.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs text-slate-300">{c.ticket}</span>
                        <span className="text-xs text-slate-500 capitalize">
                          {c.status.replace(/_/g, " ")}
                        </span>
                        <span className="ml-auto text-xs text-slate-500 shrink-0">
                          {fmtTs(c.updatedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-0 text-xs text-slate-500 min-w-0">
                This history is personal and assignment-scoped: worker permissions are based
                on assigned duties only — institutional movement records of other persons are
                not exposed at this tier.
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerHistoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerHistoryInner />
    </Suspense>
  );
}
