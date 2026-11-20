/**
 * hooks/useEffectivePref.ts — read any preference through the 4-layer cascade.
 *
 *   policy > user > persona > role > system
 *
 * The hook owns the cascade: it reads the user's stored prefs (from the
 * auth store + a lazy fetch of /api/preferences), the current persona
 * (usePersona), and the role (auth store), then calls resolvePref().
 *
 * Shells call `const { value, locked } = useEffectivePref("appearance.density")`
 * instead of hardcoding a default. `locked` is true when a "required"-rank
 * key is in effect — the UI shows 🔒 "Set by institute".
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePersona } from "@/hooks/usePersona";
import { useActiveTraits } from "@/hooks/useActiveTraits";
import {
  resolvePref,
  PERSONA_DEFAULTS,
  ROLE_DEFAULTS,
  POLICY_DEFAULTS,
  type CascadeContext,
} from "@/lib/preferences/resolve";
import { getPrefDef, type Persona as PersonaKey } from "@/lib/preferences/registry";

export interface EffectivePrefResult<T> {
  /** The effective value after the cascade. */
  value: T;
  /** Which layer won. */
  source: "policy" | "user" | "trait" | "persona" | "role" | "system";
  /** The trait id when the trait layer won. */
  traitId?: string;
  /** The key's rank. */
  rank: "required" | "recommended" | "cosmetic";
  /** True when a "required"-rank policy value is in effect (show the lock). */
  locked: boolean;
  /** The user's stored value, even when policy overrode it. */
  userValue: unknown;
}

/**
 * Read one preference key through the 5-layer cascade:
 *   policy > user > trait > persona > role > system
 *
 * The hook owns the cascade: it reads the user's stored prefs, the current
 * persona (usePersona), the active traits (useActiveTraits), and the role
 * (auth store), then calls resolvePref().
 *
 * Shells call `const { value, locked, source } = useEffectivePref("appearance.density")`
 * instead of hardcoding a default. `locked` is true when a "required"-rank
 * key is in effect — the UI shows 🔒 "Set by institute". `source` is the
 * layer that won (used by the PreviewAs tool + the lock indicator).
 *
 * Tier 1 (hooks) — never forks.
 */
export function useEffectivePref<T>(
  key: string,
  userPrefs?: Record<string, unknown>,
): EffectivePrefResult<T> {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const personaKey = usePersona();
  const traits = useActiveTraits().traits;

  return useMemo(() => {
    // The user layer: explicit arg, else the auth store's stored prefs.
    const userLayer: Record<string, unknown> =
      userPrefs ?? (user as unknown as { preferences?: Record<string, unknown> })?.preferences ?? {};

    // Build the cascade context.
    const persona = (PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.both) as Record<string, unknown>;
    const roleLayer = (ROLE_DEFAULTS[role ?? "student"] ?? ROLE_DEFAULTS.student) as Record<string, unknown>;
    const ctx: CascadeContext = {
      user: userLayer,
      traits,
      persona,
      role: roleLayer,
      policy: POLICY_DEFAULTS,
    };

    const resolved = resolvePref<T>(key, ctx);

    return {
      value: resolved.value,
      source: resolved.source,
      traitId: resolved.traitId,
      rank: resolved.rank,
      locked: resolved.rank === "required" && resolved.source === "policy",
      userValue: resolved.userValue,
    };
  }, [key, userPrefs, user, role, personaKey, traits]);
}

export default useEffectivePref;
