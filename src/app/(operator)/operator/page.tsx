"use client";

import { Suspense, useCallback, useMemo } from "react";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";

const MIN_TIER = 20;

/*
 * The operator desk shows its OWN role-scoped alerts only. The previous
 * pull of system-wide security stats (admin telemetry) was
 * removed — a gate operator should not surface privileged security
 * counters. If operator-specific metrics ever ship, fetch them here.
 */

function OperatorDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "operator") as Role;
  const tier = getRoleTier(role);

  const metrics = useMemo<Record<string, number>>(() => ({
    overdue: 0,
    curfewexceeded: 0,
    capacitybreach: 0,
  }), []);

  const refresh = useCallback(async () => {
    // No server-side data to refresh — alerts are derived from local role
    // context. Poller kept no-op-safe for visibility-aware scheduling.
  }, []);

  // Visibility-aware polling — no leaked intervals, no background churn.
  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
          </p>
        </div>
        <p className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)]">
          Role-scoped alerts only — gate-specific telemetry
        </p>
      </div>

      {/* Role-scoped, conditional alerts — the ONLY alert surface on this page. */}
      <WidgetBoundary title="Alerts">
        <div className="min-w-0">
          <ConditionalAlert
            ctx={{
              role,
              userId: user?.id ?? "unknown",
              gateId: user?.gateId ?? null,
              departmentId: user?.departmentId ?? null,
              assignedHostel: user?.assignedHostel ?? null,
              metrics,
            }}
            limit={5}
          />
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--text-muted)]">
            No active alerts for your gate right now.
          </div>
        </div>
      </WidgetBoundary>

      {/* Contact the developer (all roles) */}
      <DevContactStrip />
    </div>
  );
}

export default function OperatorDashboardPage() {
  return (

      <Suspense fallback={<PageLoading />}>
        <OperatorDashboardInner />
      </Suspense>
    
  );
}
