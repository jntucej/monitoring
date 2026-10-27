"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { HealthContent, TABS } from "@/components/sysadmin/domains/monitoring/HealthContent";
import type { HealthData } from "@/components/sysadmin/domains/monitoring/types";

type TabId = "app" | "database" | "infra" | "redis";

const VALID_TABS = new Set<string>(["app", "database", "infra", "redis"]);

/**
 * Sysadmin HEALTH page — the tabbed-page reference for the monitoring domain.
 *
 * Tabs (app / database / infra / redis) are driven by `?tab=` in the URL so
 * deep-linking works. Data is fetched from /api/admin/health/overview via
 * useDashboardData (cached + visibility-aware polling).
 *
 * The `useSearchParams()` consumer lives in `HealthPageInner`; the default
 * export wraps it in a `<Suspense>` boundary so Next.js can prerender the
 * page without a hard "wrap in Suspense" build error.
 */
function HealthPageInner() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "app";
  const activeTab: TabId = VALID_TABS.has(rawTab) ? (rawTab as TabId) : "app";

  const { data, loading, error, refresh, refreshKey } = useDashboardData<HealthData>(
    "/api/admin/health/overview",
    { ttlMs: 90_000, pollMs: 30_000 }
  );

  const [initialised, setInitialised] = useState(false);

  // Keep the tab in sync with the URL once searchParams are available.
  // No router mutation here — the tab is read from the URL, and tab switches
  // update the URL via a controlled state that mirrors searchParams.
  const [localTab, setLocalTab] = useState<TabId>(activeTab);
  const tab: TabId = initialised ? localTab : activeTab;

  // Mark initialised after the first render so the URL-driven tab wins first.
  useEffect(() => {
    setLocalTab(activeTab);
    setInitialised(true);
  }, [activeTab]);

  const setActiveTab = useCallback((next: TabId) => {
    setLocalTab(next);
  }, []);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const tabLabel = useMemo(
    () => TABS.find((t) => t.id === tab)?.label ?? "App",
    [tab]
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Health"
        subtitle={`Monitoring domain · active view: ${tabLabel}`}
        onRefresh={onRefresh}
        refreshing={loading}
      />

      {/* Tab bar */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3"
        role="tablist"
        aria-label="Health sections"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setActiveTab(id as TabId)}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === id
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
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
          <HealthContent data={data} activeTab={tab} onTabChange={setActiveTab} />
        )}
      </WidgetBoundary>

      {/* refreshKey is exposed so callers can reset boundaries on re-fetch */}
      <div data-refresh-key={refreshKey} className="hidden" aria-hidden />
    </div>
  );
}

export default function SysAdminHealthPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HealthPageInner />
    </Suspense>
  );
}
