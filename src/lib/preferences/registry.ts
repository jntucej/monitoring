/**
 * lib/preferences/registry.ts — the single source of truth for every
 * preference key, its rank, and who can see it.
 *
 * This is Tier 0 (kernel) — it never forks. No preference key exists outside
 * this registry; the resolver (resolve.ts) only accepts keys declared here,
 * and the API rejects unknown keys. That's the guardrail against drift.
 *
 * Rank is the safety rail:
 *   "required"     — policy value wins; user choice is stored but NOT applied.
 *                    UI shows a lock. A shell CANNOT promote a key to required
 *                    (ranks live only here, reviewed by policy owners).
 *   "recommended"  — user value wins, but a soft warning shows.
 *   "cosmetic"     — fully the user's choice.
 *
 * The rule: "You can hide decoration. You cannot hide compliance."
 */

export type PrefRank = "required" | "recommended" | "cosmetic";

export type PrefCategory =
  | "appearance"
  | "language_format"
  | "navigation"
  | "dashboard"
  | "notifications"
  | "quick_actions"
  | "lists_filters"
  | "privacy_share"
  | "accessibility"
  | "personal_goals";

export type Role =
  | "student" | "parent" | "guardian" | "faculty"
  | "warden" | "hostel_manager" | "deputy_warden" | "caretaker"
  | "mess_incharge" | "operator" | "principal" | "vice_principal"
  | "admin" | "sysadmin" | "oie" | "exam_branch" | "exam_superintendent";

export type Persona = "day_scholar" | "hosteller" | "both";

export interface PrefKeyDef {
  /** Stable key, e.g. "notifications.curfew_breach". */
  key: string;
  /** The 10-category grouping. */
  category: PrefCategory;
  /** Safety rank. "required" keys cannot be user-overridden. */
  rank: PrefRank;
  /** Which roles can see/modify this key (empty = everyone). */
  roles: Role[];
  /** Which personas get a distinct default (day_scholar vs hosteller). */
  personaScoped?: Persona[];
  /** The system default (bottom of the cascade). */
  default: unknown;
  /** Human label for the UI. */
  label: string;
  /** Which roles see it. Empty = all. */
  /** Short blurb. */
  hint?: string;
}

// ── The registry ────────────────────────────────────────────────────────────
// ~60 keys across 10 categories. Ranks + visibility are declared HERE, never
// in a shell. A new preference = add a row here, not a file in a role.

