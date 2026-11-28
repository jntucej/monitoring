"use client";

import { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { useSupervisorShift } from "@/hooks/useSupervisorShift";
import { ShiftBar } from "../_retention/ShiftBar";
import { FocusZone, type FocusItem } from "../_retention/FocusZone";
import { FocusMode } from "../_retention/FocusMode";
import { TeamRoster } from "../_retention/TeamRoster";
import { GateWall } from "../_retention/GateWall";
import { HandoverStreak } from "../_retention/HandoverStreak";
import { Scorecard } from "../_retention/Scorecard";
import { WinFeed } from "../_retention/WinFeed";
import { InsightCard } from "../_retention/InsightCard";
import { UpcomingPreview, type UpcomingItem } from "../_retention/UpcomingPreview";
import { CelebrateOverlay } from "../_retention/CelebrateOverlay";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { PageHeader } from "@/components/shared/PageHeader";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PresenceSplitPanel } from "@/components/shared/PresenceSplitPanel";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { gateLiveInspection, shiftInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";

function KpiTile({
  label,
  value,
  tone = "ok",
  onInspect,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad" | "neutral";
  onInspect?: () => void;
}) {
  const toneClass =
    tone === "bad"
      ? "text-red-400"
      : tone === "warn"
        ? "text-action-warning"
        : tone === "neutral"
          ? "text-text-muted"
          : "text-text-primary";
  return (
    <div
      onClick={onInspect}
      className={`surface-card bg-bg-surface p-3 min-w-0 ${onInspect ? "cursor-pointer hover:bg-bg-elevated transition-colors" : ""}`}
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onKeyDown={onInspect ? (e) => e.key === "Enter" && e.currentTarget.click() : undefined}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`mt-1 text-lg font-extrabold truncate ${toneClass}`}>{value}</div>
    </div>
  );
}

interface SupervisorOverview {
  counts: {
    escalationsOpen: number;
    incidentsOpen: number;
    exceptionsToday: number;
    resolvedToday: number;
  };
  priorityItems: Array<{
    id: string;
    kind: "escalation" | "incident";
    ticket: string;
    subject: string;
    slaDeadline: string | null;
    age: string;
    href: string;
  }>;
  gates: Array<{
    id: string;
    name: string;
    isActive: boolean;
    onPost: number;
    lastActivity: string | null;
  }>;
  incidents: Array<{
    id: string;
    severity: string;
    title: string;
    timestamp: string;
    resolved: boolean;
  }>;
  shift: {
    shiftId: string | null;
    startedAt: string | null;
    endsAt: string | null;
  };
  insights: {
    thisWeek: number;
    lastWeek: number;
    avgResponseSec: number;
  };
}

