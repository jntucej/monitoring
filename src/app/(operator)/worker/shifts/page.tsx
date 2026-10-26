"use client";

import { Suspense, useMemo } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Loader2, Clock, ArrowRight } from "lucide-react";

interface MovementRow {
  id: string;
  direction: string;
  gate_name?: string;
  is_manual?: boolean;
  timestamp: string;
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

  const myRecent = useMemo(() => data?.data?.myRecent ?? [], [data]);
  const todayShift = data?.data?.todayShifts?.[0];

  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <Clock className="h-6 w-6 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">My Shift</h1>
          <p className="text-sm text-slate-400 min-w-0">Today&apos;s gate check-in/out activity</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Shift data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Today">
        <div className="min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading…
            </div>
          ) : todayShift ? (
            <div className="flex flex-wrap items-center gap-6 p-1 min-w-0">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Check-in</p>
                <p className="mt-1 text-lg font-mono font-semibold text-emerald-400">{fmtTime(todayShift.check_in)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Check-out</p>
                <p className="mt-1 text-lg font-mono font-semibold text-rose-400">{fmtTime(todayShift.check_out)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Scans</p>
                <p className="mt-1 text-lg font-mono font-semibold text-slate-200">{todayShift.scans ?? 0}</p>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Clock className="h-6 w-6 text-slate-500" />} title="No shift recorded today" description="Gate check-ins will appear here once recorded." />
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Recent Gate Activity">
        <div className="min-w-0">
          {myRecent.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No recent gate scans recorded.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {myRecent.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 ${m.direction === "IN" ? "text-emerald-400" : "text-slate-400"}`}
                      style={m.direction === "OUT" ? { transform: "scaleX(-1)" } : undefined}
                    />
                    <span className="text-sm text-slate-200 truncate">
                      {m.gate_name ?? "Gate"}
                      {m.is_manual ? " (manual)" : ""}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-slate-500">
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
      </WidgetBoundary>
    </div>
  );
}

export default function WorkerShiftsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WorkerShiftsInner />
    </Suspense>
  );
}
