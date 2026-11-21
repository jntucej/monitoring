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
import { hasCapability } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";

export interface UseCanActOptions {
  /** The ticket's requirements. */
  requirements: TicketRequirements;
  /** Override the flag (from a fetched flag status). */
  flag?: FlagLevel;
  /** Whether the actor has completed step-up auth this session. */
  stepUpVerified?: boolean;
  /**
   * P1 / §1 Touch 4: when present, ALSO gate on a capability id from the
   * config-driven resolver. The button is enabled only when BOTH the
   * ticket `canAct` AND the capability pass. This keeps the same call
   * site server-consistent with the API route (which checks the same
   * capability id).
   */
  capability?: string;
  /** The workspace context to evaluate the capability against. */
  context?: WorkspaceContext;
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
  const { requirements, flag, stepUpVerified, capability, context } = options;
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
    let allowed = decision.allowed;
    let blockMessage = allowed ? "" : (decision as { message: string }).message;

    // P1 / §1 Touch 4: when a capability id is present, the button is
    // enabled only when BOTH the ticket canAct AND the config capability
    // pass. Same resolver the API route uses → client/server agree.
    if (capability && context && allowed) {
      const capGranted = hasCapability(role, context, capability);
      if (!capGranted) {
        allowed = false;
        blockMessage = `Capability '${capability}' not granted for this context.`;
      }
    }

    return {
      decision,
      actor,
      canAct: allowed,
      blockMessage,
    };
  }, [user, role, requirements, flag, stepUpVerified, capability, context]);
}

export default useCanAct;
