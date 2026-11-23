export type GuardDutyStatus = "ON_POST" | "DISPATCHED" | "RELIEVED" | "UNCOVERED";

export interface GuardPostAssignment {
  assignmentId: string;
  guardId: string;
  guardName: string;
  guardPhone?: string | null;
  postId: string;
  postName: string;
  shiftLabel: string;
  dutyStatus: GuardDutyStatus;
  roleAtPost: "scanner" | "response" | "patrol";
}

export interface LocationIncidentAlert {
  id: string;
  ticketCode: string;
  postId: string;
  postName: string;
  exactSpot?: string | null;
  severity: "distress" | "urgent" | "routine";
  studentName: string;
  studentRoll?: string | null;
  studentPhone?: string | null;
  summary: string;
  createdAt: string;
  ackByGuardId?: string | null;
  ackByGuardName?: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "ON_SITE" | "RESOLVED";
}

export function resolvePostCoverageAndAlerts(
  assignments: GuardPostAssignment[],
  incidents: LocationIncidentAlert[],
) {
  const byPost = new Map<
    string,
    {
      postId: string;
      postName: string;
      guards: GuardPostAssignment[];
      activeGuardsCount: number;
      dispatchedCount: number;
      uncovered: boolean;
      openIncidents: LocationIncidentAlert[];
    }
  >();

  for (const a of assignments) {
    const entry = byPost.get(a.postId) ?? {
      postId: a.postId,
      postName: a.postName,
      guards: [],
      activeGuardsCount: 0,
      dispatchedCount: 0,
      uncovered: false,
      openIncidents: [],
    };
    entry.guards.push(a);
    if (a.dutyStatus === "ON_POST") entry.activeGuardsCount += 1;
    if (a.dutyStatus === "DISPATCHED") entry.dispatchedCount += 1;
    byPost.set(a.postId, entry);
  }

  for (const inc of incidents) {
    if (inc.status === "RESOLVED") continue;
    const entry = byPost.get(inc.postId) ?? {
      postId: inc.postId,
      postName: inc.postName,
      guards: [],
      activeGuardsCount: 0,
      dispatchedCount: 0,
      uncovered: true,
      openIncidents: [],
    };
    entry.openIncidents.push(inc);
    byPost.set(inc.postId, entry);
  }

  for (const entry of byPost.values()) {
    entry.uncovered = entry.activeGuardsCount === 0;
  }

  return Array.from(byPost.values());
}
