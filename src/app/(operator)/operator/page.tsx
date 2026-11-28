"use client";
import Link from "next/link";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { OperatorWidgetBoundary as WidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { gateLiveInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { DoorOpen, ChevronRight, KeyRound, ScanLine, Clock, BarChart3 } from "lucide-react";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";
import { useAuthStore } from "@/stores/authStore";
import { useGateStore } from "@/stores/gateStore";

/**
 * The operator's daily loop is the gate desk, not widgets: the landing
 * surface is one tap to YOUR assigned gate (or the claim flow when you have
 * none). Compact, mobile-first, above the fold — no 3-paragraph boilerplate.
 *
 * Internal UUIDs are sysadmin-only: the operator sees the gate NAME (or
 * "No gate claimed"), never the raw gateId.
 */
function OperatorDeskHero() {
  const user = useAuthStore((s) => s.user);
  const gateId = user?.gateId;
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();
  const gateMeta = useGateStore((s) => s.gate);

  // Show the gate name only — never the raw gateId (sysadmin-only data).
  const gateLabel = gateMeta?.name ?? (gateId ? "Loading gate…" : "No gate claimed");

  const openGateInspector = () => {
    if (!gateId) return;
    inspect(
      gateLiveInspection(
        {
          id: gateId,
          name: gateMeta?.name ?? "Assigned Gate",
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
      <div className="surface-card bg-slate-50 border border-slate-300 p-4 sm:p-5 space-y-4">
        {/* Compact 2-line header */}
        <div
          onClick={openGateInspector}
          className={gateId ? "cursor-pointer" : undefined}
          role={gateId ? "button" : undefined}
          tabIndex={gateId ? 0 : undefined}
          onKeyDown={gateId ? (e) => e.key === "Enter" && openGateInspector() : undefined}
        >
          <div className="flex items-center gap-2 min-w-0">
            <DoorOpen className="w-4 h-4 text-slate-600 shrink-0" />
            <p className="text-base font-bold text-slate-900 min-w-0 truncate">
              {gateLabel}
            </p>
            {gateId && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {gateId
              ? "Shift active · 06:00–14:00 — tap to inspect live status"
              : "Enter a claim code to start scanning"}
          </p>
        </div>

        {/* Primary action above the fold */}
        <Link
          href={gateId ? `/gate/${gateId}` : "/operator/claim"}
          className="flex min-h-[52px] items-center justify-center gap-2 w-full rounded-lg bg-slate-900 text-white text-sm font-bold active:scale-[0.99]"
        >
          {gateId ? "Open Gate Scanner →" : "Claim Gate"}
        </Link>
      </div>
      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </WidgetBoundary>
  );
}

/** Tight 2×2 quick-action grid (icon + 2-word label, no paragraph copy). */
function OperatorQuickGrid() {
  const actions = [
    { label: "Manual Entry", icon: KeyRound, href: "/operator/manual-entry" },
    { label: "Verify Pass", icon: ScanLine, href: "/operator/lookup" },
    { label: "Transactions", icon: Clock, href: "/operator/transactions" },
    { label: "Shift Stats", icon: BarChart3, href: "/operator/stats" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-lg bg-white border border-slate-300 text-slate-900 p-3 active:scale-[0.98] hover:bg-slate-50"
        >
          <a.icon className="w-5 h-5 text-slate-600" />
          <span className="text-xs font-semibold text-slate-900">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          {/* Compact mobile-first operator layout: header + primary CTA + 2×2
              grid above the fold; retention widgets below. */}
          <div className="space-y-4">
            <OperatorDeskHero />
            <WidgetBoundary name="QuickActions" title="Quick Actions">
              <OperatorQuickGrid />
            </WidgetBoundary>
          </div>

          <WidgetBoundary name="DigitalHandover" title="Digital Handover">
            <DigitalHandover />
          </WidgetBoundary>
          <WidgetBoundary name="SpatialPeopleMap" title="Gate & Shift Security Map">
            <SpatialPeopleMapWorkspace defaultArea="security" lockedArea compact />
          </WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
