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
  FileText,
  Clock,
  Loader2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

/* response shapes */

interface WorkOrder {
  id: string;
  ticket: string;
  type: string;
  stage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requesterName?: string | null;
  requesterId?: string | null;
}

interface WorkOrdersResponse {
  success: boolean;
  data: {
    open: WorkOrder[];
    recentlyClosed: Array<{ id: string; ticket: string; status: string; updatedAt: string }>;
    totalOpen: number;
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

function WorkerWorkOrdersInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<WorkOrdersResponse>("/api/workers/my-work-orders", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const open = data?.data?.open ?? [];
  const closed = data?.data?.recentlyClosed ?? [];
  const totalOpen = data?.data?.totalOpen ?? 0;

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

      {error && <WidgetError message={`Work orders unavailable: ${error}`} onRetry={() => void refreshAll()} />}

      <WidgetBoundary title="Work Order Updates">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Open Work Orders</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">{totalOpen} open</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading work orders…
            </div>
          ) : open.length > 0 ? (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Ticket</th>
                    <th className="text-left px-4 py-2.5">Requester</th>
                    <th className="text-left px-4 py-2.5">Stage</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-left px-4 py-2.5">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {open.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">{o.ticket}</td>
                      <td className="px-4 py-2.5 text-slate-300 min-w-0 truncate">
                        {o.requesterName ?? (o.requesterId ? `Worker ${o.requesterId}` : "—")}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 capitalize whitespace-nowrap">{o.stage}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmtTs(o.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No open work orders. All maintenance work items are resolved — new orders
                surface here as they are raised.
              </p>
            </div>
          )}

          {closed.length > 0 && (
            <div className="border-t border-slate-800 min-w-0">
              <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recently closed
              </p>
              <div className="px-4 pb-4 space-y-2 min-w-0">
                {closed.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-300">{c.ticket}</span>
                    <span className="text-xs text-slate-500 capitalize">{c.status.replace(/_/g, " ")}</span>
                    <span className="ml-auto text-xs text-slate-500 shrink-0">{fmtTs(c.updatedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            Work orders are scoped to your assigned duties. Institutional movement records of
            other persons are not visible at this tier.
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerWorkOrdersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerWorkOrdersInner />
    </Suspense>
  );
}
