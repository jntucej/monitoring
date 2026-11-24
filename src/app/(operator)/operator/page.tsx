"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import Link from "next/link";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { OperatorWidgetBoundary as WidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { gateLiveInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { DoorOpen, ChevronRight } from "lucide-react";

import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { QuickActions } from "@/components/operator/shared/QuickActions";
import { PageHeader } from "@/components/operator/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { useGateStore } from "@/stores/gateStore";


/** The operator's daily loop is the gate desk, not widgets: the landing
 * surface is one tap to YOUR assigned gate (or the claim flow when you
 * have none) — never "the first active gate". The retention stack stays
 * below the fold as Level B composition. */
function OperatorDeskHero() {
  const user = useAuthStore((s) => s.user);
  const gateId = user?.gateId;
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();
  const gateMeta = useGateStore((s) => s.gate);

  const openGateInspector = () => {
    if (!gateId) return;
    inspect(
      gateLiveInspection(
        {
          id: gateId,
          name: gateMeta?.name ?? `Gate ${gateId}`,
          isActive: true,
          onPost: 0,
          lastActivity: null,
        },
        role,
      ),
    );
  };

  return (
    <WidgetBoundary name="DeskEntry" title="Your Desk">
      <div className="surface-card bg-bg-surface p-4 sm:p-5 space-y-3">
        <div
          onClick={openGateInspector}
          className={gateId ? "cursor-pointer" : undefined}
          role={gateId ? "button" : undefined}
          tabIndex={gateId ? 0 : undefined}
          onKeyDown={gateId ? (e) => e.key === "Enter" && openGateInspector() : undefined}
        >
          <div className="flex items-center gap-2 min-w-0">
            <DoorOpen className="w-4 h-4 text-action-info shrink-0" />
            <p className="text-sm font-bold text-text-primary min-w-0">
              {gateId ? `Your gate: ${gateId}` : "No gate assigned yet"}
            </p>
            {gateId && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0 ml-auto" />}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {gateId
              ? "The scan desk opens on your assigned gate — tap the card to inspect its live status."
              : "Claim a gate (or use the desk picker) before you can scan."}
          </p>
        </div>
        <Link
          href={gateId ? `/gate/${gateId}` : "/operator/claim"}
          className="surface-card inline-flex min-h-11 items-center justify-center gap-2 bg-action-primary px-5 text-sm font-bold text-black transition-colors"
        >
          {gateId ? "Open gate desk" : "Claim your gate"}
        </Link>
      </div>
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </WidgetBoundary>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <PageHeader title="Operator" subtitle="Gate operations" />
          <ContextSituationBar
            roleLabel="Gate Operator"
            purpose="Daily operational hub for assigned entry points, campus transit policies, and shift handover"
            contextLabel="Gate Workspace"
            statusSummary="Check assigned gate duties, active pass queues, or claim an active terminal for your shift."
            primaryAction={{ label: "Open Gate Desk", href: "/operator/claim" }}
            secondaryAction={{ label: "Pass Verification", href: "/operator/pass-verification" }}
          />
          <OperatorDeskHero />
          <WidgetBoundary name="DigitalHandover" title="Digital Handover">
            <DigitalHandover />
          </WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions">
            <QuickActions />
          </WidgetBoundary>

        </div>
      </AuthGuard>
    </Suspense>
  );
}
