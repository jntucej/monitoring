"use client";
import { Suspense, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import type { BoardRow } from "@/components/shared/Board";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { scanInspection } from "@/components/shared/inspectionModels";
import { Greeting } from "@/components/Greeting";
import { RoleOnboarding } from "@/components/RoleOnboarding";

export default function ExamBranchPage() {
  const [active, setActive] = useState<BoardRow | null>(null);
  return (
<>
<Greeting />
<RoleOnboarding />
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["exam_branch"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-20">

          <ContextSituationBar
            roleLabel="Exam Branch"
            purpose="Coordinate exam hall clearances, prepare OIE submissions, and track candidate passes."
            contextLabel="Today Overview"
            statusTone="info"
            statusSummary="Monitor daily examination desk metrics, candidate queues, and verification logs."
            primaryAction={{ label: "Pass Queue", href: "/exam-branch" }}
            secondaryActions={[
              { label: "OIE Requests", href: "/exam-branch/oie-approval-requests" },
              { label: "Verification Desk", href: "/exam-branch/verification" },
            ]}
          />
      <LivePulseStrip items={[{ id: "exam-branch", label: "Exam Branch", valueLabel: "Live", tone: "info", benchmark: "Verify clearances & forward to OIE" }, { id: "presence", label: "Candidates", valueLabel: "Tracked", tone: "ok", benchmark: "Cross-check campus presence matrix" }]} />

          <WidgetBoundary name="RoleDashboardPanel" title="Exam Branch Dashboard">
            <RoleDashboardPanel
              title="Exam Branch dashboard"
              icon={FileSpreadsheet}
              endpoint={null}
            />
          </WidgetBoundary>
          <KanbanBoard
            source="/api/permissions?workflow_type=exam"
            itemKey="permission"
            columns={["PENDING", "VERIFYING", "APPROVED", "REJECTED"]}
            onSelect={(row) => setActive(row)}
          />
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
        <EntityInspector
          inspection={active ? scanInspection(active) : null}
          onClose={() => setActive(null)}
        />
        </div>
      </AuthGuard>
    </Suspense>
</>
    );
}
