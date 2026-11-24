"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorEmptyState } from "@/components/operator/shared/OperatorEmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { Loader2, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { transactionInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";

interface MovementRow {
  id: string;
  direction: string;
  gate_name?: string;
  gate_id?: string | null;
  is_manual?: boolean;
  timestamp: string;
  roll?: string | null;
  name?: string | null;
  person_type?: string | null;
  reason?: string | null;
  is_correction?: boolean | null;
  scan_type?: string | null;
}

interface TodayShiftRow {
  id: string;
  name: string;
  worker_id: string;
  check_in?: string | null;
  check_out?: string | null;
  scans?: number;
}

interface MyShiftResponse {
  success: boolean;
  data: {
    myRecent: MovementRow[];
    todayShifts: TodayShiftRow[];
  };
}

const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

function WorkerShiftsInner() {
  const { data, loading, error } = useApiResource<MyShiftResponse>("/api/workers/my-shift", {
    ttlMs: 30_000,
  });
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();

  const myRecent = useMemo(() => data?.data?.myRecent ?? [], [data]);
  const todayShift = data?.data?.todayShifts?.[0];

  const busy = loading && !data;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6 min-w-0">
      <ContextSituationBar
        roleLabel="Campus Operator · Worker"
        purpose="Track daily gate check-in/out records, scan counts, and active duty timing."
        contextLabel="Shift & Gate Presence"
        statusTone={todayShift?.check_in ? "ok" : "info"}
        statusPill={todayShift?.check_in ? "Shift Logged" : "No Shift Active"}
        statusSummary={
          todayShift?.check_in
            ? `Shift started at ${fmtTime(todayShift.check_in)} with ${todayShift.scans ?? 0} scan(s) logged.`
            : "No active shift logged yet today. Check-in records and gate scans will show here."
        }
        primaryAction={{ label: "Work Orders", href: "/worker/work-orders" }}
        secondaryAction={{ label: "Worker Today", href: "/worker" }}
      />

      <div className="flex items-center gap-3 min-w-0">
        <Clock className="h-6 w-6 text-action-success shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">My Shift</h1>
          <p className="text-sm text-text-muted min-w-0">Today&apos;s gate check-in/out activity</p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning">
          Shift data unavailable: {error}
        </div>
      )}

      <OperatorWidgetBoundary title="Today">
        <div className="min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading…
            </div>
          ) : todayShift ? (
            <div className="flex flex-wrap items-center gap-6 p-1 min-w-0">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Check-in</p>
                <p className="mt-1 text-lg font-mono font-semibold text-action-success">{fmtTime(todayShift.check_in)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Check-out</p>
                <p className="mt-1 text-lg font-mono font-semibold text-action-danger">{fmtTime(todayShift.check_out)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Scans</p>
                <p className="mt-1 text-lg font-mono font-semibold text-text-secondary">{todayShift.scans ?? 0}</p>
              </div>
            </div>
          ) : (
            <OperatorEmptyState
              icon={<Clock className="h-6 w-6 text-text-muted" />}
              title="No shift recorded today"
              description="Gate check-ins will appear here once recorded. You can inspect work orders or check the worker dashboard."
              action={
                <Link
                  href="/worker/work-orders"
                  className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  Inspect Work Orders
                </Link>
              }
            />
          )}
        </div>
      </OperatorWidgetBoundary>

      <OperatorWidgetBoundary title="Recent Gate Activity">
        <div className="min-w-0">
          {myRecent.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No recent gate scans recorded.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {myRecent.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0 cursor-pointer hover:bg-bg-surface/40 transition-colors"
                  onClick={() =>
                    inspect(
                      transactionInspection(
                        {
                          id: m.id,
                          roll: m.roll ?? null,
                          name: m.name ?? null,
                          person_type: m.person_type ?? null,
                          direction: m.direction,
                          reason: m.reason ?? null,
                          gate_id: m.gate_id ?? null,
                          gate_name: m.gate_name ?? null,
                          timestamp: m.timestamp,
                          scan_type: m.scan_type ?? (m.is_manual ? "manual" : null),
                          is_correction: m.is_correction ?? null,
                        },
                        role,
                      ),
                    )
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 ${m.direction === "IN" ? "text-action-success" : "text-text-muted"}`}
                      style={m.direction === "OUT" ? { transform: "scaleX(-1)" } : undefined}
                    />
                    <span className="text-sm text-text-secondary truncate">
                      {m.gate_name ?? "Gate"}
                      {m.is_manual ? " (manual)" : ""}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {new Date(m.timestamp).toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </OperatorWidgetBoundary>

      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function WorkerShiftsPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <WorkerShiftsInner />
    </Suspense>
  );
}
