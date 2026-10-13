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
  UserCheck,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface ShiftSummary {
  myRecent?: Array<{
    id: string;
    direction: string;
    gate_name?: string | null;
    gate_code?: string | null;
    timestamp: string;
    is_manual?: boolean;
  }>;
  todayShifts?: Array<{
    id?: string;
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

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function WorkerAttendanceInner() {
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
  const recent = summary?.myRecent ?? [];
  const today = summary?.todayShifts?.[0];
  const checkedIn = Boolean(today?.check_in);

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

      {error && <WidgetError message={`Attendance data unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">My Attendance</span>
            <span className="ml-auto">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                  checkedIn
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-400"
                }`}
              >
                {checkedIn ? "Present today" : "No attendance yet"}
              </span>
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading attendance…
            </div>
          ) : recent.length > 0 ? (
            <div className="min-w-0">
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Direction</th>
                      <th className="text-left px-4 py-2.5">Gate</th>
                      <th className="text-left px-4 py-2.5">Manual</th>
                      <th className="text-left px-4 py-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recent.slice(0, 15).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                              r.direction === "IN"
                                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                : "border-rose-400/30 bg-rose-400/10 text-rose-400"
                            }`}
                          >
                            {r.direction === "IN" ? "Entry" : "Exit"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                          {r.gate_name || r.gate_code || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {r.is_manual ? "Manual" : "Auto scan"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">{fmtTs(r.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
                Your own gate scan log only — {recent.length} recent movement(s). Institutional
                records of other persons are not accessible at this tier.
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No attendance scans recorded yet. Entry and exit gate scans will be listed here
                as they are captured for your account.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerAttendanceInner />
    </Suspense>
  );
}
