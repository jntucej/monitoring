"use client";
import { Suspense } from "react";
import { useApiResource } from "@/hooks/useApiResource";
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
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageHeader } from "@/components/shared/PageHeader";


function KpiTile({ label, value, tone = "ok" }: { label: string; value: string | number; tone?: "ok" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-[var(--text-primary)]";
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function OiePage() {
  interface OieQueueItem { id?: string; status?: string; current_stage?: string; }
  type OieQueueData = OieQueueItem[] | { data?: OieQueueItem[] };
  const { data } = useApiResource<OieQueueData>("/api/oie/queue", { ttlMs: 15_000 });
  const queue = Array.isArray(data) ? data : data?.data ?? [];
  const pendingCount = queue.filter((i) => i.status?.toUpperCase() === "PENDING").length;
  const escalatedCount = queue.filter((i) => i.status?.toUpperCase() === "ESCALATED").length;

  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["oie"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <PageHeader title="OIE" subtitle="Examinations cell — clearances & exceptions" />
          <WidgetBoundary name="OieKpis" title="OIE KPIs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiTile label="Queue depth" value={queue.length} tone={queue.length > 0 ? "warn" : "ok"} />
              <KpiTile label="Pending clearances" value={pendingCount} />
              <KpiTile label="Exceptions open" value={escalatedCount} tone={escalatedCount > 0 ? "warn" : "ok"} />
            </div>
          </WidgetBoundary>
          <KanbanBoard
            source="/api/oie/queue"
            columns={["PENDING", "ESCALATED", "APPROVED", "REJECTED"]}
            itemKey="permission"
            onSelect={() => {}}
          />
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
