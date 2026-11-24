"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorEmptyState } from "@/components/operator/shared/OperatorEmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { Loader2, ClipboardList, CheckCircle2 } from "lucide-react";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { requestInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { FrontlineSubjectSheet } from "@/components/nav/level1/FrontlinePivot";
import type { FrontlineSubject } from "@/components/nav/level1/FrontlinePivot";

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
  const { inspection, inspect, closeInspection } = useRoleInspectorHost();
  // L1 FrontlinePivot: duty-scoped subject sheet.
  const [frontlineSubject, setFrontlineSubject] = useState<FrontlineSubject | null>(null);

  const open = useMemo(() => data?.data?.open ?? [], [data]);
  const recentlyClosed = useMemo(() => data?.data?.recentlyClosed ?? [], [data]);
  const totalOpen = data?.data?.totalOpen ?? 0;

  const busy = loading && !data;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
      <ContextSituationBar
        roleLabel="Campus Operator · Worker"
        purpose="Review assigned campus maintenance requests and execute frontline work orders."
        contextLabel="Assigned Work Orders"
        statusTone={totalOpen > 0 ? "warn" : "ok"}
        statusPill={totalOpen > 0 ? `${totalOpen} Open` : "Queue Clear"}
        statusSummary={
          totalOpen > 0
            ? `You have ${totalOpen} pending work order${totalOpen === 1 ? "" : "s"} requiring attention.`
            : "All caught up. No pending work orders assigned to you right now."
        }
        primaryAction={{ label: "View Shifts", href: "/worker/shifts" }}
        secondaryAction={{ label: "Worker Today", href: "/worker" }}
      />

      <div className="flex items-center gap-3 min-w-0">
        <ClipboardList className="h-6 w-6 text-action-info shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">My Work Orders</h1>
          <p className="text-sm text-text-muted min-w-0">Maintenance tasks assigned to you</p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning">
          Work orders unavailable: {error}
        </div>
      )}

      <OperatorWidgetBoundary title="Open">
        <div className="min-w-0">
          <p className="mb-3 text-xs text-text-muted">{totalOpen} open task(s)</p>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading…
            </div>
          ) : open.length === 0 ? (
            <OperatorEmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-action-success" />}
              title="All caught up"
              description="No open work orders assigned to you right now. You can check your shift or return to the main dashboard."
              action={
                <Link
                  href="/worker/shifts"
                  className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  View Shifts
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-800">
              {open.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0 cursor-pointer hover:bg-bg-surface/40 transition-colors"
                  onClick={() => inspect(requestInspection(o))}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{o.ticket}</p>
                    <p className="text-xs text-text-muted truncate">
                      {o.requesterName ? `${o.requesterName} · ` : ""}
                      {o.type ?? "task"}
                      {o.stage ? ` · ${o.stage}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontlineSubject({
                          id: o.id,
                          name: o.ticket,
                          code: o.id,
                          statusTag: o.status ?? "PENDING",
                          locationOrScope: o.stage ? `Stage: ${o.stage}` : undefined,
                        });
                      }}
                      className="surface-card min-h11 px-2 py-0.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:bg-bg-surface transition-colors"
                    >
                      Verify
                    </button>
                    <span className="surface-card shrink-0 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-action-warning">
                      {o.status ?? "PENDING"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </OperatorWidgetBoundary>

      {recentlyClosed.length > 0 && (
        <OperatorWidgetBoundary title="Recently Closed">
          <div className="min-w-0">
            <div className="divide-y divide-slate-800">
              {recentlyClosed.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0 cursor-pointer hover:bg-bg-surface/40 transition-colors"
                  onClick={() =>
                    inspect(
                      requestInspection({
                        id: c.id,
                        ticket: c.ticket,
                        status: c.status,
                        updatedAt: c.updatedAt,
                      }),
                    )
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{c.ticket}</p>
                    {c.updatedAt && (
                      <p className="text-xs text-text-muted">
                        Updated {new Date(c.updatedAt).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <span className="surface-card shrink-0 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-action-success">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </OperatorWidgetBoundary>
      )}

      <EntityInspector inspection={inspection} onClose={closeInspection} />

      {/* L1 FrontlinePivot: duty-scoped subject sheet */}
      <FrontlineSubjectSheet
        subject={frontlineSubject}
        onClose={() => setFrontlineSubject(null)}
      />
    </div>
  );
}

export default function WorkerWorkOrdersPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <WorkerWorkOrdersInner />
    </Suspense>
  );
}
