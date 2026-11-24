"use client";

import { useMemo, useState, useCallback, lazy, Suspense } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";
import { usePrincipalStreak } from "@/hooks/usePrincipalStreak";
import { AlertTriangle, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataFreshness } from "@/components/shared/DataFreshness";
import { MorningBrief } from "../_retention/MorningBrief";
import { FocusZone, type FocusItem } from "../_retention/FocusZone";
import { FocusMode } from "../_retention/FocusMode";
import { ChainImpact } from "../_retention/ChainImpact";
import { DelegationHealth } from "../_retention/DelegationHealth";
import { VpInboundCard } from "@/components/principal/VpInboundCard";
import { StrategicScorecard } from "../_retention/StrategicScorecard";
import { WinFeed } from "../_retention/WinFeed";
import { InsightCard } from "../_retention/InsightCard";
import { LiveClassCard } from "@/components/shared/LiveClassCard";
import { EmergencyPulse } from "../_retention/EmergencyPulse";
import { UpcomingPreview, type UpcomingItem } from "../_retention/UpcomingPreview";
import { CelebrateOverlay } from "../_retention/CelebrateOverlay";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PrincipalWidgetBoundary as WidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { OverallClassSatisfactionCard } from "@/components/principal/OverallClassSatisfactionCard";
import { PrincipalDigest } from "@/components/retention/PrincipalDigest";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { QuickActions } from "@/components/principal/shared/PrincipalQuickActions";
import { NotificationCenter } from "@/components/principal/shared/PrincipalNotificationCenter";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildNotificationInspection, type NotificationItem } from "@/lib/principal/notificationInspection";
import { Greeting } from "@/components/Greeting";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";

interface PrincipalOverview {
  success?: boolean;
  data?: {
    counts: {
      pending: number;
      escalated: number;
      overdue: number;
      todayDecisions: number;
    };
    priorityItems: Array<{
      id: string;
      kind: "emergency" | "escalation" | "approval";
      ticket: string;
      subject: string;
      slaDeadline: string | null;
      age: string;
      href: string;
    }>;
    chainImpact: { students: number; faculty: number; total: number };
    delegations: { active: number; expiringSoon: number };
    emergency: Array<{ ticket: string; subject: string; age: string }>;
    exams: { pendingClearances: number; todayCandidates: number };
  };
}


interface KpiTileProps {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
  /** The hover-preview hint (the quick-overview layer of the inspection hierarchy). */
  hint?: string;
  /** The "full detail" target (the deepest layer) — makes the tile clickable. */
  linkHref?: string;
}

