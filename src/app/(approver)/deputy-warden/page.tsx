"use client";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function DeputyWardenPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["deputy_warden", "principal"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary name="RoleDashboardPanel" title="Deputy Warden Dashboard">
            <RoleDashboardPanel
              title="Deputy Warden dashboard"
              icon={ShieldCheck}
              endpoint="/api/deputy-warden/delegation"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const scopes = Array.isArray(d.scopes) ? d.scopes.length : 0;
                return [
                  { label: "Delegation", value: d.active ? "Active" : "Inactive", tone: d.active ? ("ok" as const) : ("neutral" as const) },
                  { label: "Scopes", value: scopes },
                  { label: "Delegated by", value: (d.delegatedBy as string) ?? "—", hint: (d.note as string) ?? undefined },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
