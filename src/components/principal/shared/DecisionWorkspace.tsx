"use client";

/**
 * DecisionWorkspace — PR-09. The unified decision/execution surface.
 *
 * Consolidates the existing approval detail (PermissionDetailPanel /
 * InboxDetailSheet) into one coherent model:
 *
 *   1. Request summary        (what's being decided)
 *   2. Requester / department (who asked — verified ref, not a guess)
 *   3. Reason + supporting info
 *   4. Current workflow stage
 *   5. Available actions      (only what the SERVER allows — see canAct)
 *   6. Confirmation gate      (consequential, possibly-irreversible actions)
 *   7. Result                 (the authoritative execution outcome — PR-10)
 *
 * Authorization rule (protocol §7.7, §12.2): the client NEVER decides what is
 * allowed. `availableActions` must come from a server check (e.g. the
 * `can-act` endpoint). This component only presents them + routes execution
 * through the PR-10 execution monitor (honest completed/failed/unknown).
 *
 * It reuses, not duplicates: the full approval detail is handed to
 * PermissionDetailPanel by ticket; this workspace adds the decision context
 * + confirmation + execution lifecycle around it.
 */
import { useState } from "react";
import type { PrincipalActionDefinition } from "@/lib/principal/contracts";
import type { ActionResult } from "@/hooks/usePrincipalAction";

export interface DecisionContext {
  /** The record being decided (its real id + a human label). */
  recordId: string;
  title: string;
  /** The requester, when the backend provides it (verified ref). */
  requester?: { label: string; role?: string } | null;
  /** One-line reason / supporting context. */
  reason?: string | null;
  /** Current workflow stage, when known. */
  stage?: string | null;
}

export interface DecisionWorkspaceProps<TInput, TOut> {
  context: DecisionContext;
  /** The actions the SERVER permits (from can-act / a permission check). */
  availableActions: PrincipalActionDefinition[];
  /** Confirmation gate for consequential actions. */
  requireConfirm?: boolean;
  /** The execution monitor (PR-10). One per consequential action. */
  executeAction: (
    action: PrincipalActionDefinition,
    input: TInput,
  ) => Promise<ActionResult<TOut>>;
  /** The last/known outcome to display (so "what happened" is visible). */
  lastOutcome?: ActionResult<TOut> | null;
  /** Optional: open the full approval detail in the shared panel. */
  renderDetail?: () => React.ReactNode;
  className?: string;
}

export function DecisionWorkspace<TInput, TOut>(
  props: DecisionWorkspaceProps<TInput, TOut>,
) {
  const {
    context,
    availableActions,
    requireConfirm = false,
    executeAction,
    lastOutcome,
    renderDetail,
    className,
  } = props;

  // Confirmation + per-action in-flight / outcome state (transient, local).
  const [pending, setPending] = useState<PrincipalActionDefinition | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmNeeded = (a: PrincipalActionDefinition) =>
    requireConfirm || a.confirmationRequired;

  const runAction = async (a: PrincipalActionDefinition) => {
    setBusy(true);
    // A reason is collected only when the action demands one (honest: don't
    // fabricate a reason field the workflow doesn't record).
    const input = (a.requiresReason ? reason : "") as unknown as TInput;
    const result = await executeAction(a, input);
    setBusy(false);
    setPending(null);
    setReason("");
    // The caller persists `result` into lastOutcome; we clear local state.
    void result;
  };

  const outcome = lastOutcome;
  const showUnknown = outcome?.state === "unknown";

  return (
    <div className={className}>
      {/* 1–4: decision context (verified fields only) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-text-primary">{context.title}</h3>
        {context.requester ? (
          <p className="text-xs text-text-muted">
            Requested by {context.requester.label}
            {context.requester.role ? ` · ${context.requester.role}` : ""}
          </p>
        ) : null}
        {context.reason ? (
          <p className="text-sm text-text-secondary">{context.reason}</p>
        ) : null}
        {context.stage ? (
          <p className="text-xs text-text-muted">Stage: {context.stage}</p>
        ) : null}
      </div>

      {/* 5: available actions (server-permitted only). Flat text affordances —
          no per-button card treatment, which avoids nested-card (lasagna)
          inside the workspace's outer card. */}
      {availableActions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {availableActions.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={busy}
              onClick={() =>
                confirmNeeded(a) ? setPending(a) : void runAction(a)
              }
              className="text-sm font-medium text-action-primary underline-offset-2 hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary rounded-sm"
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-muted">
          No authorized actions are available for this record right now.
        </p>
      )}

      {/* 6: confirmation gate (only for consequential actions). Divider-based
          block, not a nested card — the gate is a state, not a surface. */}
      {pending ? (
        <div
          role="alertdialog"
          aria-label={`Confirm ${pending.label}`}
          className="mt-3 border-t border-border pt-3"
        >
          <p className="text-sm font-medium text-text-primary">
            Confirm “{pending.label}”?
          </p>
          <p className="text-xs text-text-muted">
            This action will be recorded and may be irreversible.
          </p>
          {pending.requiresReason ? (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (recorded for audit)"
              className="mt-2 w-full rounded border border-border bg-bg-surface px-2 py-1 text-sm"
            />
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void runAction(pending)}
              disabled={busy}
              className="rounded-md bg-action-primary px-3 py-1 text-sm font-medium text-bg-surface disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-md border border-border px-3 py-1 text-sm text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* 7: authoritative result (from the execution monitor). Left-accent
          status line, not a nested card — it's a state, not a surface. */}
      {outcome ? (
        <div
          role="status"
          className={
            "mt-3 border-l-2 pl-3 text-sm " +
            (outcome.state === "completed"
              ? "border-action-success text-text-primary"
              : showUnknown
                ? "border-action-warning text-text-primary"
                : "border-action-danger text-text-primary")
          }
        >
          {outcome.state === "completed" ? (
            <span>Action completed and verified.</span>
          ) : showUnknown ? (
            <span>
              <strong className="text-action-warning">Outcome unconfirmed.</strong>{" "}
              {outcome.error}
            </span>
          ) : (
            <span>
              <strong className="text-action-danger">Action failed.</strong>{" "}
              {outcome.error}
            </span>
          )}
        </div>
      ) : null}

      {/* Full approval detail (shared panel, not a duplicate) */}
      {renderDetail ? <div className="mt-3">{renderDetail()}</div> : null}
    </div>
  );
}

export default DecisionWorkspace;