export const PREF_REGISTRY: PrefKeyDef[] = [
  // 1. APPEARANCE
  { key: "appearance.theme", category: "appearance", rank: "cosmetic", roles: [], default: "graphite", label: "Theme", hint: "graphite | sakuga" },
  { key: "appearance.density", category: "appearance", rank: "cosmetic", roles: [], default: "comfortable", label: "Density", hint: "compact | comfortable | spacious" },
  { key: "appearance.fontSize", category: "appearance", rank: "cosmetic", roles: [], default: "md", label: "Font size" },
  { key: "appearance.accent", category: "appearance", rank: "cosmetic", roles: [], default: "default", label: "Accent color" },
  { key: "appearance.glass", category: "appearance", rank: "cosmetic", roles: [], default: true, label: "Glass effect" },
  { key: "appearance.motion", category: "appearance", rank: "cosmetic", roles: [], default: true, label: "Motion / VFX" },

  // 2. LANGUAGE & FORMAT
  { key: "language.ui", category: "language_format", rank: "cosmetic", roles: [], default: "en", label: "UI language" },
  { key: "language.sms", category: "language_format", rank: "cosmetic", roles: ["student", "parent", "guardian"], default: "en", label: "SMS language", hint: "per-channel: UI can differ from SMS" },
  { key: "format.date", category: "language_format", rank: "cosmetic", roles: [], default: "dd MMM yyyy", label: "Date format" },
  { key: "format.time", category: "language_format", rank: "cosmetic", roles: [], default: "24h", label: "Time format", hint: "12h | 24h" },
  { key: "format.firstDayOfWeek", category: "language_format", rank: "cosmetic", roles: [], default: "monday", label: "First day of week" },

  // 3. NAVIGATION
  { key: "nav.sidebarCollapsed", category: "navigation", rank: "cosmetic", roles: [], default: false, label: "Collapse sidebar" },
  { key: "nav.landingTab", category: "navigation", rank: "cosmetic", roles: ["student", "parent", "guardian"], default: "home", label: "Default landing tab", personaScoped: ["day_scholar", "hosteller"] },
  { key: "nav.mobileBottomBar", category: "navigation", rank: "cosmetic", roles: [], default: [], label: "Mobile bottom bar items" },

  // 4. DASHBOARD
  { key: "dashboard.widgetOrder", category: "dashboard", rank: "cosmetic", roles: [], default: [], label: "Widget order", hint: "array of widget ids" },
  { key: "dashboard.widgetVisibility", category: "dashboard", rank: "cosmetic", roles: [], default: {}, label: "Widget visibility", hint: "id → bool" },
  { key: "dashboard.defaultPeriod", category: "dashboard", rank: "cosmetic", roles: [], default: "week", label: "Default period", hint: "today | week | month" },

  // 5. NOTIFICATIONS (the compliance-critical category)
  { key: "notifications.class_reminder", category: "notifications", rank: "recommended", roles: ["student", "faculty"], default: { channels: ["in_app", "push"], timing: "T-15m" }, label: "Class-in-15-min reminder" },
  { key: "notifications.absent_marked", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Marked-absent alert" },
  { key: "notifications.meal_cutoff", category: "notifications", rank: "recommended", roles: ["student"], default: { channels: ["in_app", "push"], timing: "T-30m" }, label: "Meal cutoff", hint: "T-30m | T-60m | off" },
  { key: "notifications.outpass_approved", category: "notifications", rank: "recommended", roles: ["student"], default: { channels: ["in_app", "sms"], timing: "immediate" }, label: "Outpass approved" },
  { key: "notifications.outpass_expiring", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app", "sms"], timing: "T-30m" }, label: "Outpass expiring" },
  { key: "notifications.curfew_approaching", category: "notifications", rank: "recommended", roles: ["student", "guardian"], default: { channels: ["in_app", "push", "sms"], timing: "T-60m,T-30m" }, label: "Curfew approaching", hint: "timing mutable, channel fixed" },
  { key: "notifications.curfew_breach", category: "notifications", rank: "required", roles: ["student", "guardian", "warden", "hostel_manager", "deputy_warden"], default: { channels: ["in_app", "push", "sms", "parent"], timing: "immediate" }, label: "Curfew breach", hint: "🔒 set by institute — cannot be silenced" },
  { key: "notifications.complaint_resolved", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Complaint resolved" },
  { key: "notifications.event_rsvp", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Event RSVP" },
  { key: "notifications.weekly_digest", category: "notifications", rank: "cosmetic", roles: ["student", "guardian", "parent"], default: { channels: ["email"], day: "friday", time: "18:00" }, label: "Weekly digest", personaScoped: ["day_scholar", "hosteller"] },
  { key: "notifications.parent_consent", category: "notifications", rank: "required", roles: ["student", "guardian", "parent"], default: { channels: ["in_app", "sms"], timing: "immediate" }, label: "Parent consent request", hint: "🔒 required" },
  { key: "notifications.emergency_broadcast", category: "notifications", rank: "required", roles: [], default: { channels: ["in_app", "push", "sms"], timing: "immediate" }, label: "Emergency broadcast", hint: "🔒 required" },
  { key: "notifications.quietHours", category: "notifications", rank: "recommended", roles: [], default: { start: "22:00", end: "06:00" }, label: "Quiet hours", hint: "curfew/emergency/consent bypass" },

  // 6. QUICK ACTIONS
  { key: "quick_actions.selected", category: "quick_actions", rank: "cosmetic", roles: [], default: [], label: "Quick actions", hint: "4–6 from the role's offered set" },
  { key: "quick_actions.order", category: "quick_actions", rank: "cosmetic", roles: [], default: [], label: "Quick action order" },

  // 7. LISTS & FILTERS
  { key: "lists.pageSize", category: "lists_filters", rank: "cosmetic", roles: [], default: 20, label: "Page size" },
  { key: "lists.defaultSort", category: "lists_filters", rank: "cosmetic", roles: [], default: "newest", label: "Default sort" },
  { key: "lists.savedViews", category: "lists_filters", rank: "cosmetic", roles: [], default: [], label: "Saved views", hint: "named filter sets per list page" },
  { key: "lists.visibleColumns", category: "lists_filters", rank: "cosmetic", roles: [], default: [], label: "Visible columns" },

  // 8. PRIVACY & SHARE
  { key: "privacy.parentVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: ["attendance", "passes", "complaints"], label: "What parent sees", personaScoped: ["day_scholar", "hosteller"] },
  { key: "privacy.peerVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: [], label: "What peers see" },
  { key: "privacy.facultyVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: [], label: "What faculty see" },

  // 9. ACCESSIBILITY
  { key: "a11y.reduceMotion", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "Reduce motion" },
  { key: "a11y.highContrast", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "High contrast" },
  { key: "a11y.largeText", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "Large text" },
  { key: "a11y.keyboardShortcuts", category: "accessibility", rank: "cosmetic", roles: [], default: true, label: "Keyboard shortcuts" },

  // 10. PERSONAL GOALS (student-only depth)
  { key: "goals.attendanceTarget", category: "personal_goals", rank: "cosmetic", roles: ["student"], default: 0.9, label: "Attendance target" },
  { key: "goals.mealsPerWeek", category: "personal_goals", rank: "cosmetic", roles: ["student"], default: 15, label: "Meals/week goal" },
  { key: "goals.sleepSchedule", category: "personal_goals", rank: "recommended", roles: ["student"], default: { bed: "23:00", wake: "07:00" }, label: "Sleep schedule", hint: "drives quiet hours" },

  // Pass-creation taste (student depth)
  { key: "pass.defaultType", category: "dashboard", rank: "cosmetic", roles: ["student"], default: null, label: "Default pass type", personaScoped: ["day_scholar", "hosteller"] },
  { key: "pass.rememberDestination", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: true, label: "Remember last destination" },
  { key: "pass.rememberDuration", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: true, label: "Remember last duration" },
];

// ── Index + lookup ──────────────────────────────────────────────────────────

const REGISTRY_MAP: Record<string, PrefKeyDef> = Object.fromEntries(
  PREF_REGISTRY.map((k) => [k.key, k]),
);

/** Look up a key's definition. Undefined if the key is not in the registry. */
export function getPrefDef(key: string): PrefKeyDef | undefined {
  return REGISTRY_MAP[key];
}

/** True when the key is declared in the registry (the API uses this to reject unknown keys). */
export function isKnownPrefKey(key: string): boolean {
  return key in REGISTRY_MAP;
}

/** The rank for a key — "required" keys are the compliance safety rail. */
export function prefRank(key: string): PrefRank {
  return REGISTRY_MAP[key]?.rank ?? "cosmetic";
}

/** All keys, optionally filtered by category / role / persona. */
export function prefsFor(opts?: { category?: PrefCategory; role?: Role; persona?: Persona }): PrefKeyDef[] {
  return PREF_REGISTRY.filter((k) => {
    if (opts?.category && k.category !== opts.category) return false;
    if (opts?.role && k.roles.length > 0 && !k.roles.includes(opts.role)) return false;
    return true;
  });
}

export default PREF_REGISTRY;