function KpiTile({ label, value, tone = "ok", hint, linkHref }: KpiTileProps) {
  const toneClass = tone === "bad" ? "text-red-400" : tone === "warn" ? "text-action-warning" : "text-text-primary";
  const tile = (
    <div
      className={
        "surface-card bg-[var(--bg-elev-1)] p-4 min-w-0 " +
        (linkHref ? "cursor-pointer hover:bg-[var(--bg-elev-2)] transition-colors" : "")
      }
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
  if (hint) {
    return (
      <HoverPreview preview={<MetricPreview label={label} value={value} hint={hint} />}>
        <a
          href={linkHref ?? undefined}
          onClick={linkHref ? undefined : (e) => e.preventDefault()}
          aria-label={`${label}: ${value}. ${hint}`}
        >
          {tile}
        </a>
      </HoverPreview>
    );
  }
  return tile;
}

const InboxReviewPanel = lazy(() => import("@/components/principal/InboxReviewPanel"));

export default function PrincipalTodayPage() {
  const [focusOpen, setFocusOpen] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { data, loading, error, refresh } = useApiResource<PrincipalOverview>("/api/principal/dashboard", {
    ttlMs: 15_000,
  });

  // Track when the payload last arrived so the KPI grid can show a freshness dot.
  // Stamp the timestamp on each successful poll; on failure keep the previous value
  // so the dot flips to amber/red instead of vanishing.
  const trackRefresh = useCallback(async () => {
    const started = Date.now();
    try {
      await refresh();
      setLastFetched(started);
    } catch {
      /* keep previous timestamp on failure */
    }
  }, [refresh]);
  usePolling(trackRefresh, { intervalMs: 15_000 });

  const sessionDecisions = usePrincipalRetention((s) => s.sessionDecisions);

  // §13 notification → inspector bridge: clicking a notification that
  // references a record opens the shared inspector; info-only ones stay mark-read.
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const handleInspectNotification = (item: NotificationItem) => {
    const insp = buildNotificationInspection(item);
    if (insp) inspect(insp);
  };

  const d = data?.data;
  const pending =
    (d?.counts.pending ?? 0) +
    (d?.counts.escalated ?? 0) +
    (d?.counts.overdue ?? 0);
  const zeroOverdue = (d?.counts.overdue ?? 0) === 0;

  usePrincipalStreak(zeroOverdue, pending);

  const focusItem: FocusItem | null = useMemo(() => {
    if (!d?.priorityItems || d.priorityItems.length === 0) return null;
    const first = d.priorityItems[0];
    return {
      id: first.id,
      ticket: first.ticket,
      subject: first.subject,
      slaDeadline: first.slaDeadline,
      age: first.age,
      href: first.href,
    };
  }, [d?.priorityItems]);

  const upcoming: UpcomingItem[] =
    d?.priorityItems
      ? d.priorityItems
          .filter((i) => i.slaDeadline)
          .slice(0, 5)
          .map((i) => ({
            ticket: i.ticket,
            subject: i.subject,
            slaDeadline: i.slaDeadline!,
            workflowType: "",
          }))
      : [];

  return (
<>
<Greeting />
<RoleOnboarding />
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
<PageHeader title="Principal" subtitle="Campus leadership console" />
        <ContextSituationBar
          roleLabel="Principal"
          purpose="Executive campus leadership console monitoring institutional pulse, decision streaks, and strategic KPIs"
          contextLabel="Principal Overview & Leadership Console"
          statusSummary={(d?.emergency?.length ?? 0) > 0 || (d?.counts.overdue ?? 0) > 0 ? `${d?.emergency?.length ?? 0} emergencies and ${d?.counts.overdue ?? 0} overdue items requiring immediate executive command.` : `${pending} approvals in queue, ${sessionDecisions} decisions cleared this session.`}
          severity={(d?.emergency?.length ?? 0) > 0 ? "critical" : (d?.counts.overdue ?? 0) > 0 ? "warn" : "ok"}
          primaryAction={{ label: "Command Center", href: "/principal" }}
          secondaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        />
        <WidgetBoundary name="PrincipalKpis" title="Principal KPIs">
          {error && !loading && data === null ? (
            // Recoverable error with retry — mirrors the admin overview pattern (RC8/SD2).
            <div className="surface-card bg-rose-500/5 p-4 text-sm" role="alert">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-4 text-action-danger shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">Dashboard unavailable</p>
                  <p className="text-xs text-text-muted mt-0.5">{error}</p>
                </div>
                <button
                  onClick={() => void trackRefresh()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                >
                  <RotateCw className="size-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : !loading && data && (d?.counts.pending ?? 0) + (d?.counts.escalated ?? 0) + (d?.counts.overdue ?? 0) + (d?.emergency?.length ?? 0) === 0 ? (
            <EmptyState
              title="All clear"
              description="No pending approvals, escalations, or active emergencies. Your queue is empty."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiTile
                  label="Pending approvals"
                  value={d?.counts.pending ?? 0}
                  hint="Approvals waiting on your decision — click to open the queue"
                  linkHref="/principal/approvals"
                />
                <KpiTile
                  label="Overdue"
                  value={d?.counts.overdue ?? 0}
                  tone={(d?.counts.overdue ?? 0) > 0 ? "bad" : "ok"}
                  hint="SLA-breached items needing immediate attention — click to open the breached list"
                  linkHref="/principal/approvals/overdue"
                />
                <KpiTile
                  label="Emergencies"
                  value={d?.emergency?.length ?? 0}
                  tone={(d?.emergency?.length ?? 0) > 0 ? "warn" : "ok"}
                  hint="Active emergency commands and lockdowns — click for the command plane"
                  linkHref="/principal/emergency"
                />
                <KpiTile
                  label="Delegations active"
                  value={d?.delegations.active ?? 0}
                  hint="Authority you have delegated — click to review expiring grants"
                  linkHref="/principal/governance/delegations"
                />
              </div>
              {lastFetched !== null && (
                <div className="mt-2 flex justify-end">
                  <DataFreshness timestamp={lastFetched} autoRefresh />
                </div>
              )}
            </>
          )}
        </WidgetBoundary>
                {/* 1. Emergency pulse — only when present, top priority */}
        {d?.emergency && d.emergency.length > 0 && (
          <WidgetBoundary name="EmergencyPulse" title="Emergency Pulse">
            <EmergencyPulse items={d.emergency} />
          </WidgetBoundary>
        )}

        {/* 2. Morning brief — greeting + streak + daily progress */}
        <WidgetBoundary name="MorningBrief" title="Morning Brief">
          <MorningBrief
            pending={pending}
            cleared={d?.counts.todayDecisions ?? 0}
            target={Math.max(5, pending + (d?.counts.todayDecisions ?? 0))}
          />
        </WidgetBoundary>

        {/* Live classes — campus-wide academic surface */}
        <LiveClassCard title="Campus Live" scope="campus" />

        {/* 3. Focus zone — the one item that matters right now */}
        <div className="section-offscreen">
        <WidgetBoundary name="FocusZone" title="Focus Zone">
          <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />
        </WidgetBoundary>

        {/* 4. Chain impact + Delegation health — the leverage view */}
        <WidgetBoundary name="ChainAndDelegation" title="Chain Impact & Delegation">
          <div className="grid gap-4 md:grid-cols-2">
            <ChainImpact
              students={d?.chainImpact.students ?? 0}
              faculty={d?.chainImpact.faculty ?? 0}
              total={d?.chainImpact.total ?? 0}
            />
            <DelegationHealth
              active={d?.delegations.active ?? 0}
              expiringSoon={d?.delegations.expiringSoon ?? 0}
            />
          </div>
        </WidgetBoundary>

        {/* 5. Decision Review — monthly stats + last-month delta */}
        <Suspense fallback={null}>
          <WidgetBoundary name="InboxReview" title="Decision Review">
            <InboxReviewPanel />
          </WidgetBoundary>
        </Suspense>

        {/* VP bridge — items the Vice Principal flagged upward */}
        <VpInboundCard />

        {/* 6. Scorecard — personal bests */}
        <WidgetBoundary name="StrategicScorecard" title="Strategic Scorecard">
          <StrategicScorecard
            thisWeek={d?.counts.todayDecisions ?? 0}
            lastWeek={0}
            avgResponseSec={0}
          />
        </WidgetBoundary>

        {/* 6. Wins + Insight */}
        <WidgetBoundary name="WinsAndInsights" title="Wins & Insights">
          <div className="grid gap-4 md:grid-cols-2">
            <WinFeed />
            <InsightCard
              thisWeek={d?.counts.todayDecisions ?? 0}
              lastWeek={0}
              avgResponseSec={0}
              chainTotal={d?.chainImpact.total ?? 0}
            />
          </div>
        </WidgetBoundary>

        {/* 6b. Overall class satisfaction (campus-wide class-review roll-up).
              The card carries its own Principal-gated boundary. */}
        <OverallClassSatisfactionCard />

        {/* 7. Upcoming — SLA deadlines within 24h */}
        <WidgetBoundary name="UpcomingPreview" title="Upcoming Preview">
          <UpcomingPreview items={upcoming} />
        </WidgetBoundary>

        {/* 8. Retention & Analytics Widgets */}
        <WidgetBoundary name="PrincipalDigest" title="Principal Digest">
          <PrincipalDigest />
        </WidgetBoundary>

        <WidgetBoundary name="RoleAnalytics" title="Role Analytics">
          <RoleAnalytics />
        </WidgetBoundary>

        <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
          <PersonalizedCampusHome />
        </WidgetBoundary>

        <WidgetBoundary name="TaskContinuity" title="Task Continuity">
          <TaskContinuity />
        </WidgetBoundary>

        <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
          <UnifiedCampusCalendar />
        </WidgetBoundary>

        <WidgetBoundary name="CampusKnowledgeCentre" title="Campus Knowledge Centre">
          <CampusKnowledgeCentre />
        </WidgetBoundary>
<WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter onInspect={handleInspectNotification} /></WidgetBoundary>
        </div>

      </div>

      {/* §13: notification → shared entity inspector (record-backed notices
          open the same inspector a table row would; info-only stay mark-read) */}
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </>
</>
    );
}
