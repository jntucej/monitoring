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
  Inbox,
  Loader2,
  AlertTriangle,
  FileText,
  ArrowRight,
} from "lucide-react";

/* response shapes (mirror /api/campus-extra/analytics) */

interface AnalyticsResponse {
  success: boolean;
  data?: {
    metrics?: Array<{ key: string; label: string; value: number; unit?: string }>;
    seriesData?: Array<Record<string, string | number>>;
    role?: string;
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
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center text-sm min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-slate-400">{message}</p>
      </div>
    </div>
  );
}

/* main content */

function WardenHostelReportsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<AnalyticsResponse>(
    "/api/campus-extra/analytics?date_range=7d&hostel=wards",
    { ttlMs: 60_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 60_000, enabled: !!user });

  const metrics = data?.data?.metrics ?? [];
  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/warden"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Warden Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {/* error banner */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Hostel reports unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Report summary cards */}
      <WidgetBoundary title="Hostel Reports — 7-day Summary">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            Loading reports…
          </div>
        ) : metrics.length === 0 ? (
          <EmptyState message="No hostel report metrics are available for this role right now." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 min-w-0">
            {metrics.map((m) => (
              <div
                key={m.key}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {m.label}
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {m.value}
                  {m.unit ? (
                    <span className="ml-1 text-xs text-slate-400 font-normal">{m.unit}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WardenHostelReportsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenHostelReportsInner />
    </Suspense>
  );
}
