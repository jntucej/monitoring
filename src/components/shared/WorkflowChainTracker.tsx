"use client";

import { CheckCircle2, Circle, AlertTriangle, XCircle } from "lucide-react";

export interface WorkflowStageEvent {
  stage: string;
  actorName?: string | null;
  atLabel?: string | null;
  status: "completed" | "current" | "upcoming" | "blocked";
}

export interface WorkflowChainTrackerProps {
  currentStage?: string | null;
  ticketStatus?: string | null;
  events?: Array<{
    actorName?: string | null;
    actorRole?: string | null;
    actionTaken?: string | null;
    atLabel?: string | null;
  }>;
  compact?: boolean;
}

const DEFAULT_CHAIN = [
  { key: "student", label: "Student" },
  { key: "hod", label: "HOD" },
  { key: "vice_principal", label: "VP" },
  { key: "oie", label: "OIE / Exam" },
  { key: "operator", label: "Gate Operator" },
  { key: "guardian", label: "Guardian" },
];

function normalizeStageKey(raw?: string | null): string {
  const s = (raw ?? "").toLowerCase().trim();
  if (s.includes("student") || s.includes("submit")) return "student";
  if (s.includes("hod") || s.includes("faculty")) return "hod";
  if (s.includes("vice") || s === "vp") return "vice_principal";
  if (s.includes("oie") || s.includes("exam") || s.includes("controller")) return "oie";
  if (s.includes("gate") || s.includes("operator") || s.includes("scan")) return "operator";
  if (s.includes("guardian") || s.includes("parent")) return "guardian";
  if (s.includes("warden") || s.includes("hostel") || s.includes("caretaker")) return "hod";
  if (s.includes("principal")) return "vice_principal";
  return "hod";
}

/**
 * WorkflowChainTracker — compact horizontal stepped pipeline showing:
 * Student -> HOD -> VP -> OIE/Exam -> Gate Operator -> Guardian
 * with completed actor+timestamp, highlighted current stage, and blocked/rejected state.
 */
export function WorkflowChainTracker({
  currentStage,
  ticketStatus,
  events = [],
  compact = false,
}: WorkflowChainTrackerProps) {
  const statusUpper = (ticketStatus ?? "").toUpperCase();
  const isRejected = statusUpper === "REJECTED" || statusUpper === "CANCELLED";
  const isApproved = statusUpper === "APPROVED" || statusUpper === "ACTIVE" || statusUpper === "GRANTED";
  const isEscalated = statusUpper === "ESCALATED";

  const activeKey = isApproved ? "operator" : normalizeStageKey(currentStage);
  const activeIdx = Math.max(
    0,
    DEFAULT_CHAIN.findIndex((c) => c.key === activeKey),
  );

  const steps: WorkflowStageEvent[] = DEFAULT_CHAIN.map((step, idx) => {
    const matched = events.find((e) => normalizeStageKey(e.actorRole) === step.key);
    if (idx < activeIdx || (isApproved && idx <= activeIdx)) {
      return {
        stage: step.label,
        actorName: matched?.actorName ?? null,
        atLabel: matched?.atLabel ?? null,
        status: "completed",
      };
    }
    if (idx === activeIdx) {
      return {
        stage: step.label,
        actorName: matched?.actorName ?? null,
        atLabel: matched?.atLabel ?? null,
        status: isRejected || isEscalated ? "blocked" : "current",
      };
    }
    return {
      stage: step.label,
      status: "upcoming",
    };
  });

  return (
    <nav aria-label="Workflow stage progress" className="w-full overflow-x-auto">
      <ol className={`flex items-center gap-1.5 ${compact ? "text-[11px]" : "text-xs"}`}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const pillCls =
            step.status === "completed"
              ? "bg-action-success/15 text-action-success"
              : step.status === "blocked"
                ? isRejected
                  ? "bg-action-danger/15 text-action-danger font-semibold"
                  : "bg-amber-500/15 text-action-warning font-semibold"
                : step.status === "current"
                  ? "bg-action-primary/15 text-action-primary font-semibold"
                  : "bg-bg-elevated text-text-muted";

          return (
            <li key={step.stage} className="flex items-center gap-1.5 shrink-0">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${pillCls}`}>
                {step.status === "completed" && <CheckCircle2 className="size-3 shrink-0" />}
                {step.status === "current" && <Circle className="size-3 shrink-0 fill-current" />}
                {step.status === "blocked" &&
                  (isRejected ? (
                    <XCircle className="size-3 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3 shrink-0" />
                  ))}
                <span>{step.stage}</span>
                {step.status === "current" && !compact && (
                  <span className="opacity-80">· Waiting</span>
                )}
                {step.actorName && !compact && (
                  <span className="opacity-75">
                    ({step.actorName}
                    {step.atLabel ? ` · ${step.atLabel}` : ""})
                  </span>
                )}
              </span>
              {!isLast && <span className="text-text-muted" aria-hidden="true">→</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default WorkflowChainTracker;
