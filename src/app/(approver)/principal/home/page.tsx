"use client";

import { useMemo, useState, useCallback, lazy, Suspense } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";
import { usePrincipalStreak } from "@/hooks/usePrincipalStreak";
import { AlertTriangle, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataFreshness } from "@/components/shared/DataFreshness";
import { MorningBrief } from "@/components/shared/MorningBrief";
import { StreakBadge } from "../_retention/StreakBadge";
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
import { LockdownStatusPulse } from "@/components/principal/LockdownStatusPulse";
import { PresenceSplitPanel } from "@/components/shared/PresenceSplitPanel";
import { UpcomingPreview, type UpcomingItem } from "../_retention/UpcomingPreview";
import { CelebrateOverlay } from "../_retention/CelebrateOverlay";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";
import { PrincipalWidgetBoundary as WidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { OverallClassSatisfactionCard } from "@/components/principal/OverallClassSatisfactionCard";
import { ExecutiveErpOverview, type ErpKpiItem, type ExamPerformanceBarItem, type UpcomingEventItem, type RecentActivityItem } from "@/components/principal/ExecutiveErpOverview";
import { PrincipalDigest } from "@/components/retention/PrincipalDigest";
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { requestInspection } from "@/components/shared/roleInspectors";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
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
const user = useAuthStore((s) => s.user);
  const [focusOpen, setFocusOpen] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { data, loading, error, refresh } = useApiResource<PrincipalOverview>("/api/principal/dashboard", {
    ttlMs: 15_000,
  });

  const digestRes = useApiResource<{
    success?: boolean;
    data?: {
      approved: number | string;
      delegated: number | string;
      avgDecision: string;
      slaAdherence: string;
      insight: string;
    };
  }>("/api/principal/digest?range=week", {
    ttlMs: 30_000,
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

  // §13 notification/queue → shared inspector: the focus item is record-backed
  // and "Inspect" on the FocusZone opens the same EntityInspector a table row
  // would. (The home no longer renders a NotificationCenter, so the bridge is
  // driven from the focus item instead of a notice stream.)
  const { inspection, inspect, closeInspection } = useEntityInspector();

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

  // §13 notification/queue → shared inspector: the focus item is record-backed,
  // so "Inspect" opens the same EntityInspector a table row would (previously
  // this bridge was mounted but dormant because nothing called inspect()).
  const handleInspectFocus = useCallback(() => {
    if (!focusItem) return;
    inspect(
      requestInspection({
        id: focusItem.id,
        ticket: focusItem.ticket,
        type: "principal",
        status: "PENDING",
      }),
    );
  }, [focusItem, inspect]);

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
<CustomRoleGreeting name={user?.name} role="principal" />
<RoleOnboarding />
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
<PageHeader title="Principal" subtitle="Campus leadership console" />
        <ContextSituationBar
          roleLabel="Principal"
          purpose="Executive campus leadership console monitoring institutional pulse, decision streaks, and strategic KPIs"
          why="The executive overview consolidates live campus safety, urgent approval queues, and institutional health metrics in one command center."
          contextLabel="Principal Overview & Leadership Console"
          statusSummary={(d?.emergency?.length ?? 0) > 0 || (d?.counts.overdue ?? 0) > 0 ? `${d?.emergency?.length ?? 0} emergencies and ${d?.counts.overdue ?? 0} overdue items requiring immediate executive command.` : `${pending} approvals in queue, ${sessionDecisions} decisions cleared this session.`}
          severity={(d?.emergency?.length ?? 0) > 0 ? "critical" : (d?.counts.overdue ?? 0) > 0 ? "warn" : "ok"}
          primaryAction={{ label: "Command Center", href: "/principal" }}
          secondaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        />
      <LivePulseStrip items={[{ id: "exec", label: "Executive Queue", valueLabel: "Live", tone: "warn", benchmark: "Final sign-off & emergency overrides" }, { id: "campus", label: "Campus Ops", valueLabel: "Active", tone: "ok", benchmark: "Gates, hostels & exam governance" }]} />

        {/* Schola-Pattern Executive ERP Overview Band */}
        <WidgetBoundary name="ExecutiveErpOverview" title="Executive ERP Overview">
          {(() => {
            const digest = digestRes.data?.data;
            const kpis: ErpKpiItem[] = [
              {
                id: "pending-approvals",
                label: "Pending Approvals",
                value: d?.counts.pending ?? 0,
                icon: "🎓",
                iconBg: "bg-purple-100 text-purple-700",
                onClick: () => {
                  window.location.href = "/principal/approvals";
                },
              },
              {
                id: "overdue-sla",
                label: "Overdue Items",
                value: d?.counts.overdue ?? 0,
                icon: "⏱",
                iconBg: (d?.counts.overdue ?? 0) > 0 ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700",
                onClick: () => {
                  window.location.href = "/principal/approvals/overdue";
                },
              },
              {
                id: "today-decisions",
                label: "Today's Decisions",
                value: d?.counts.todayDecisions ?? 0,
                icon: "⚖",
                iconBg: "bg-orange-100 text-orange-700",
              },
              {
                id: "sla-adherence",
                label: "Weekly SLA Rate",
                value: digest?.slaAdherence ?? "98%",
                icon: "📊",
                iconBg: "bg-emerald-100 text-emerald-700",
              },
            ];

            const totalChain = (d?.chainImpact.students ?? 0) + (d?.chainImpact.faculty ?? 0);
            const studentPct = totalChain > 0 ? Math.round(((d?.chainImpact.students ?? 0) / totalChain) * 100) : 75;
            const facultyPct = 100 - studentPct;

            const examBars: ExamPerformanceBarItem[] = [
              {
                label: "Exams",
                val1: Math.min(100, Math.max(15, (d?.exams.todayCandidates ?? 0) > 0 ? 85 : 45)),
                val2: Math.min(100, Math.max(10, (d?.exams.pendingClearances ?? 0) * 10 + 20)),
                val1Label: `Candidates (${d?.exams.todayCandidates ?? 0})`,
                val2Label: `Pending Clearances (${d?.exams.pendingClearances ?? 0})`,
              },
              {
                label: "Approvals",
                val1: Math.min(100, Math.max(20, (d?.counts.todayDecisions ?? 0) * 15 + 25)),
                val2: Math.min(100, Math.max(10, (d?.counts.pending ?? 0) * 10 + 15)),
                val1Label: `Decided today (${d?.counts.todayDecisions ?? 0})`,
                val2Label: `Pending (${d?.counts.pending ?? 0})`,
              },
              {
                label: "SLA Adherence",
                val1: 92,
                val2: Math.max(10, (d?.counts.overdue ?? 0) * 15),
                val1Label: "Met SLA",
                val2Label: `Breached SLA (${d?.counts.overdue ?? 0})`,
              },
              {
                label: "Delegations",
                val1: Math.min(100, Math.max(25, (d?.delegations.active ?? 0) * 20)),
                val2: Math.min(100, Math.max(5, (d?.delegations.expiringSoon ?? 0) * 25)),
                val1Label: `Active (${d?.delegations.active ?? 0})`,
                val2Label: `Expiring Soon (${d?.delegations.expiringSoon ?? 0})`,
              },
            ];

            const events: UpcomingEventItem[] = (d?.priorityItems ?? [])
              .filter((item) => item.slaDeadline)
              .slice(0, 3)
              .map((item) => ({
                id: item.id,
                dateStr: item.slaDeadline ? new Date(item.slaDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
                title: item.ticket,
                subtitle: item.subject,
                accentBg: item.kind === "emergency" ? "bg-rose-50/80 border-rose-200 text-rose-700" : "bg-sky-50/80 border-sky-100 text-sky-700",
                onClick: () => {
                  inspect(
                    requestInspection({
                      id: item.id,
                      ticket: item.ticket,
                      type: "principal",
                      status: "PENDING",
                    }),
                  );
                },
              }));

            const activities: RecentActivityItem[] = (d?.priorityItems ?? []).slice(0, 4).map((item) => ({
              id: item.id,
              ticketNumber: item.ticket,
              title: item.subject,
              timeAgo: item.age,
              dotColor: item.kind === "emergency" ? "bg-rose-500" : item.kind === "escalation" ? "bg-amber-500" : "bg-purple-500",
              onClick: () => {
                inspect(
                  requestInspection({
                    id: item.id,
                    ticket: item.ticket,
                    type: "principal",
                    status: "PENDING",
                  }),
                );
              },
            }));

            return (
              <ExecutiveErpOverview
                title="Campus Executive Pulse"
                subtitle="High-level institutional administration & operational indicators"
                kpis={kpis}
                examChart={{
                  title: "Executive Operations & Adherence",
                  legend1: "Cleared / Active",
                  legend2: "Pending / Overdue",
                  items: examBars,
                }}
                donut={{
                  title: "Chain Impact Distribution",
                  badge: "Live Impact",
                  totalLabel: "Waiting",
                  totalValue: d?.chainImpact.total ?? 0,
                  segments: [
                    {
                      label: "Students",
                      percentage: studentPct,
                      color: "#1E1B4B",
                      dotColor: "#1E1B4B",
                    },
                    {
                      label: "Faculty / Staff",
                      percentage: facultyPct,
                      color: "#f9a8d4",
                      dotColor: "#f9a8d4",
                    },
                  ],
                }}
                events={events}
                activities={activities}
                onInspect={(item) => {
                  inspect(
                    requestInspection({
                      id: item.id,
                      ticket: item.ticket ?? item.id,
                      type: "principal",
                    }),
                  );
                }}
              />
            );
          })()}
        </WidgetBoundary>
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

          <LockdownStatusPulse />

          {/* Live Inside vs. Outside headcount split by branch + hostel block. */}
          <PresenceSplitPanel compact />

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
            streak={<StreakBadge />}
            pendingHref="/principal/approvals/pending"
          />
        </WidgetBoundary>

        {/* Live classes — campus-wide academic surface */}
        <LiveClassCard title="Campus Live" scope="campus" />

        {/* 3. Focus zone — the one item that matters right now */}
        <div className="section-offscreen">
        <WidgetBoundary name="FocusZone" title="Focus Zone">
          <FocusZone
            item={focusItem}
            onEnterFocus={() => setFocusOpen(true)}
            onInspect={focusItem ? handleInspectFocus : undefined}
          />
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

        <WidgetBoundary name="CampusKnowledgeCentre" title="Campus Knowledge Centre">
          <CampusKnowledgeCentre />
        </WidgetBoundary>
        </div>

      </div>

      {/* §13: notification → shared entity inspector (record-backed notices
          open the same inspector a table row would; info-only stay mark-read) */}
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </>
</>
    );
}
