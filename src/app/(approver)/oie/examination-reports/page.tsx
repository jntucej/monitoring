"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading, TableSkeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  ArrowRight,
  FileBarChart,
  Loader2,
  Clock,
  AlertTriangle,
  Inbox,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: Array<{ key: string; label: string; value: number; unit?: string }>;
    seriesData: Array<Record<string, string | number>>;
    role: string;
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function ExaminationReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh: refreshAnalytics,
  } = useApiResource<AnalyticsResponse>(
    "/api/campus-extra/analytics?role=oie&date_range=30d",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshAnalytics();
  }, [refreshAnalytics]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const metrics = data?.data?.metrics ?? [];
  const seriesData = data?.data?.seriesData ?? [];

  const metricValue = useMemo(
    () => (key: string) => metrics.find((m) => m.key === key)?.value ?? 0,
    [metrics]
  );

  // Render series chart (simple bar-style)
  const maxSeries = useMemo(() => {
    if (seriesData.length === 0) return 0;
    return Math.max(
      ...seriesData.map((s) => Number(s.resolved ?? s.pending ?? s.scans ?? s.alerts ?? 0))
    );
  }, [seriesData]);

  const seriesLabels = useMemo(
    () =>
      seriesData.map((s) => {
        const label = String(s.date ?? "").slice(5); // MM-DD
        const value = Number(s.resolved ?? s.pending ?? s.scans ?? s.alerts ?? 0);
        return { label, value };
      }),
    [seriesData]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <ErrorBanner
          message={`Examination reports data failed to load: ${error}`}
          onRetry={() => void refreshAnalytics()}
        />
      )}

      {/* KPI row */}
      <WidgetBoundary title="Examination Reports — 30-Day KPIs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          {loading && metrics.length === 0 ? (
            <div className="p-4">
              <TableSkeleton rows={2} />
            </div>
          ) : metrics.length > 0 ? (
            metrics.map((m, i) => (
              <StatCard
                key={m.key}
                icon={i === 0 ? TrendingUp : i === 1 ? CalendarDays : i === 2 ? Inbox : FileBarChart}
                label={m.label}
                value={
                  <span>
                    {m.value}
                    {m.unit ? <span className="text-sm text-slate-500 ml-1">{m.unit}</span> : null}
                  </span>
                }
                sub={m.key}
                accent={i === 0 ? "text-emerald-400" : i === 1 ? "text-sky-400" : i === 2 ? "text-amber-400" : "text-white"}
                loading={loading && !data}
              />
            ))
          ) : (
            <EmptyState message="No report data available for the selected period. Exam season metrics will appear once activity is recorded." />
          )}
        </div>
      </WidgetBoundary>

      {/* Series chart */}
      <WidgetBoundary title="Daily Activity Trend">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              30-Day Examination Activity
            </span>
          </div>
          {loading && seriesLabels.length === 0 ? (
            <div className="p-4">
              <TableSkeleton rows={2} />
            </div>
          ) : seriesLabels.length > 0 ? (
            <div className="p-4">
              <div className="flex items-end gap-1 h-32 min-w-0" role="img" aria-label="Daily activity bar chart">
                {seriesLabels.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full rounded-t bg-emerald-500/60 min-w-1"
                      style={{
                        height: maxSeries > 0
                          ? `${Math.max(4, (s.value / maxSeries) * 100)}px`
                          : "4px",
                      }}
                      title={`${s.label}: ${s.value}`}
                    />
                    <span className="text-[10px] text-slate-500 rotate-0">{s.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {seriesLabels.length} days with recorded activity in the last 30 days.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No daily trend data for this period yet.</p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExaminationReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExaminationReportsInner />
    </Suspense>
  );
}
