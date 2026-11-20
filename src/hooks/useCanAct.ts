/**
 * hooks/useCanAct.ts — client-side canAct for the current actor.
 *
 * Reads the auth store, builds an Actor, and returns the CanAct result
 * for a given TicketRequirements. Use in components to gate buttons
 * and show the "I can't act" banner.
 */

"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  canAct,
  makeActor,
  type Actor,
  type TicketRequirements,
  type CanAct,
  type FlagLevel,
  type Domain,
} from "@/lib/permission-model";

export interface UseCanActOptions {
  /** The ticket's requirements. */
  requirements: TicketRequirements;
  /** Override the flag (from a fetched flag status). */
  flag?: FlagLevel;
  /** Whether the actor has completed step-up auth this session. */
  stepUpVerified?: boolean;
}

export interface UseCanActResult {
  /** The CanAct decision. */
  decision: CanAct;
  /** The Actor used for the check. */
  actor: Actor;
  /** Convenience: true when decision.allowed. */
  canAct: boolean;
  /** Human-readable block reason (empty when allowed). */
  blockMessage: string;
}

export function useCanAct(options: UseCanActOptions): UseCanActResult {
  const { requirements, flag, stepUpVerified } = options;
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  return useMemo(() => {
    if (!user || !role) {
      return {
        decision: {
          allowed: false as const,
          reason: "tier_too_low" as const,
          message: "Not authenticated.",
        } as CanAct,
        actor: makeActor("unknown", "student", { flag: "clear" }),
        canAct: false,
        blockMessage: "Not authenticated.",
      };
    }

    const actor = makeActor(user.id, role, {
      flag: flag ?? "clear",
      stepUpVerified: stepUpVerified ?? false,
    });

    const decision = canAct(actor, requirements);
    const allowed = decision.allowed;

    return {
      decision,
      actor,
      canAct: allowed,
      blockMessage: allowed ? "" : (decision as { message: string }).message,
    };
  }, [user, role, requirements, flag, stepUpVerified]);
}

export default useCanAct;
