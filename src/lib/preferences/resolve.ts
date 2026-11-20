/**
 * lib/preferences/resolve.ts — the 4-layer cascade resolver.
 *
 *   effective(key) =
 *     policyOverrides[key]   // rank "required" → wins, user value ignored
 *     ?? userPrefs[key]
 *     ?? personaDefaults[key]
 *     ?? roleDefaults[key]
 *     ?? systemDefaults[key]
 *
 * This is Tier 0/1 — it never forks. Every shell reads taste through
 * `useEffectivePref` (hooks/useEffectivePref.ts); no shell hardcodes a
 * default. When a preference changes, only the resolver path changes.
 */

import {
  getPrefDef,
  prefRank,
  PREF_REGISTRY,
  type PrefKeyDef,
  type Role,
  type Persona,
} from "@/lib/preferences/registry";

// ── Inputs to the cascade ──────────────────────────────────────────────────

export interface PersonaDefaults {
  [key: string]: unknown;
}
export interface RoleDefaults {
  [key: string]: unknown;
}
export interface PolicyOverrides {
  [key: string]: unknown;
}
export interface UserPrefs {
  [key: string]: unknown;
}

export interface CascadeContext {
  user: UserPrefs;
  persona: PersonaDefaults;
  role: RoleDefaults;
  policy: PolicyOverrides;
}

// ── resolvePref (pure) ─────────────────────────────────────────────────────

export interface ResolvedPref<T> {
  value: T;
  /** Which layer supplied the value. */
  source: "policy" | "user" | "persona" | "role" | "system";
  /** The key's rank — "required" values cannot be user-overridden. */
  rank: "required" | "recommended" | "cosmetic";
  /** The user's stored value, even when policy overrode it (audit). */
  userValue: unknown;
}

/**
 * Resolve a single preference key through the 4-layer cascade.
 *
 * @param key      A registered preference key.
 * @param ctx      The four layers, bottom-to-top.
 * @returns        The effective value + which layer won + the rank.
 */
export function resolvePref<T>(key: string, ctx: CascadeContext): ResolvedPref<T> {
  const def = getPrefDef(key);
  const rank = def?.rank ?? "cosmetic";

  // Unknown key: fall back to the system default (or undefined). No layer
  // applies. This is the drift guard — a key not in the registry is never
  // honored from user/persona/role layers.
  if (!def) {
    return { value: undefined as T, source: "system", rank, userValue: ctx.user[key] };
  }

  // System default is the floor.
  let value: unknown = def.default;
  let source: ResolvedPref<T>["source"] = "system";

  if (key in ctx.role) { value = ctx.role[key]; source = "role"; }
  if (key in ctx.persona) { value = ctx.persona[key]; source = "persona"; }
  if (key in ctx.user) { value = ctx.user[key]; source = "user"; }

  // Layer 0: policy. A "required" rank means the policy value (or the
  // system default when policy is silent) beats the user's stored value.
  // The user's value is still returned in `userValue` for audit, but the
  // effective value is the policy/default.
  if (rank === "required") {
    const policyValue = key in ctx.policy ? ctx.policy[key] : def.default;
    return { value: policyValue as T, source: "policy", rank, userValue: ctx.user[key] };
  }

  if (key in ctx.policy) {
    value = ctx.policy[key];
    source = "policy";
  }

  return { value: value as T, source, rank, userValue: ctx.user[key] };
}

/**
 * Resolve every registered key at once (for a settings screen).
 */
export function resolveAll(ctx: CascadeContext): Array<ResolvedPref<unknown>> {
  return PREF_REGISTRY.map((k: PrefKeyDef) => resolvePref(k.key, ctx));
}

// ── Persona / role default bundles (the "same role, different taste") ─────

/**
 * The two student personas get opposite defaults for the SAME role.
 * A day scholar who becomes a hosteller inherits the hosteller defaults
 * for keys they haven't personally overridden — their custom theme +
 * language survive because those live in the user layer, above persona.
 */
export const PERSONA_DEFAULTS: Record<Persona, PersonaDefaults> = {
  day_scholar: {
    "nav.landingTab": "home",
    "dashboard.widgetOrder": ["goals", "feed", "events", "recap", "notifications"],
    "quick_actions.selected": ["request_early_leave", "view_records", "raise_issue", "mess_menu"],
    "notifications.curfew_approaching": { channels: ["in_app"], timing: "off" },
    "notifications.weekly_digest": { channels: ["email"], day: "friday", time: "18:00" },
    "privacy.parentVisibility": ["attendance"],
    "goals.attendanceTarget": 0.9,
    "pass.defaultType": "early_leave",
  },
  hosteller: {
    "nav.landingTab": "home",
    "dashboard.widgetOrder": ["notifications", "goals", "events", "recap", "feed"],
    "quick_actions.selected": ["request_outpass", "curfew_status", "mess_menu", "raise_issue"],
    "notifications.curfew_approaching": { channels: ["in_app", "push", "sms"], timing: "T-60m,T-30m" },
    "notifications.weekly_digest": { channels: ["email"], day: "sunday", time: "18:00" },
    "privacy.parentVisibility": ["passes", "curfew", "meals", "complaints"],
    "goals.attendanceTarget": 0.9,
    "pass.defaultType": "outpass_home",
  },
  both: {},
};

/** Role defaults: the config bundle per role. No role-specific pref code
 *  lives in the shell — it lives here, read via useEffectivePref. */
export const ROLE_DEFAULTS: Record<string, RoleDefaults> = {
  student: {},
  warden: { "appearance.density": "compact", "notifications.curfew_breach": { channels: ["in_app", "sms"], timing: "immediate" } },
  hostel_manager: { "appearance.density": "compact" },
  operator: { "appearance.density": "spacious", "appearance.fontSize": "lg" },
  sysadmin: { "appearance.density": "compact", "a11y.keyboardShortcuts": true },
  mess_incharge: { "dashboard.defaultPeriod": "week" },
  principal: { "dashboard.defaultPeriod": "month" },
};

/** Policy overrides: the "required" safety rail. A value here beats a
 *  user's stored value for any "required"-rank key. */
export const POLICY_DEFAULTS: PolicyOverrides = {
  "notifications.curfew_breach": { channels: ["in_app", "push", "sms", "parent"], timing: "immediate" },
  "notifications.parent_consent": { channels: ["in_app", "sms"], timing: "immediate" },
  "notifications.emergency_broadcast": { channels: ["in_app", "push", "sms"], timing: "immediate" },
};

export default resolvePref;
