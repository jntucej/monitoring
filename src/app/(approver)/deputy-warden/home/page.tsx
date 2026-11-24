"use client";
import { Suspense, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";
import { PageHeader } from "@/components/shared/PageHeader";
import { Greeting } from "@/components/Greeting";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

export default function DeputyWardenPage() {
    const [active, setActive] = useState<HMBoardRow | null>(null);
return (
<>
<Greeting />
<RoleOnboarding />
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["deputy_warden", "principal"]}>
        <div className="space-y-6">
          <PageHeader title="Deputy Warden" subtitle="Hostel delegation & discipline" />
          <ContextSituationBar
            roleLabel="Deputy Warden"
            purpose="Supervise hostel safety, process escalated outpass permissions, and ensure residential discipline"
            contextLabel="Hostel Delegation & Discipline Dashboard"
            statusSummary="Review active hostel permissions on the Kanban board, audit delegation status, and inspect alerts."
            severity="info"
            primaryAction={{ label: "Outpass Queue", href: "/deputy-warden" }}
            secondaryActions={[
              { label: "Daily Overview", href: "/deputy-warden/daily-overview" },
              { label: "Curfew Oversight", href: "/deputy-warden/curfew-oversight" },
              { label: "Shift Handover", href: "/deputy-warden/shift-handover" },
            ]}
          />
      <LivePulseStrip items={[{ id: "curfew", label: "Curfew Watch", valueLabel: "21:30", tone: "warn", benchmark: "Track unreturned hostel residents" }, { id: "hostel", label: "Hostel L2", valueLabel: "Live", tone: "info", benchmark: "Approve leave & resolve curfew alerts" }]} />
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
          <KanbanBoard
            source="/api/permissions?workflow_type=hostel"
            itemKey="permission"
            columns={["PENDING", "ESCALATED", "APPROVED", "REJECTED"]}
            onSelect={(row) => setActive(row as HMBoardRow)}
          />
          <EntityInspector
            inspection={active ? boardRowTicketInspection(active, { consoleHref: "/deputy-warden", consoleLabel: "Outpass queue" }) : null}
            onClose={() => setActive(null)}
          />
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>

        </div>
      </AuthGuard>
    </Suspense>
</>
    );
}
