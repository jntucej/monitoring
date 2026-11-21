// src/lib/useAction.ts
// Per-surface action state machine.
// Every button in every role's bespoke UI calls useAction(type, targetId)
// and renders the returned state however it wants.
//
// States: idle → confirming → submitting → done | denied | expired

import { useState, useCallback, useRef } from "react";
import { dispatchAction } from "./dispatch-action";
import type { ActionResult, ActionDef } from "./action-envelope";

export type ActionPhase =
  | "idle"
  | "confirming"
  | "submitting"
  | "done"
  | "denied"
  | "expired";

export interface UseActionResult {
  phase: ActionPhase;
  result: ActionResult | null;
  /** Fire the action (after any confirm step the UI has rendered). */
  fire: (payload?: Record<string, unknown>, reason?: string) => Promise<ActionResult>;
  /** Reset back to idle (e.g. after user dismisses the result). */
  reset: () => void;
}

export function useAction(
  actorId: string,
  actorRole: string,
  def: Pick<ActionDef, "type" | "tier">,
): UseActionResult {
  const [phase, setPhase] = useState<ActionPhase>("idle");
  const [result, setResult] = useState<ActionResult | null>(null);
  const keyRef = useRef<string>("");

  const fire = useCallback(
    async (
      payload?: Record<string, unknown>,
      reason?: string,
    ): Promise<ActionResult> => {
      keyRef.current = crypto.randomUUID();
      setPhase("submitting");
      const res = await dispatchAction({
        type: def.type,
        targetId: (payload?.targetId as string) ?? undefined,
        actorId,
        actorRole,
        payload,
        reason,
        idempotencyKey: keyRef.current,
      });
      setResult(res);
      setPhase(res.status === "ok" ? "done" : "denied");
      return res;
    },
    [def.type, actorId, actorRole],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
  }, []);

  return { phase, result, fire, reset };
}
