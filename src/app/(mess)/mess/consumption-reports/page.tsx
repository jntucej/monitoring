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
  TrendingUp,
  ScanLine,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";

interface ConsumptionDay {
  messDayId: string;
  mealDate: string;
  mealType: string;
  isActive: boolean;
  servedTotal: number;
  viaToken: number;
  viaManual: number;
  veg: number;
  nonVeg: number;
  firstServedAt: string | null;
  lastServedAt: string | null;
}

interface ConsumptionResponse {
  success: boolean;
  data: {
    days: number;
    trend: ConsumptionDay[];
    totals: {
      served: number;
      viaToken: number;
      viaManual: number;
      veg: number;
      nonVeg: number;
    };
    avgPerDay: number;
  };
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
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
        className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function MessConsumptionReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);

  const {
    data: report,
    loading,
    error,
    refresh,
  } = useApiResource<ConsumptionResponse>("/api/mess/consumption?days=14", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !report;
  const d = report?.data;
  const trend = d?.trend ?? [];
  const maxServed = trend.reduce((m, r) => Math.max(m, r.servedTotal), 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex min-h-[44px] items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <WidgetError message={`Consumption report unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      <WidgetBoundary title="Consumption Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Consumption Reports</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">last {d?.days ?? 14} days</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading consumption report…
            </div>
          ) : trend.length > 0 ? (
            <div className="p-4 min-w-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Total Served</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{d?.totals?.served}</p>
                  <p className="text-xs text-slate-500">{d?.avgPerDay} avg/day</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Via Token Scan</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{d?.totals?.viaToken}</p>
                  <p className="text-xs text-slate-500">{d?.totals?.viaManual} manual confirmations</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Veg</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{d?.totals?.veg}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Non-Veg</p>
                  <p className="mt-1 text-lg font-bold text-rose-400">{d?.totals?.nonVeg}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Daily trend
                </p>
                <div className="space-y-1.5 min-w-0">
                  {trend.slice(0, 14).map((row) => (
                    <div key={row.messDayId} className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 w-24 shrink-0 truncate">
                        {fmtDate(row.mealDate)}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden min-w-0">
                        <div
                          className={`h-full rounded-full ${row.isActive ? "bg-emerald-400/70" : "bg-slate-600"}`}
                          style={{
                            width: maxServed > 0 ? `${Math.max(4, (row.servedTotal / maxServed) * 100)}%` : "4%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-14 text-right shrink-0">
                        {row.servedTotal} meals
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-4 py-2.5">Type</th>
                      <th className="text-left px-4 py-2.5">Served</th>
                      <th className="text-left px-4 py-2.5">Veg / Non-Veg</th>
                      <th className="text-left px-4 py-2.5">Method</th>
                      <th className="text-left px-4 py-2.5">Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {trend.map((row) => (
                      <tr key={row.messDayId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 text-slate-200 font-medium whitespace-nowrap">
                          {fmtDate(row.mealDate)}
                          {!row.isActive && (
                            <span className="ml-2 text-[10px] text-slate-500 uppercase">closed</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 capitalize whitespace-nowrap">
                          {row.mealType}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-400 font-semibold">{row.servedTotal}</td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {row.veg} / {row.nonVeg}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap text-xs">
                          {row.viaToken} scan · {row.viaManual} manual
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                          {fmtTime(row.firstServedAt)} – {fmtTime(row.lastServedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-slate-500 min-w-0 flex items-center gap-2">
                <ScanLine className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                Servings stream from the token scanner and manual confirmations.
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No consumption recorded in the last {d?.days ?? 14} days. Meals served through the{" "}
                <Link href="/mess/scan" className="text-emerald-400 hover:underline">
                  Token Scanner
                </Link>{" "}
                will appear here.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessConsumptionReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessConsumptionReportsInner />
    </Suspense>
  );
}
