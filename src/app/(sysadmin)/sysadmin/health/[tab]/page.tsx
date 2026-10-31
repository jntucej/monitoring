"use client";

import { notFound } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useDashboardData } from "@/hooks/useDashboardData";
import { HealthContent } from "@/components/sysadmin/domains/monitoring/HealthContent";
import type { HealthData } from "@/components/sysadmin/domains/monitoring/types";

export const VALID_TABS = ["app", "database", "infra", "redis"] as const;
type Tab = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  app: "App Health",
  database: "Database",
  infra: "Infra",
  redis: "Redis",
};

/**
 * Shared health content view. Accepts the active tab as a prop (no URL
 * reading) — parent decides which tab is active. Used by:
 *   - /sysadmin/health/[tab] (path-segment migration)
 *   - /sysadmin/health        (legacy redirect → [tab])
 */
export function HealthTabContent({ tab }: { tab: Tab }) {
  const { data, loading, error, refresh, refreshKey } = useDashboardData<HealthData>(
    "/api/admin/health/overview",
    { ttlMs: 90_000, pollMs: 30_000 }
  );

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const tabLabel = useMemo(
    () => TAB_LABELS[tab] ?? "App Health",
    [tab]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Health"
        subtitle={`Monitoring domain · active view: ${tabLabel}`}
        onRefresh={onRefresh}
        refreshing={loading}
      />

      <WidgetBoundary title="Health content">
        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
            <p className="font-medium">Failed to load health data</p>
            <p className="mt-1 text-xs opacity-70">{error}</p>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            {loading ? "Loading health signals…" : "No health data available."}
          </div>
        ) : (
          <HealthContent data={data} activeTab={tab} onTabChange={() => {}} />
        )}
      </WidgetBoundary>

      <div data-refresh-key={refreshKey} className="hidden" aria-hidden />
    </div>
  );
}

/**
 * Server component: validates the [tab] param and renders the client
 * content. Invalid tab → 404.
 */
export default async function HealthTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!VALID_TABS.includes(tab as Tab)) notFound();

  return (
    <Suspense fallback={<PageLoading />}>
      <HealthTabContent tab={tab as Tab} />
    </Suspense>
  );
}
