"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";


/** The operator's daily loop is the gate desk, not widgets: the landing
 * surface is one tap to YOUR assigned gate (or the claim flow when you
 * have none) — never "the first active gate". The retention stack stays
 * below the fold as Level B composition. */
function OperatorDeskHero() {
  const user = useAuthStore((s) => s.user);
  const gateId = user?.gateId;
  return (
    <WidgetBoundary name="DeskEntry" title="Your Desk">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-3">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {gateId ? `Your gate: ${gateId}` : "No gate assigned yet"}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {gateId
              ? "The scan desk opens on your assigned gate — one tap."
              : "Claim a gate (or use the desk picker) before you can scan."}
          </p>
        </div>
        <Link
          href={gateId ? `/gate/${gateId}` : "/operator/claim"}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-5 text-sm font-bold text-slate-950 transition-colors"
        >
          {gateId ? "Open gate desk" : "Claim your gate"}
        </Link>
      </div>
    </WidgetBoundary>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <PageHeader title="Operator" subtitle="Gate operations" />
          <OperatorDeskHero />
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
            <PersonalizedCampusHome />
          </WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity">
            <TaskContinuity />
          </WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
            <UnifiedCampusCalendar />
          </WidgetBoundary>
          <WidgetBoundary name="DigitalHandover" title="Digital Handover">
            <DigitalHandover />
          </WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions">
            <QuickActions />
          </WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center">
            <NotificationCenter />
          </WidgetBoundary>
          <DevContactStrip />
        </div>
      </AuthGuard>
    </Suspense>
  );
}
