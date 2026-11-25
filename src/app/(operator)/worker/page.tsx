"use client";
import { Suspense } from "react";
import { HardHat } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function WorkerPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <AuthGuard allowedRoles={["worker"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <ContextSituationBar
            roleLabel="Campus Operator · Worker"
            purpose="Daily operational tasks, active shift recording, and work order tracking."
            contextLabel="Operator Shift & Tasks"
            statusTone="info"
            statusPill="Active Shift"
            statusSummary="View today's assigned tasks, track shift check-in times, and review open work orders."
            why="Check your shift clock-in state, active work orders, and duty zones to ensure campus maintenance jobs are fulfilled."
            primaryAction={{ label: "View Shifts", href: "/worker/shifts" }}
            secondaryAction={{ label: "Work Orders", href: "/worker/work-orders" }}
          />
      <LivePulseStrip items={[{ id: "shift", label: "Shift Window", valueLabel: "06:00–22:00", tone: "ok", benchmark: "Mon–Sat worker access hours" }, { id: "status", label: "Duty Status", valueLabel: "Active", tone: "info", benchmark: "Check assigned zone & work orders" }]} />

          <OperatorWidgetBoundary name="RoleDashboardPanel" title="Worker Dashboard">
            <RoleDashboardPanel
              title="Worker dashboard"
              icon={HardHat}
              endpoint="/api/workers/my-work"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const tasks = Array.isArray(d.tasks) ? d.tasks.length : 0;
                const todayShift = d.todayShift as Record<string, unknown> | undefined;
                return [
                  { label: "Assigned tasks", value: tasks, tone: tasks > 0 ? ("warn" as const) : ("ok" as const) },
                  { label: "Completed (week)", value: (d.completedLastWeek as number) ?? 0, tone: "ok" as const },
                  { label: "On shift", value: todayShift?.checkIn ? "Yes" : "No" },
                ];
              }}
            />
          </OperatorWidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
