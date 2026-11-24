export type UrgencyTone = "info" | "ok" | "warn" | "critical";

export interface ActionableItemVM<TAction extends string> {
  id: string;
  title: string;
  subtitle: string;
  stageOrScope: string;
  urgencyLabel: string;
  urgencyTone: UrgencyTone;
  urgencyRank: number; // lower = more urgent (0 critical, 1 warn, 2 info, 3 ok)
  situationReason: string;
  lastActorNote?: {
    actor: string;
    actorRole: string;
    action: string;
    reason?: string | null;
    when?: string | null;
  };
  actions: Array<{
    action: TAction;
    label: string;
    consequence: string;
    requiresReason?: boolean;
    tone?: "primary" | "secondary" | "danger";
  }>;
}

export interface RawPermissionLike {
  id: string;
  ticket_number?: string;
  ticketNumber?: string;
  student_name?: string;
  studentName?: string;
  roll_number?: string;
  rollNumber?: string;
  workflow_type?: string;
  workflowType?: string;
  status?: string;
  current_stage?: string;
  currentStage?: string;
  reason?: string;
  sla_deadline?: string;
  slaDeadline?: string;
  campus_status?: string;
  campusStatus?: string;
  stage_history?: Array<{
    actor_name?: string;
    actorName?: string;
    actor_role?: string;
    actorRole?: string;
    action?: string;
    comment?: string | null;
    reason?: string | null;
    at?: string;
    timestamp?: string;
  }>;
  stageHistory?: Array<{
    actor_name?: string;
    actorName?: string;
    actor_role?: string;
    actorRole?: string;
    action?: string;
    comment?: string | null;
    reason?: string | null;
    at?: string;
    timestamp?: string;
  }>;
}

export function mapPermissionToActionableVM(
  row: RawPermissionLike,
  forwardLabel: string,
): ActionableItemVM<"APPROVE" | "FORWARD" | "REJECT"> {
  const ticket = row.ticket_number ?? row.ticketNumber ?? row.id;
  const student = row.student_name ?? row.studentName ?? "Student";
  const roll = row.roll_number ?? row.rollNumber ?? "—";
  const wf = row.workflow_type ?? row.workflowType ?? "Permission";
  const stage = row.current_stage ?? row.currentStage ?? "Pending";
  const campus = row.campus_status ?? row.campusStatus ?? "Campus status unknown";
  const deadline = row.sla_deadline ?? row.slaDeadline;

  let urgencyLabel = "No SLA";
  let urgencyTone: UrgencyTone = "info";
  let urgencyRank = 2;

  if (deadline) {
    const mins = Math.round((new Date(deadline).getTime() - Date.now()) / 60_000);
    if (!Number.isNaN(mins)) {
      if (mins <= 0) {
        urgencyLabel = "SLA breached";
        urgencyTone = "critical";
        urgencyRank = 0;
      } else if (mins < 60) {
        urgencyLabel = `${mins}m left`;
        urgencyTone = "warn";
        urgencyRank = 1;
      } else {
        const hrs = Math.round(mins / 60);
        urgencyLabel = `${hrs}h left`;
        urgencyTone = hrs <= 3 ? "warn" : "ok";
        urgencyRank = hrs <= 3 ? 1 : 3;
      }
    }
  }

  if ((row.status ?? "").toUpperCase() === "ESCALATED" && urgencyRank > 1) {
    urgencyTone = "warn";
    urgencyRank = 1;
  }

  const rawHistory = row.stage_history ?? row.stageHistory;
  const history = Array.isArray(rawHistory) ? rawHistory : [];
  const last = history.length > 0 ? history[history.length - 1] : null;

  return {
    id: ticket,
    title: `${student} (${roll}) · ${ticket}`,
    subtitle: `${wf} · Stage: ${stage} · ${campus}`,
    stageOrScope: stage,
    urgencyLabel,
    urgencyTone,
    urgencyRank,
    situationReason: row.reason?.trim() || "No reason text provided.",
    lastActorNote: last
      ? {
          actor: last.actor_name ?? last.actorName ?? "Prior Actor",
          actorRole: last.actor_role ?? last.actorRole ?? stage,
          action: last.action ?? "UPDATED",
          reason: last.comment ?? last.reason ?? null,
          when: (last.at ?? last.timestamp)
            ? new Date(last.at ?? last.timestamp ?? "").toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Recent",
        }
      : undefined,
    actions: [
      {
        action: "APPROVE",
        label: "Approve",
        tone: "primary",
        consequence: "Approves stage & activates gate QR if final",
      },
      {
        action: "FORWARD",
        label: forwardLabel,
        tone: "secondary",
        consequence: `Routes ticket to ${forwardLabel.replace(/^Forward to /i, "")}`,
      },
      {
        action: "REJECT",
        label: "Reject",
        tone: "danger",
        requiresReason: true,
        consequence: "Closes request & notifies student/guardian",
      },
    ],
  };
}
