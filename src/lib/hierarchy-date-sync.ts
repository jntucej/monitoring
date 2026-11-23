export type HierarchyRole =
  | "hod"
  | "deputy_warden"
  | "hostel_manager"
  | "exam_branch"
  | "oie"
  | "vice_principal"
  | "principal"
  | "supervisor"
  | "admin"
  | "sysadmin";

export interface DateSyncSnapshot {
  date: string;
  presetApplied?: string | null;
  activeOverridesCount: number;
  uncoveredPostsCount: number;
  dispatchedGuardsCount: number;
  pendingStageApprovalsCount: number;
  urgentEscalationsCount: number;
  lastSyncedAt: string;
}

export interface HierarchyDateSummary {
  headlineStat: string;
  secondaryStat: string;
  alertCount: number;
  drilldownHref: string;
}

export function buildHierarchyDateSummary(
  role: string | undefined,
  snap: DateSyncSnapshot,
): HierarchyDateSummary {
  const r = (role ?? "").toLowerCase();

  if (r === "hod") {
    return {
      headlineStat: `${snap.pendingStageApprovalsCount} Dept Approvals`,
      secondaryStat: `${snap.activeOverridesCount} Schedule Overrides`,
      alertCount: snap.pendingStageApprovalsCount + snap.urgentEscalationsCount,
      drilldownHref: `/hod/classes?date=${encodeURIComponent(snap.date)}`,
    };
  }

  if (["deputy_warden", "hostel_manager", "supervisor"].includes(r)) {
    const gaps = snap.uncoveredPostsCount + snap.dispatchedGuardsCount;
    return {
      headlineStat: `${snap.uncoveredPostsCount} Uncovered Posts • ${snap.dispatchedGuardsCount} Dispatched`,
      secondaryStat: `${snap.activeOverridesCount} Active Schedule Rules`,
      alertCount: gaps + snap.urgentEscalationsCount,
      drilldownHref: `/supervisor/team/shifts?date=${encodeURIComponent(snap.date)}`,
    };
  }

  if (r === "exam_branch" || r === "oie") {
    return {
      headlineStat: `${snap.activeOverridesCount} Exam/Schedule Overrides`,
      secondaryStat: `${snap.pendingStageApprovalsCount} Clearances/Items`,
      alertCount: snap.urgentEscalationsCount,
      drilldownHref: `/exam-branch/calendar?date=${encodeURIComponent(snap.date)}`,
    };
  }

  if (r === "sysadmin") {
    return {
      headlineStat: `${snap.activeOverridesCount} Overrides • ${snap.uncoveredPostsCount} Post Gaps`,
      secondaryStat: `Synced ${new Date(snap.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      alertCount: snap.uncoveredPostsCount + snap.urgentEscalationsCount,
      drilldownHref: `/sysadmin/scheduling?date=${encodeURIComponent(snap.date)}`,
    };
  }

  return {
    headlineStat: `${snap.urgentEscalationsCount} Urgent Escalations • ${snap.pendingStageApprovalsCount} Queued`,
    secondaryStat: `${snap.uncoveredPostsCount} Post Gaps • ${snap.activeOverridesCount} Overrides`,
    alertCount: snap.urgentEscalationsCount + snap.uncoveredPostsCount,
    drilldownHref: `/principal/governance/analytics?date=${encodeURIComponent(snap.date)}`,
  };
}
