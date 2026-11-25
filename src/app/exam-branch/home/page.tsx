"use client";
import { Suspense, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import type { BoardRow } from "@/components/shared/Board";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { scanInspection } from "@/components/shared/inspectionModels";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { RoleOnboarding } from "@/components/RoleOnboarding";

export default function ExamBranchPage() {
const user = useAuthStore((s) => s.user);
  const [active, setActive] = useState<BoardRow | null>(null);
  return (
<>
<CustomRoleGreeting name={user?.name} role="exam_branch" />
<RoleOnboarding />
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["exam_branch"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-20">

          <ContextSituationBar
            roleLabel="Exam Branch"
            purpose="Coordinate exam hall clearances, prepare OIE submissions, and track candidate passes."
            why="Daily exam operations oversight ensures candidate verification, desk coverage, and OIE submissions remain synchronized."
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
