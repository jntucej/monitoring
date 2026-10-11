"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";

const MIN_TIER = 60;
const ALERTS_URL = "/api/admin/security/stats";

function WardenDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "warden") as Role;
  const tier = getRoleTier(role);

  const { data, loading, error, refresh } = useApiResource<Record<string, number>>(
    ALERTS_URL,
    { ttlMs: 10_000 }
  );

  // Visibility-aware polling — no leaked intervals, no background churn.
  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warden Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Data fetch failed: {error}
        </div>
      )}

      {/* Role-scoped, conditional alerts — the ONLY alert surface on this page. */}
      <WidgetBoundary title="Alerts">
        <ConditionalAlert
          ctx={{
            role,
            userId: user?.id ?? "unknown",
            gateId: user?.gateId ?? null,
            departmentId: user?.departmentId ?? null,
            assignedHostel: user?.assignedHostel ?? null,
            metrics: data ?? {},
          }}
          limit={5}
        />
      </WidgetBoundary>

      {/* TODO: role-specific widgets. Wrap each in its own WidgetBoundary. */}
    </div>
  );
}

export default function WardenDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <WardenDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
