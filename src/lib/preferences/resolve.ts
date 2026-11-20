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
import type { ActiveTrait } from "@/lib/traits/types";

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
  /** Active traits, sorted by priority (highest first). The resolver
   *  consults these between the user and persona layers. */
  traits?: ActiveTrait[];
  persona: PersonaDefaults;
  role: RoleDefaults;
  policy: PolicyOverrides;
}

// ── resolvePref (pure) ─────────────────────────────────────────────────────

export interface ResolvedPref<T> {
  value: T;
  /** Which layer supplied the value. */
  source: "policy" | "user" | "trait" | "persona" | "role" | "system";
  /** The trait id when the trait layer won. */
  traitId?: string;
  /** The key's rank — "required" values cannot be user-overridden. */
  rank: "required" | "recommended" | "cosmetic";
  /** The user's stored value, even when policy overrode it (audit). */
  userValue: unknown;
}

/**
 * Resolve a single preference key through the 5-layer cascade:
 *   policy > user > trait > persona > role > system
 *
 * The trait layer consults each active trait's scoped overrides, in
 * priority order. A trait only influences a key when the registry's
 * `scopedBy` for that key includes the trait's id — that's the guardrail.
 */
export function resolvePref<T>(key: string, ctx: CascadeContext): ResolvedPref<T> {
  const def = getPrefDef(key);
  const rank = def?.rank ?? "cosmetic";

  // Unknown key: fall back to the system default. No layer applies — the
  // drift guard. A key not in the registry is never honored from any layer.
  if (!def) {
    return { value: undefined as T, source: "system", rank, userValue: ctx.user[key] };
  }

  // Layer 0: policy. A "required" rank means the policy value (or the
  // system default when policy is silent) beats everything below it,
  // including traits and the user's stored value.
  if (rank === "required") {
    const policyValue = key in ctx.policy ? ctx.policy[key] : def.default;
    return { value: policyValue as T, source: "policy", rank, userValue: ctx.user[key] };
  }

  // Layer 3: user taste.
  if (key in ctx.user) {
    return { value: ctx.user[key] as T, source: "user", rank, userValue: ctx.user[key] };
  }

  // Trait layer: walk active traits in priority order; the first one that
  // owns this key (per the registry's scopedBy) and has a value wins.
  if (ctx.traits && ctx.traits.length > 0) {
    const scoped = def.scopedBy ?? [];
    for (const trait of ctx.traits) {
      if (scoped.length > 0 && !scoped.includes(trait.id)) continue; // not this trait's key
      if (key in trait.overrides) {
        return { value: trait.overrides[key] as T, source: "trait", traitId: trait.id, rank, userValue: ctx.user[key] };
      }
    }
  }

  // Non-required policy override: an admin-set value beats persona/role/system
  // but not user taste or the trait layer (user's choice wins for non-required).
  if (key in ctx.policy) {
    return { value: ctx.policy[key] as T, source: "policy", rank, userValue: ctx.user[key] };
  }

  // Layer 2: persona / role / system defaults.
  let value: unknown = key in ctx.persona ? ctx.persona[key] : key in ctx.role ? ctx.role[key] : def.default;
  let source: ResolvedPref<T>["source"] =
    key in ctx.persona ? "persona" : key in ctx.role ? "role" : "system";

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
    "dashboard.widgetOrder": ["my-day-strip", "today-status", "context", "quick-links", "my-stats", "guardian-call", "campus-pulse"],
    "dashboard.firstWidget": "my-day-strip",
    "dashboard.engagementWidgetOrder": ["goals", "feed", "events", "recap", "notifications"],
    "quick_actions.selected": ["requests", "attendance", "mess", "campus"],
    "notifications.curfew_approaching": { channels: ["in_app"], timing: "off" },
    "notifications.weekly_digest": { channels: ["email"], day: "friday", time: "18:00" },
    "privacy.parentVisibility": ["attendance"],
    "goals.attendanceTarget": 0.9,
    "pass.defaultType": "early_leave",
  },
  hosteller: {
    "nav.landingTab": "home",
    "dashboard.widgetOrder": ["my-day-strip", "active-pass", "context", "quick-links", "my-stats", "guardian-call", "campus-pulse"],
    "dashboard.firstWidget": "active-pass",
    "dashboard.engagementWidgetOrder": ["notifications", "goals", "events", "recap", "feed"],
    "quick_actions.selected": ["passes", "requests", "mess", "campus"],
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
