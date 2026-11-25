"use client";
import { Suspense, useState } from "react";
import { Building2 } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";
import { AllocationPanel } from "@/components/approver/AllocationPanel";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";
import { PageHeader } from "@/components/shared/PageHeader";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

export default function HostelManagerPage() {
const user = useAuthStore((s) => s.user);
    const [active, setActive] = useState<HMBoardRow | null>(null);
return (
<>
<CustomRoleGreeting name={user?.name} role="hostel_manager" />
<RoleOnboarding />
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["hostel_manager", "principal"]}>
        <div className="space-y-6">
          <PageHeader title="Hostel Manager" subtitle="Hostel operations & allocation" />
          <ContextSituationBar
            roleLabel="Hostel Manager"
            purpose="Oversee hostel facilities, manage room allocations, and direct housekeeping operations"
            why="Central operational oversight maintains clean, functional residential blocks and rapid incident triage."
            contextLabel="Hostel Operations & Allocation Dashboard"
            statusSummary="Track block occupancy, monitor resident maintenance tickets, and coordinate daily facilities workflow."
            severity="info"
            primaryAction={{ label: "Resident Tickets", href: "/hostel-manager" }}
            secondaryActions={[
              { label: "Rooms & Occupancy", href: "/hostel-manager/rooms" },
              { label: "Housekeeping", href: "/hostel-manager/housekeeping-tasks" },
              { label: "Resource Management", href: "/hostel-manager/resource-management" },
            ]}
          />
      <LivePulseStrip items={[{ id: "blocks", label: "Hostel Blocks", valueLabel: "Live", tone: "ok", benchmark: "Monitor occupancy & resident passes" }, { id: "complaints", label: "Maintenance", valueLabel: "Active", tone: "warn", benchmark: "Triage block complaints & repairs" }]} />
          <WidgetBoundary name="RoleDashboardPanel" title="Hostel Manager Dashboard">
            <RoleDashboardPanel
              title="Hostel Manager dashboard"
              icon={Building2}
              endpoint="/api/hostel-manager/summary"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                return [
                  { label: "Pending tickets", value: (d.pendingCount as number) ?? 0, tone: "warn" as const },
                  { label: "Assigned hostel", value: (d.assignedHostel as string) ?? "—" },
                ];
              }}
            />
          </WidgetBoundary>
          <KanbanBoard
            source="/api/hostel-manager/summary"
            itemKey="pendingTickets"
            columns={["PENDING", "ESCALATED", "APPROVED", "REJECTED"]}
            onSelect={(row) => setActive(row as HMBoardRow)}
          />
          <EntityInspector
            inspection={active ? boardRowTicketInspection(active, { consoleHref: "/hostel-manager", consoleLabel: "Resident tickets" }) : null}
            onClose={() => setActive(null)}
          />
          <WidgetBoundary name="AllocationPanel" title="Room Allocation">
            <AllocationPanel />
          </WidgetBoundary>

        </div>
      </AuthGuard>
    </Suspense>
</>
    );
}
