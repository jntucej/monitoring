"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Package,
  Building2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Users,
  Wrench,
} from "lucide-react";

/* response shapes */

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

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
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

/* main content */

function HostelManagerResourceManagementInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hostel_manager") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });
  const {
    data: analytics,
    loading: analyticsLoading,
    refresh: refreshAnalytics,
  } = useApiResource<AnalyticsResponse>("/api/campus-extra/analytics?role=hostel_manager&date_range=7d", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshPresence(), refreshAnalytics()]);
  }, [refreshPresence, refreshAnalytics]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = (presenceLoading && !presence) || (analyticsLoading && !analytics);

  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = useMemo(
    () =>
      gates.reduce(
        (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
        0
      ),
    [gates, matrix]
  );

  const studentOnCampus = useMemo(
    () => gates.reduce((sum, g) => sum + (matrix[g.id]?.["student"] ?? 0), 0),
    [gates, matrix]
  );

  const metrics = analytics?.data?.metrics ?? [];
  const metricValue = (key: string) =>
    metrics.find((m) => m.key === key)?.value ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/hostel-manager"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Operations Overview
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

      {/* Authority note */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
        <p className="text-sm text-slate-300 min-w-0">
          The hostel manager owns <span className="font-semibold text-sky-300">resources and facilities</span> —
          rooms, beds, utilities, and stock. They do <span className="font-semibold text-rose-300">not</span> hold
          hostel-disciplinary authority or final outpass power; outpass decisions route through the warden/principal chain.
        </p>
      </div>

      {/* KPI row */}
      <WidgetBoundary title="Resource Management">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Users}
            label="Students On Campus"
            value={studentOnCampus}
            sub="Residents currently inside active gates"
            accent="text-sky-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Building2}
            label="Total On Campus"
            value={onCampusTotal}
            sub="All roles across active gates"
            accent="text-emerald-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Package}
            label="Stock / Resources"
            value={metricValue("stock") ?? "live"}
            sub="Resource metrics from the manager analytics view"
            accent="text-amber-400"
            loading={analyticsLoading && !analytics}
          />
          <StatCard
            icon={Wrench}
            label="Facilities"
            value={gates.length}
            sub="Gates and access points in the management scope"
            accent="text-white"
            loading={presenceLoading && !presence}
          />
        </div>
      </WidgetBoundary>

      {/* Manager analytics metrics */}
      <WidgetBoundary title="Manager Metrics">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-white">7-Day Resource Metrics</span>
          </div>
          {analyticsLoading && !analytics ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading…
            </div>
          ) : metrics.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <AlertTriangle className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No manager analytics metrics are available for this role yet. Resource metrics
                will appear once the analytics view is populated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 min-w-0">
              {metrics.map((m) => (
                <div key={m.key} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide truncate">{m.label}</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {m.value}
                    {m.unit ? <span className="ml-1 text-xs font-normal text-slate-400">{m.unit}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function HostelManagerResourceManagementPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelManagerResourceManagementInner />
    </Suspense>
  );
}
