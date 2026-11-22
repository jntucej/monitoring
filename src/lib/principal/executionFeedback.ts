/**
 * executionFeedback — PR-11. Translate an authoritative ActionResult into
 * honest user-facing feedback.
 *
 * The core rule (protocol §2.5, §11): distinguish FOUR different facts that a
 * naive "success" message conflates:
 *   1. Action ACCEPTED     — the server took the request
 *   2. Workflow UPDATED     — the record's state actually changed
 *   3. Downstream COMPLETED — any chained operation finished
 *   4. Audit RECORDED       — an audit event exists
 *
 * None of 2–4 may be asserted without evidence in the payload. This mapper
 * only labels what the result actually proves, and offers a safe verify path
 * for the unknown/partial cases.
 */
import type { ActionResult } from "@/hooks/usePrincipalAction";

export type FeedbackKind =
  | "accepted"
  | "completed"
  | "failed"
  | "partial"
  | "unknown"
  | "audit-verified"
  | "audit-unverified";

export interface ExecutionFeedback {
  kind: FeedbackKind;
  /** The headline the UI shows (calm, institutional, accurate). */
  headline: string;
  /** The safe next step, when the outcome is not a clean completion. */
  nextStep?: string;
  /** True only when the payload itself proves an audit event was recorded. */
  auditConfirmed: boolean;
}

/**
 * A payload that MAY carry audit evidence. The mapper only asserts
 * audit-verified when the caller hands it a non-empty audit reference the
 * server returned — never assumed.
 */
export interface AuditEvidence {
  /** The audit event id/ref the server returned (null/empty = not confirmed). */
  auditRef?: string | null;
  /** Did the server explicitly report the downstream op completed? */
  downstreamCompleted?: boolean;
  /** Did the server explicitly report the record state changed? */
  workflowUpdated?: boolean;
}

export function buildExecutionFeedback<T>(
  result: ActionResult<T>,
  evidence?: AuditEvidence,
): ExecutionFeedback {
  switch (result.state) {
    case "completed": {
      // Distinguish "the server accepted it" from "an audit event was
      // confirmed present" — only the latter earns the audit-verified label.
      if (evidence?.auditRef) {
        return {
          kind: "audit-verified",
          headline: "Action completed and recorded for audit.",
          auditConfirmed: true,
        };
      }
      // Completed but audit not confirmed in the payload: say exactly that.
      const workflowNote =
        evidence?.workflowUpdated === false
          ? " The record state has not been confirmed updated yet."
          : "";
      return {
        kind: "completed",
        headline: `Action completed.${workflowNote}`,
        nextStep:
          evidence?.auditRef
            ? undefined
            : "Verify the record to confirm the update was applied.",
        auditConfirmed: false,
      };
    }
    case "partial": {
      return {
        kind: "partial",
        headline: "Part of the action completed.",
        nextStep: "Review which items succeeded before retrying the rest.",
        auditConfirmed: false,
      };
    }
    case "failed": {
      return {
        kind: "failed",
        headline: "The action was not completed.",
        nextStep: result.error ?? "Correct the issue and try again.",
        auditConfirmed: false,
      };
    }
    case "unknown": {
      // The honest path: never claim success OR certain failure.
      return {
        kind: "unknown",
        headline: "Outcome not confirmed.",
        nextStep:
          "The request may have been recorded. Refresh the record to verify before retrying.",
        auditConfirmed: false,
      };
    }
    case "idle":
    case "validating":
    case "submitting":
    case "processing": {
      return {
        kind: "accepted",
        headline: "Action in progress.",
        nextStep: "Wait for the authoritative result.",
        auditConfirmed: false,
      };
    }
  }
}
