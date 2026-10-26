"use client";

import { useMemo } from "react";
import { Suspense } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader2, ClipboardList, CheckCircle2 } from "lucide-react";

interface WorkOrderRow {
  id: string;
  ticket: string;
  type?: string;
  stage?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  requesterName?: string;
  requesterId?: string;
}

interface RecentlyClosedRow {
  id: string;
  ticket: string;
  status: string;
  updatedAt?: string;
}

interface MyWorkOrdersResponse {
  success: boolean;
  data: {
    open: WorkOrderRow[];
    recentlyClosed: RecentlyClosedRow[];
    totalOpen: number;
  };
}

function WorkerWorkOrdersInner() {
  const { data, loading, error } = useApiResource<MyWorkOrdersResponse>("/api/workers/my-work-orders", {
    ttlMs: 30_000,
  });

  const open = useMemo(() => data?.data?.open ?? [], [data]);
  const recentlyClosed = useMemo(() => data?.data?.recentlyClosed ?? [], [data]);
  const totalOpen = data?.data?.totalOpen ?? 0;

  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <ClipboardList className="h-6 w-6 text-sky-400 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">My Work Orders</h1>
          <p className="text-sm text-slate-400 min-w-0">Maintenance tasks assigned to you</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Work orders unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Open">
        <div className="min-w-0">
          <p className="mb-3 text-xs text-slate-500">{totalOpen} open task(s)</p>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading…
            </div>
          ) : open.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} title="All caught up" description="No open work orders assigned to you right now." />
          ) : (
            <div className="divide-y divide-slate-800">
              {open.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{o.ticket}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {o.requesterName ? `${o.requesterName} · ` : ""}
                      {o.type ?? "task"}
                      {o.stage ? ` · ${o.stage}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                    {o.status ?? "PENDING"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {recentlyClosed.length > 0 && (
        <WidgetBoundary title="Recently Closed">
          <div className="min-w-0">
            <div className="divide-y divide-slate-800">
              {recentlyClosed.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{c.ticket}</p>
                    {c.updatedAt && (
                      <p className="text-xs text-slate-500">
                        Updated {new Date(c.updatedAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </WidgetBoundary>
      )}
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
