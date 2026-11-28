"use client";

import { CheckCircle2, Clock, Shield, User, Users, ShieldAlert } from "lucide-react";

interface Step {
  id: string;
  label: string;
  role: string;
  icon: typeof User;
}

const STEPS: Step[] = [
  { id: "student", label: "Student Submission", role: "Applicant", icon: User },
  { id: "parent", label: "Parent Consent", role: "Guardian", icon: Users },
  { id: "warden", label: "Warden / Faculty", role: "Approver", icon: Shield },
  { id: "gate", label: "Gate Turnstile", role: "Security Scan", icon: CheckCircle2 },
];

interface ApprovalChainStepperProps {
  status?: string;
  isParentApproved?: boolean;
  isAdminApproved?: boolean;
}

export function ApprovalChainStepper({
  status = "PENDING",
  isParentApproved = false,
  isAdminApproved = false,
}: ApprovalChainStepperProps) {
  const normStatus = status.toUpperCase();
  const isRejected = normStatus.includes("REJECT");
  const isApproved =
    normStatus === "APPROVED" ||
    normStatus === "APPROVED_ADMIN" ||
    normStatus === "APPROVED_PARENT";

  // Determine current active step: 0=student submitted, 1=parent, 2=warden, 3=gate
  let activeIndex = 0;
  if (isApproved) {
    activeIndex = 3;
  } else if (isAdminApproved) {
    activeIndex = 3;
  } else if (isParentApproved) {
    activeIndex = 2;
  } else {
    activeIndex = 1;
  }

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Approval Chain Stepper
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isApproved
              ? "bg-emerald-500/15 text-action-success"
              : isRejected
              ? "bg-rose-500/15 text-action-danger"
              : "bg-amber-500/15 text-action-warning"
          }`}
        >
          {isApproved ? "Ready for Gate" : isRejected ? "Rejected" : "In Progress"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {STEPS.map((s, idx) => {
          const StepIcon = s.icon;
          const isDone = isApproved || idx < activeIndex;
          const isCurrent = !isApproved && !isRejected && idx === activeIndex;

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded-lg border transition-colors flex flex-col justify-between ${
                isDone
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : isCurrent
                  ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
                  : "border-border bg-bg-elevated opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <StepIcon
                  className={`w-4 h-4 ${
                    isDone
                      ? "text-action-success"
                      : isCurrent
                      ? "text-action-warning"
                      : "text-text-muted"
                  }`}
                />
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-action-success" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-action-warning animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-border" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary leading-tight">
                  {s.label}
                </p>
                <p className="text-[10px] text-text-muted">{s.role}</p>
              </div>
            </div>
          );
        })}
      </div>

      {isRejected && (
        <p className="text-xs text-action-danger flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Request was rejected in the chain.
        </p>
      )}
    </div>
  );
}

export default ApprovalChainStepper;
