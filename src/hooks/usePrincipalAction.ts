"use client";

/**
 * usePrincipalAction — PR-10. The client-side ACTION EXECUTION MONITOR.
 *
 * Every consequential principal action (approve / reject / delegate / resolve)
 * runs through this lifecycle instead of a raw button that assumes success:
 *
 *   IDLE → VALIDATING → (CONFIRMATION) → SUBMITTING → PROCESSING
 *        → COMPLETED | FAILED | PARTIAL | UNKNOWN
 *        → REVALIDATION
 *
 * Data-integrity rules (protocol §12.3, §2.5):
 *  - The SERVER is the authority. This hook only reports what the server says.
 *  - A network failure AFTER the server may have processed the action is
 *    reported as UNKNOWN, never as FAILED — the caller offers a safe
 *    refresh/verify path, not a blind retry.
 *  - Duplicate submission is locked while in flight (one in-flight per action).
 *  - The transport is the established client fetch + getAuthHeaders(); no new
 *    fetch system is introduced.
 */
import { useCallback, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import type { PrincipalActionDefinition } from "@/lib/principal/contracts";

/** The execution lifecycle state machine (closed set). */
export type ActionExecutionState =
  | "idle"
  | "validating"
  | "submitting"
  | "processing"
  | "completed"
  | "failed"
  | "partial"
  | "unknown";

export interface ActionResult<T> {
  state: ActionExecutionState;
  /** The authoritative server payload, when the outcome is known. */
  data?: T;
  /** Human-readable failure reason (never a fabricated success). */
  error?: string;
  /** true when the outcome can't be confirmed (network lost post-submit). */
  unknown?: boolean;
}

/**
 * Pure outcome classifier (exported for unit tests; `execute` delegates to it).
 * Encodes the honest-outcome rule: a non-parseable or thrown response after
 * the request was SENT is UNKNOWN (the server may have processed it), never
 * a clean FAILED.
 */
export function classifyOutcome<T>(
  httpOk: boolean,
  jsonParsed: boolean,
  json: T | null,
  httpStatus?: number,
): ActionResult<T> {
  if (httpOk && jsonParsed) return { state: "completed", data: json as T };
  if (jsonParsed && json) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      `request failed (${httpStatus ?? "unknown"})`;
    return { state: "failed", error: msg };
  }
  // Non-parseable body OR unknown transport state: cannot confirm.
  return {
    state: "unknown",
    unknown: true,
    error: `Could not confirm the outcome (HTTP ${httpStatus ?? "?"}). Refresh to verify before retrying.`,
  };
}

export interface UsePrincipalActionOptions<TInput, TOut> {
  /** The action being executed (drives confirmation + correlation). */
  action: PrincipalActionDefinition;
  /** Endpoint to POST to (the server enforces all authorization). */
  endpoint: string;
  /** Build the JSON body. Validated client-side before submission. */
  buildBody: (input: TInput) => unknown;
  /** Client-side validation; return null when valid, an error string otherwise. */
  validate?: (input: TInput) => string | null;
  /** Confirm-before-execute (for consequential, possibly-irreversible actions). */
  confirmationRequired?: boolean;
  /** Called after a known outcome to revalidate dependent data. */
  onCompleted?: (data: TOut) => void;
  /** Called after a known failure. */
  onFailed?: (error: string) => void;
}

export interface UsePrincipalActionReturn<TInput, TOut> {
  /** Drive the lifecycle. Returns the authoritative result. */
  execute: (input: TInput) => Promise<ActionResult<TOut>>;
  /** The confirmation gate state (callers render a confirm dialog when true). */
  needsConfirmation: boolean;
  /** Reset to idle (e.g. after the user closes the workspace). */
  reset: () => void;
  inFlight: boolean;
  state: ActionExecutionState;
}

export function usePrincipalAction<TInput, TOut = unknown>(
  opts: UsePrincipalActionOptions<TInput, TOut>,
): UsePrincipalActionReturn<TInput, TOut> {
  const {
    action,
    endpoint,
    buildBody,
    validate,
    confirmationRequired = false,
    onCompleted,
    onFailed,
  } = opts;

  const [state, setState] = useState<ActionExecutionState>("idle");
  const [inFlight, setInFlight] = useState(false);
  // A lock prevents a second concurrent submit of the same action (duplicate
  // guard is also enforced server-side via withMutationGuard — defense in depth).
  const submitLock = useRef(false);
  // A consequential action needs a confirmation gate when the caller opts in,
  // or when the action definition declares it (e.g. an irreversible decision).
  const confirmNeeded = confirmationRequired || Boolean(action?.confirmationRequired);

  const reset = useCallback(() => {
    submitLock.current = false;
    setInFlight(false);
    setState("idle");
  }, []);

  const execute = useCallback(
    async (input: TInput): Promise<ActionResult<TOut>> => {
      // ── IDLE → VALIDATING ───────────────────────────────────────────
      setState("validating");
      const validationError = validate?.(input);
      if (validationError) {
        setState("idle");
        return { state: "failed", error: validationError };
      }

      // ── duplicate-submission guard ─────────────────────────────────
      if (submitLock.current) {
        return { state: "processing", error: "submission already in flight" };
      }
      submitLock.current = true;
      setInFlight(true);
      setState("submitting");

      // ── SUBMITTING → PROCESSING (server response is authoritative) ─
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(buildBody(input)),
        });

        let json: TOut | null = null;
        let jsonParsed = true;
        try {
          json = (await res.json()) as TOut;
        } catch {
          jsonParsed = false;
        }

        const outcome = classifyOutcome<TOut>(res.ok, jsonParsed, json, res.status);
        setState(outcome.state);
        if (outcome.state === "completed") {
          onCompleted?.(outcome.data as TOut);
        } else if (outcome.state === "failed") {
          onFailed?.(outcome.error ?? "action failed");
        }
        submitLock.current = false;
        setInFlight(false);
        return outcome;
      } catch {
        // Threw (network dropped / aborted) AFTER the request was sent:
        // the server may have processed it. UNKNOWN, never a blind FAILED.
        const outcome: ActionResult<TOut> = {
          state: "unknown",
          unknown: true,
          error:
            "Connection lost during submission. The action may have been recorded — refresh the record to verify before retrying.",
        };
        setState("unknown");
        submitLock.current = false;
        setInFlight(false);
        return outcome;
      }
    },
    [endpoint, buildBody, validate, onCompleted, onFailed],
  );

  return {
    execute,
    needsConfirmation: confirmNeeded,
    reset,
    inFlight,
    state,
  };
}
