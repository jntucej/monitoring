"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { PageHeader } from "@/components/shared/PageHeader";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SafetyContent } from "@/components/sysadmin/domains/alerts/SafetyContent";
import type { SafetyEnvelope } from "@/components/sysadmin/domains/alerts/types";

function SafetyInner() {
  const { data, loading, error, refresh } = useDashboardData<SafetyEnvelope>(
    "/api/admin/safety/overview",
    {
      ttlMs: 45_000,
      pollMs: 15_000,
    }
  );
  // ok() wraps the payload in { data: SafetyData } — unwrap for the content.
  const payload = data?.data ?? null;

  const busy = loading && !payload;

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Safety & Security Control"
        subtitle="Gate lockdown cockpit: secure / elevated / critical states plus the incident timeline"
        onRefresh={refresh}
        refreshing={loading && data != null}
      />

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Safety state unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Safety">
        {busy ? (
          <div className="grid gap-3">
            <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : (
          payload && <SafetyContent data={payload} />
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function SafetyHubPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <SafetyInner />
      </Suspense>
    </AuthGuard>
  );
}
