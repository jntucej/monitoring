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
  Wrench,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Inbox,
  Hammer,
} from "lucide-react";

/* response shapes */

interface MaintenanceTask {
  id: string;
  ticket: string;
  type: string;
  stage: string;
  status: string;
  createdAt: string;
}

interface MyWorkResponse {
  success: boolean;
  data: {
    tasks: MaintenanceTask[];
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

function WorkerMaintenanceInner() {
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
  const tasks = data?.data?.tasks ?? [];

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

      {error && <WidgetError message={`Maintenance tasks unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Maintenance Tasks">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Wrench className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Maintenance Tasks</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {tasks.length} open · {data?.data?.completedLastWeek ?? 0} closed (7d)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading maintenance tasks…
            </div>
          ) : tasks.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Ticket</th>
                    <th className="text-left px-4 py-2.5">Task</th>
                    <th className="text-left px-4 py-2.5">Stage</th>
                    <th className="text-left px-4 py-2.5">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <Hammer className="w-3.5 h-3.5 text-slate-500" />
                          {t.ticket}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 capitalize whitespace-nowrap">
                        {t.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 capitalize whitespace-nowrap">{t.stage}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmtTs(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No maintenance tasks assigned right now. Tasks routed to your duties appear
                here with their current approval stage.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerMaintenancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerMaintenanceInner />
    </Suspense>
  );
}
