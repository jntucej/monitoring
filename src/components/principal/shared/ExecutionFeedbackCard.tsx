"use client";

/**
 * ExecutionFeedbackCard — PR-11. Renders the honest execution feedback from
 * buildExecutionFeedback: the result, the next safe step, and whether an audit
 * record is actually confirmed (never asserted without evidence).
 */
import type { ExecutionFeedback } from "@/lib/principal/executionFeedback";
import { cn } from "@/lib/utils";

export function ExecutionFeedbackCard({
  feedback,
  className,
}: {
  feedback: ExecutionFeedback;
  className?: string;
}) {
  const tone =
    feedback.kind === "audit-verified" || feedback.kind === "completed"
      ? "text-action-success"
      : feedback.kind === "unknown" || feedback.kind === "partial"
        ? "text-action-warning"
        : feedback.kind === "failed"
          ? "text-action-danger"
          : "text-text-muted";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-md border border-border bg-bg-surface p-3",
        className,
      )}
    >
      <p className={cn("text-sm font-medium", tone)}>{feedback.headline}</p>
      {feedback.nextStep ? (
        <p className="mt-1 text-xs text-text-muted">{feedback.nextStep}</p>
      ) : null}
      {feedback.auditConfirmed ? (
        <p className="mt-1 text-[11px] font-mono text-text-muted">
          audit record confirmed
        </p>
      ) : feedback.kind === "completed" ? (
        <p className="mt-1 text-[11px] font-mono text-text-muted">
          audit record not confirmed
        </p>
      ) : null}
    </div>
  );
}

export default ExecutionFeedbackCard;
