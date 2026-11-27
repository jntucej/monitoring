"use client";
import { Suspense, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
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
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { boardRowTicketInspection, type HMBoardRow } from "@/components/approver/wardenConsoleModels";
import { PageHeader } from "@/components/shared/PageHeader";
import { SpatialPeopleMapWorkspace } from "@/components/dashboard/SpatialPeopleMap";


function KpiTile({
  label,
  value,
  tone = "ok",
  linkHref,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
  /** (UX-006) Drill-down target to the underlying records. */
  linkHref?: string;
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-400"
      : tone === "warn"
        ? "text-action-warning"
        : "text-text-primary";
  const tile = (
    <div className="surface-card bg-[var(--bg-elev-1)] p-4 min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
  if (linkHref) {
    return (
      <a
        href={linkHref}
        aria-label={`${label}: ${value}. View records`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary transition-colors hover:bg-[var(--bg-elev-2)]"
      >
        {tile}
      </a>
    );
  }
  return tile;
}

export default function OiePage() {
  interface OieQueueItem { id?: string; status?: string; current_stage?: string; }
  type OieQueueData = OieQueueItem[] | { data?: OieQueueItem[] };
  const { data } = useApiResource<OieQueueData>("/api/oie/queue", { ttlMs: 15_000 });
  const queue = Array.isArray(data) ? data : data?.data ?? [];
  const pendingCount = queue.filter((i) => i.status?.toUpperCase() === "PENDING").length;
  const escalatedCount = queue.filter((i) => i.status?.toUpperCase() === "ESCALATED").length;

  const [active, setActive] = useState<HMBoardRow | null>(null);
return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["oie"]}>
        <div className="space-y-6">

          <div>
            <h1 className="text-xl font-bold text-text-primary">Officer In-Charge of Examinations (OIE)</h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Examinations cell — review exam clearances, access exceptions, and escalated requests.
            </p>
          </div>

          <ContextSituationBar
            roleLabel="Officer In-Charge of Examinations"
            purpose="Evaluate examination clearances, manage day-access permits, and resolve hall exceptions."
            why="The OIE console provides central command over hall access permits, invigilator clearances, and emergency exam exceptions."
            contextLabel="Exam Cell Overview"
            statusTone={pendingCount > 0 ? "warn" : "ok"}
            statusPill={pendingCount > 0 ? `${pendingCount} pending` : "Clear"}
            statusSummary={
              pendingCount > 0
                ? `${pendingCount} candidate clearance${pendingCount === 1 ? "" : "s"} and ${escalatedCount} exception${escalatedCount === 1 ? "" : "s"} await OIE adjudication.`
                : "No pending candidate exam clearances right now."
            }
            primaryAction={{ label: "Pending Queue", href: "/oie/queue/pending", badgeCount: pendingCount }}
            secondaryActions={[
              { label: "Day Access", href: "/oie/examination-day-access" },
              { label: "Exceptions", href: "/oie/access-exceptions" },
            ]}
          />
      <LivePulseStrip items={[{ id: "oie-queue", label: "Exam Clearances", valueLabel: "Live", tone: "warn", benchmark: "Adjudicate exam-day hall permits" }, { id: "access", label: "Day Access", valueLabel: "Active", tone: "info", benchmark: "Verify candidate gate & hall entry" }]} />
          <WidgetBoundary name="OieKpis" title="OIE KPIs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiTile label="Queue depth" value={queue.length} tone={queue.length > 0 ? "warn" : "ok"} linkHref="/oie/queue/pending" />
              <KpiTile label="Pending clearances" value={pendingCount} linkHref="/oie/queue/pending" />
              <KpiTile label="Exceptions open" value={escalatedCount} tone={escalatedCount > 0 ? "warn" : "ok"} linkHref="/oie/access-exceptions" />
            </div>
          </WidgetBoundary>
          <KanbanBoard
            source="/api/oie/queue"
            columns={["PENDING", "ESCALATED", "APPROVED", "REJECTED"]}
            itemKey="permission"
            onSelect={(row) => setActive(row as HMBoardRow)}
          />
          <EntityInspector
            inspection={active ? boardRowTicketInspection(active, { consoleHref: "/oie", consoleLabel: "OIE queue" }) : null}
            onClose={() => setActive(null)}
          />
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
          <WidgetBoundary name="SpatialPeopleMap" title="Exam-Day Hall & Invigilation Map">
            <SpatialPeopleMapWorkspace defaultArea="exam" lockedArea compact />
          </WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
