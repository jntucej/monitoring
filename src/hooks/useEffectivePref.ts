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
  source: "policy" | "user" | "persona" | "role" | "system";
  /** The key's rank. */
  rank: "required" | "recommended" | "cosmetic";
  /** True when a "required"-rank policy value is in effect (show the lock). */
  locked: boolean;
  /** The user's stored value, even when policy overrode it. */
  userValue: unknown;
}

/**
 * Read one preference key through the cascade.
 *
 * @param key        A registered preference key (from lib/preferences/registry).
 * @param userPrefs  The user's stored overrides. Pass the auth store's
 *                   `user.preferences` or a fetched map. When omitted, the
 *                   hook reads it from the auth store.
 */
export function useEffectivePref<T>(
  key: string,
  userPrefs?: Record<string, unknown>,
): EffectivePrefResult<T> {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const personaKey = usePersona();

  return useMemo(() => {
    // The user layer: explicit arg, else the auth store's stored prefs.
    const userLayer: Record<string, unknown> =
      userPrefs ?? (user as unknown as { preferences?: Record<string, unknown> })?.preferences ?? {};

    // Build the cascade context.
    const persona = (PERSONA_DEFAULTS[personaKey] ?? PERSONA_DEFAULTS.both) as Record<string, unknown>;
    const roleLayer = (ROLE_DEFAULTS[role ?? "student"] ?? ROLE_DEFAULTS.student) as Record<string, unknown>;
    const ctx: CascadeContext = {
      user: userLayer,
      persona,
      role: roleLayer,
      policy: POLICY_DEFAULTS,
    };

    const resolved = resolvePref<T>(key, ctx);
    const def = getPrefDef(key);

    return {
      value: resolved.value,
      source: resolved.source,
      rank: resolved.rank,
      locked: resolved.rank === "required" && resolved.source === "policy",
      userValue: resolved.userValue,
    };
  }, [key, userPrefs, user, role, personaKey]);
}

export default useEffectivePref;
