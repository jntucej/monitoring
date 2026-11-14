"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

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
    <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="surface-card min-h11 inline-flex items-center justify-center px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
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
        className="inline-flex min-h11 items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <WidgetError message={`Consumption report unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      <WidgetBoundary title="Consumption Reports">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-action-success shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Consumption Reports</span>
            <span className="ml-auto text-xs text-text-muted shrink-0">last {d?.days ?? 14} days</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading consumption report…
            </div>
          ) : trend.length > 0 ? (
            <div className="p-4 min-w-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Total Served</p>
                  <p className="mt-1 text-lg font-bold text-action-success">{d?.totals?.served}</p>
                  <p className="text-xs text-text-muted">{d?.avgPerDay} avg/day</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Via Token Scan</p>
                  <p className="mt-1 text-lg font-bold text-action-info">{d?.totals?.viaToken}</p>
                  <p className="text-xs text-text-muted">{d?.totals?.viaManual} manual confirmations</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Veg</p>
                  <p className="mt-1 text-lg font-bold text-action-success">{d?.totals?.veg}</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Non-Veg</p>
                  <p className="mt-1 text-lg font-bold text-action-danger">{d?.totals?.nonVeg}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Daily trend
                </p>
                <div className="space-y-1.5 min-w-0">
                  {trend.slice(0, 14).map((row) => (
                    <div key={row.messDayId} className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-text-muted w-24 shrink-0 truncate">
                        {fmtDate(row.mealDate)}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-bg-elevated overflow-hidden min-w-0">
                        <div
                          className={`h-full rounded-full ${row.isActive ? "bg-emerald-400/70" : "bg-bg-elevated"}`}
                          style={{
                            width: maxServed > 0 ? `${Math.max(4, (row.servedTotal / maxServed) * 100)}%` : "4%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-14 text-right shrink-0">
                        {row.servedTotal} meals
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w160">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
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
                      <tr key={row.messDayId} className="hover:bg-bg-elevated/30 transition-colors">
                        <td className="px-4 py-2.5 text-text-secondary font-medium whitespace-nowrap">
                          {fmtDate(row.mealDate)}
                          {!row.isActive && (
                            <span className="ml-2 text-xs text-text-muted uppercase">closed</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-muted capitalize whitespace-nowrap">
                          {row.mealType}
                        </td>
                        <td className="px-4 py-2.5 text-action-success font-semibold">{row.servedTotal}</td>
                        <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                          {row.veg} / {row.nonVeg}
                        </td>
                        <td className="px-4 py-2.5 text-text-muted whitespace-nowrap text-xs">
                          {row.viaToken} scan · {row.viaManual} manual
                        </td>
                        <td className="px-4 py-2.5 text-text-muted text-xs whitespace-nowrap">
                          {fmtTime(row.firstServedAt)} – {fmtTime(row.lastServedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-text-muted min-w-0 flex items-center gap-2">
                <ScanLine className="w-3.5 h-3.5 text-text-muted shrink-0" />
                Servings stream from the token scanner and manual confirmations.
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted max-w-md mx-auto">
                No consumption recorded in the last {d?.days ?? 14} days. Meals served through the{" "}
                <Link href="/mess/scan" className="text-action-success hover:underline">
                  Token Scanner
                </Link>{" "}
                will appear here.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

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