export default function SupervisorTodayPage() {
const user = useAuthStore((s) => s.user);
  const [focusOpen, setFocusOpen] = useState(false);
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();
  const { data, refresh } = useApiResource<{ data: SupervisorOverview }>(
    "/api/supervisor/dashboard",
    { ttlMs: 15_000 }
  );
  usePolling(refresh, { intervalMs: 15_000 });

  const sessionDecisions = useSupervisorRetention((s) => s.sessionDecisions);

  const d = data?.data;
  const escalationsOpen = d?.counts.escalationsOpen ?? 0;
  const incidentsOpen = d?.counts.incidentsOpen ?? 0;
  const pending = escalationsOpen + incidentsOpen;

  useSupervisorShift({
    shiftId: d?.shift.shiftId ?? null,
    shiftStartedAt: d?.shift.startedAt ?? null,
    shiftEndsAt: d?.shift.endsAt ?? null,
  });

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
      .filter((i) => i.slaDeadline)
      .slice(0, 5)
      .map((i) => ({
        ticket: i.ticket,
        subject: i.subject,
        slaDeadline: i.slaDeadline!,
        workflowType: "",
      })) ?? [];

  const totalGates = d?.gates.length ?? 0;
  const gatesOnline = d?.gates.filter((g) => g.isActive && g.onPost > 0).length ?? 0;
  // Real on-duty security count: sum of per-gate onPost from the dashboard
  // payload. Previously a hardcoded 0 (TeamRoster enriched its own fetch).
  const securityOnDuty = d?.gates.reduce((sum, g) => sum + (g.onPost ?? 0), 0) ?? 0;
  const shiftActive = d?.shift.startedAt != null;
  const kpis: Array<{
    label: string;
    value: string | number;
    tone: "ok" | "warn" | "bad" | "neutral";
    onInspect?: () => void;
  }> = [
    {
      label: "Shift",
      value: shiftActive ? "On shift" : "Off shift",
      tone: shiftActive ? ("ok" as const) : ("neutral" as const),
      onInspect: () =>
        inspect(
          shiftInspection(
            {
              startedAt: d?.shift.startedAt,
              endsAt: d?.shift.endsAt,
              unresolvedIncidents: incidentsOpen,
            },
            role,
          ),
        ),
    },
    {
      label: "Gates online",
      value: `${gatesOnline}/${totalGates}`,
      tone: "neutral",
      onInspect: () =>
        inspect(
          shiftInspection(
            {
              startedAt: d?.shift.startedAt,
              endsAt: d?.shift.endsAt,
              gateCoverage: { total: totalGates, staffed: gatesOnline },
            },
            role,
          ),
        ),
    },
    { label: "Open escalations", value: escalationsOpen, tone: escalationsOpen > 0 ? ("bad" as const) : ("ok" as const), onInspect: () => window.location.assign("/supervisor/response/escalations") },
    { label: "Open incidents", value: incidentsOpen, tone: incidentsOpen > 0 ? ("bad" as const) : ("ok" as const), onInspect: () => window.location.assign("/supervisor/response/incidents") },
  ];

  return (
<>
<CustomRoleGreeting name={user?.name} role="supervisor" />
<RoleOnboarding />
    <>
      <CelebrateOverlay queueEmpty={pending === 0 && sessionDecisions > 0} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />

      <div className="mx-auto w-full max-w-7xl space-y-4 min-w-0">
        <PageHeader title="Supervisor" subtitle="Shift command & gate operations" />
        <ContextSituationBar
          roleLabel="Gate Supervisor"
          purpose="Coordinate campus gate operations, active security shifts, and perimeter incident response"
          contextLabel="Supervisor Command Center"
          statusSummary={escalationsOpen > 0 || incidentsOpen > 0 ? `${escalationsOpen} escalations and ${incidentsOpen} incidents requiring supervisor attention.` : "All supervised gates active and shift coverage operational."}
          why="Supervisors maintain overall campus perimeter safety by resolving frontline guard escalations and tracking shift handovers."
          severity={incidentsOpen > 0 ? "critical" : escalationsOpen > 0 ? "warn" : "ok"}
          primaryAction={{ label: "Live Gate Desk", href: "/supervisor/gates/live" }}
          secondaryAction={{ label: "Shift Handover", href: "/supervisor/shift/handover" }}
        />
      <LivePulseStrip items={[{ id: "gates", label: "Gate Wall", valueLabel: "Live", tone: "ok", benchmark: "Monitor active terminals & claim codes" }, { id: "escalations", label: "Escalations", valueLabel: "Actionable", tone: "warn", benchmark: "Acknowledge, resolve, or escalate to VP" }]} />
        {/* Live Inside vs. Outside headcount split by branch + hostel block. */}
        <PresenceSplitPanel compact />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k) => <KpiTile key={k.label} {...k} />)}
        </div>
        {/* 1. Shift bar — shift-aware, not day-aware */}
        <WidgetBoundary name="ShiftBar" title="Shift Bar">
          <div
            onClick={() =>
              inspect(
                shiftInspection(
                  {
                    startedAt: d?.shift.startedAt ?? null,
                    endsAt: d?.shift.endsAt ?? null,
                    unresolvedIncidents: incidentsOpen,
                    gateCoverage: { total: totalGates, staffed: gatesOnline },
                  },
                  role,
                ),
              )
            }
            className="cursor-pointer"
          >
            <ShiftBar
              startedAt={d?.shift.startedAt ?? null}
              endsAt={d?.shift.endsAt ?? null}
              escalationsOpen={escalationsOpen}
              incidentsOpen={incidentsOpen}
            />
          </div>
        </WidgetBoundary>

        {/* 2. Focus zone — the one thing to clear right now */}
        <WidgetBoundary name="FocusZone" title="Focus Zone">
          <FocusZone item={focusItem} onEnterFocus={() => setFocusOpen(true)} />
        </WidgetBoundary>

        {/* 3. Team + Gates — the two things a supervisor watches */}
        <WidgetBoundary name="TeamAndGates" title="Team & Gates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamRoster />
            <div
              onClick={() =>
                d?.gates.length
                  ? inspect(gateLiveInspection({ id: d.gates[0].id, name: d.gates[0].name, isActive: d.gates[0].isActive, onPost: d.gates[0].onPost, lastActivity: d.gates[0].lastActivity }, role))
                  : undefined
              }
              className="cursor-pointer"
            >
              <GateWall gates={d?.gates ?? []} />
            </div>
          </div>
        </WidgetBoundary>

        {/* 4. Handover streak — supervisor-specific */}
        <WidgetBoundary name="HandoverStreak" title="Handover Streak">
          <HandoverStreak />
        </WidgetBoundary>

        {/* 5. Scorecard */}
        <WidgetBoundary name="Scorecard" title="Scorecard">
          <Scorecard
            thisWeek={d?.insights.thisWeek ?? 0}
            lastWeek={d?.insights.lastWeek ?? 0}
            avgResponseSec={d?.insights.avgResponseSec ?? 0}
          />
        </WidgetBoundary>

        {/* 6. Wins + Insight */}
        <WidgetBoundary name="WinsAndInsights" title="Wins & Insights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WinFeed />
            <InsightCard
              escalationsOpen={escalationsOpen}
              incidentsOpen={incidentsOpen}
              gatesOnline={gatesOnline}
              totalGates={totalGates}
              securityOnDuty={securityOnDuty}
            />
          </div>
        </WidgetBoundary>

        {/* 7. Upcoming — SLA deadlines */}
        <WidgetBoundary name="UpcomingPreview" title="Upcoming Preview">
          <UpcomingPreview items={upcoming} />
        </WidgetBoundary>

        {/* 8. Retention & Handover Widgets */}
        <WidgetBoundary name="DigitalHandover" title="Digital Handover">
          <DigitalHandover />
        </WidgetBoundary>

      </div>

      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </>
</>
    );
}
