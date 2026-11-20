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
  /** Short blurb. */
  hint?: string;
  /**
   * Trait-scope guardrail: only these traits may override this key.
   * Empty = no trait may influence it (the key is trait-immune). This is
   * how "medical_chronic accidentally hides curfew alerts" is impossible —
   * a trait only owns what the registry says it owns. The conformance test
   * enforces: a trait_overrides row must reference a key whose scopedBy
   * includes that trait, else it fails.
   */
  scopedBy?: string[];
}

// ── The registry ────────────────────────────────────────────────────────────
// ~60 keys across 10 categories. Ranks + visibility are declared HERE, never
// in a shell. A new preference = add a row here, not a file in a role.

export const PREF_REGISTRY: PrefKeyDef[] = [
  // 1. APPEARANCE
    { key: "appearance.theme", category: "appearance", rank: "cosmetic", roles: [], default: "graphite", label: "Theme", hint: "graphite | sakuga" , scopedBy: ["shift_night"]},
    { key: "appearance.density", category: "appearance", rank: "cosmetic", roles: [], default: "comfortable", label: "Density", hint: "compact | comfortable | spacious" , scopedBy: ["faculty_senior", "role_veteran"]},
    { key: "appearance.fontSize", category: "appearance", rank: "cosmetic", roles: [], default: "md", label: "Font size" , scopedBy: ["tech_novice"]},
  { key: "appearance.accent", category: "appearance", rank: "cosmetic", roles: [], default: "default", label: "Accent color" },
  { key: "appearance.glass", category: "appearance", rank: "cosmetic", roles: [], default: true, label: "Glass effect" },
  { key: "appearance.motion", category: "appearance", rank: "cosmetic", roles: [], default: true, label: "Motion / VFX" },

  // 2. LANGUAGE & FORMAT
    { key: "language.ui", category: "language_format", rank: "cosmetic", roles: [], default: "en", label: "UI language" , scopedBy: ["language_hi", "language_regional"]},
    { key: "language.sms", category: "language_format", rank: "cosmetic", roles: ["student", "parent", "guardian"], default: "en", label: "SMS language", hint: "per-channel: UI can differ from SMS" , scopedBy: ["language_hi", "language_regional", "parent_language_hi"]},
  { key: "format.date", category: "language_format", rank: "cosmetic", roles: [], default: "dd MMM yyyy", label: "Date format" },
    { key: "format.time", category: "language_format", rank: "cosmetic", roles: [], default: "24h", label: "Time format", hint: "12h | 24h" , scopedBy: ["faculty_shift_evening", "faculty_shift_morning", "on_call", "parent_working"]},
    { key: "format.firstDayOfWeek", category: "language_format", rank: "cosmetic", roles: [], default: "monday", label: "First day of week" , scopedBy: ["parent_distant"]},

  // 3. NAVIGATION
  { key: "nav.sidebarCollapsed", category: "navigation", rank: "cosmetic", roles: [], default: false, label: "Collapse sidebar" },
    { key: "nav.landingTab", category: "navigation", rank: "cosmetic", roles: ["student", "parent", "guardian"], default: "home", label: "Default landing tab", personaScoped: ["day_scholar", "hosteller"] , scopedBy: ["shift_evening", "shift_morning", "shift_night"]},
  { key: "nav.mobileBottomBar", category: "navigation", rank: "cosmetic", roles: [], default: [], label: "Mobile bottom bar items" },

  // 4. DASHBOARD
    { key: "dashboard.widgetOrder", category: "dashboard", rank: "cosmetic", roles: [], default: [], label: "Widget order", hint: "array of widget ids" , scopedBy: ["oversight_analytics", "year_1"]},
  { key: "dashboard.widgetVisibility", category: "dashboard", rank: "cosmetic", roles: [], default: {}, label: "Widget visibility", hint: "id → bool" },
    { key: "dashboard.defaultPeriod", category: "dashboard", rank: "cosmetic", roles: [], default: "week", label: "Default period", hint: "today | week | month" , scopedBy: ["faculty_hod", "medical_acute", "oversight_compliance", "shift_evening", "shift_morning"]},

  // 5. NOTIFICATIONS (the compliance-critical category)
  { key: "notifications.class_reminder", category: "notifications", rank: "recommended", roles: ["student", "faculty"], default: { channels: ["in_app", "push"], timing: "T-15m" }, label: "Class-in-15-min reminder" },
  { key: "notifications.absent_marked", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Marked-absent alert" },
  { key: "notifications.meal_cutoff", category: "notifications", rank: "recommended", roles: ["student"], default: { channels: ["in_app", "push"], timing: "T-30m" }, label: "Meal cutoff", hint: "T-30m | T-60m | off" },
  { key: "notifications.outpass_approved", category: "notifications", rank: "recommended", roles: ["student"], default: { channels: ["in_app", "sms"], timing: "immediate" }, label: "Outpass approved" },
  { key: "notifications.outpass_expiring", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app", "sms"], timing: "T-30m" }, label: "Outpass expiring" },
    { key: "notifications.curfew_approaching", category: "notifications", rank: "recommended", roles: ["student", "guardian"], default: { channels: ["in_app", "push", "sms"], timing: "T-60m,T-30m" }, label: "Curfew approaching", hint: "timing mutable, channel fixed" , scopedBy: ["local"]},
  { key: "notifications.curfew_breach", category: "notifications", rank: "required", roles: ["student", "guardian", "warden", "hostel_manager", "deputy_warden"], default: { channels: ["in_app", "push", "sms", "parent"], timing: "immediate" }, label: "Curfew breach", hint: "🔒 set by institute — cannot be silenced" },
  { key: "notifications.complaint_resolved", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Complaint resolved" },
    { key: "notifications.event_rsvp", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "immediate" }, label: "Event RSVP" , scopedBy: ["placement_active"]},
    { key: "notifications.weekly_digest", category: "notifications", rank: "cosmetic", roles: ["student", "guardian", "parent"], default: { channels: ["email"], day: "friday", time: "18:00" }, label: "Weekly digest", personaScoped: ["day_scholar", "hosteller"] , scopedBy: ["distant", "parent_distant", "parent_working", "year_1"]},
  { key: "notifications.parent_consent", category: "notifications", rank: "required", roles: ["student", "guardian", "parent"], default: { channels: ["in_app", "sms"], timing: "immediate" }, label: "Parent consent request", hint: "🔒 required" },
  { key: "notifications.emergency_broadcast", category: "notifications", rank: "required", roles: [], default: { channels: ["in_app", "push", "sms"], timing: "immediate" }, label: "Emergency broadcast", hint: "🔒 required" },
    { key: "notifications.quietHours", category: "notifications", rank: "recommended", roles: [], default: { start: "22:00", end: "06:00" }, label: "Quiet hours", hint: "curfew/emergency/consent bypass" , scopedBy: ["on_call", "shift_evening", "shift_morning", "shift_night"]},
  { key: "notifications.health_med_reminder", category: "notifications", rank: "required", roles: ["student"], default: { channels: ["in_app", "push"], timing: "immediate", bypassQuietHours: true }, label: "Meds/health reminder", hint: "🔒 bypasses quiet hours — nobody can hide", scopedBy: [] },
  { key: "notifications.home_travel", category: "notifications", rank: "cosmetic", roles: ["student"], default: { channels: ["in_app"], timing: "fri" }, label: "Home travel reminder", scopedBy: ["distant", "monsoon"] },
  { key: "notifications.reduce_non_critical", category: "notifications", rank: "cosmetic", roles: [], default: false, label: "Mute non-critical notifications", scopedBy: ["child_in_exam_week", "exam_week", "medical_acute", "tech_novice"] },

  // 6. QUICK ACTIONS
    { key: "quick_actions.selected", category: "quick_actions", rank: "cosmetic", roles: [], default: [], label: "Quick actions", hint: "4–6 from the role's offered set" , scopedBy: ["local", "parent_multiple_children", "year_1", "year_4"]},
  { key: "quick_actions.order", category: "quick_actions", rank: "cosmetic", roles: [], default: [], label: "Quick action order" },

  // 7. LISTS & FILTERS
  { key: "lists.pageSize", category: "lists_filters", rank: "cosmetic", roles: [], default: 20, label: "Page size" },
    { key: "lists.defaultSort", category: "lists_filters", rank: "cosmetic", roles: [], default: "newest", label: "Default sort" , scopedBy: ["block_specific", "faculty_hod"]},
  { key: "lists.savedViews", category: "lists_filters", rank: "cosmetic", roles: [], default: [], label: "Saved views", hint: "named filter sets per list page" },
  { key: "lists.visibleColumns", category: "lists_filters", rank: "cosmetic", roles: [], default: [], label: "Visible columns" },

  // 8. PRIVACY & SHARE
    { key: "privacy.parentVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: ["attendance", "passes", "complaints"], label: "What parent sees", personaScoped: ["day_scholar", "hosteller"] , scopedBy: ["distant"]},
  { key: "privacy.peerVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: [], label: "What peers see" },
  { key: "privacy.facultyVisibility", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: [], label: "What faculty see" },

  // 9. ACCESSIBILITY
  { key: "a11y.reduceMotion", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "Reduce motion" },
  { key: "a11y.highContrast", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "High contrast" },
  { key: "a11y.largeText", category: "accessibility", rank: "cosmetic", roles: [], default: false, label: "Large text" },
  { key: "a11y.keyboardShortcuts", category: "accessibility", rank: "cosmetic", roles: [], default: true, label: "Keyboard shortcuts" },

  // 10. PERSONAL GOALS (student-only depth)
  { key: "goals.attendanceTarget", category: "personal_goals", rank: "cosmetic", roles: ["student"], default: 0.9, label: "Attendance target" },
    { key: "goals.mealsPerWeek", category: "personal_goals", rank: "cosmetic", roles: ["student"], default: 15, label: "Meals/week goal" , scopedBy: ["scholarship"]},
    { key: "goals.sleepSchedule", category: "personal_goals", rank: "recommended", roles: ["student"], default: { bed: "23:00", wake: "07:00" }, label: "Sleep schedule", hint: "drives quiet hours" , scopedBy: ["exam_week"]},

  // Pass-creation taste (student depth)
        { key: "pass.defaultType", category: "dashboard", rank: "cosmetic", roles: ["student"], default: null, label: "Default pass type", personaScoped: ["day_scholar", "hosteller"] , scopedBy: ["distant", "local", "placement_active", "sports_athlete"]},
  { key: "pass.rememberDestination", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: true, label: "Remember last destination" },
  { key: "pass.rememberDuration", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: true, label: "Remember last duration" },
  { key: "pass.template", category: "dashboard", rank: "cosmetic", roles: ["student"], default: null, label: "Pass template", scopedBy: ["distant", "local", "placement_active", "sports_athlete"] },
  { key: "pass.autoRouteCC", category: "dashboard", rank: "cosmetic", roles: ["student"], default: [], label: "Auto-CC roles on pass", scopedBy: ["exam_week"] },

  // Onboarding / hints (trait-reachable)
  { key: "onboarding.tour.show", category: "navigation", rank: "cosmetic", roles: [], default: "once", label: "Onboarding tour", hint: "once | every_session | off", scopedBy: ["faculty_new", "role_new", "semester_start", "year_1", "year_4"] },
  { key: "onboarding.hints.show", category: "navigation", rank: "cosmetic", roles: [], default: true, label: "Contextual hints", scopedBy: ["faculty_new", "faculty_senior", "role_new", "role_veteran", "semester_start", "tech_novice", "year_1", "year_4"] },

  // Meals (trait-reachable)
    { key: "meals.showAllergens", category: "dashboard", rank: "recommended", roles: ["student"], default: false, label: "Show allergens on meal widget" , scopedBy: ["medical_chronic"]},
    { key: "meals.dietary", category: "dashboard", rank: "cosmetic", roles: ["student"], default: null, label: "Dietary preference", hint: "veg | non_veg | optional" , scopedBy: ["medical_chronic"]},
    { key: "meals.skipOnSick", category: "dashboard", rank: "cosmetic", roles: ["student"], default: false, label: "Auto-skip meals (sick mode)" , scopedBy: ["medical_acute"]},
    { key: "meals.preWorkoutAlert", category: "dashboard", rank: "cosmetic", roles: ["student"], default: false, label: "Pre-workout meal alert" , scopedBy: ["sports_athlete"]},

  // Attendance (trait-reachable)
    { key: "attendance.disputeWindowHours", category: "lists_filters", rank: "recommended", roles: ["student"], default: 168, label: "Dispute window", hint: "default 7 days" , scopedBy: ["exam_week", "monsoon"]},
    { key: "attendance.lateGraceMinutes", category: "lists_filters", rank: "recommended", roles: ["student"], default: 10, label: "Late-arrival grace" , scopedBy: ["monsoon"]},
    { key: "attendance.exemptionFlow", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: "none", label: "Attendance exemption flow" , scopedBy: ["placement_active", "sports_athlete"]},

  // Curfew / schedule (trait-reachable)
    { key: "curfew.liftForStudy", category: "navigation", rank: "recommended", roles: ["student"], default: false, label: "Lift curfew for study" , scopedBy: ["exam_week"]},
    { key: "curfew.extendForPractice", category: "navigation", rank: "recommended", roles: ["student"], default: false, label: "Extend curfew for practice" , scopedBy: ["sports_athlete"]},
    { key: "curfew.extendForPlacement", category: "navigation", rank: "recommended", roles: ["student"], default: false, label: "Extend curfew for placement" , scopedBy: ["placement_active"]},

  // Language (trait-reachable)
    { key: "language.digest", category: "language_format", rank: "cosmetic", roles: [], default: "en", label: "Digest language" , scopedBy: ["language_hi", "language_regional", "parent_language_hi"]},

  // Reports / compliance (trait-reachable)
    { key: "reports.monthlyCompliance", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: false, label: "Monthly compliance PDF" , scopedBy: ["scholarship"]},
    { key: "reports.digestCC", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: null, label: "Digest CC (sponsor)" , scopedBy: ["scholarship"]},
    { key: "reports.attendanceFormat", category: "lists_filters", rank: "cosmetic", roles: ["student"], default: "summary", label: "Attendance report format" , scopedBy: ["oversight_compliance", "scholarship"]},

  // UI / accessibility (trait-reachable)
    { key: "ui.motion", category: "accessibility", rank: "cosmetic", roles: [], default: "full", label: "Motion level", hint: "full | reduced" , scopedBy: ["tech_novice"]},
    { key: "ui.menuDepth", category: "navigation", rank: "cosmetic", roles: [], default: 12, label: "Menu depth", hint: "5 | 12 items" , scopedBy: ["faculty_new", "tech_novice", "year_1"]},
    { key: "ui.minimal", category: "appearance", rank: "cosmetic", roles: [], default: false, label: "Minimal UI (on-call mode)" , scopedBy: ["on_call"]},

  // Dashboard scope (trait-reachable)
    { key: "dashboard.scope", category: "dashboard", rank: "cosmetic", roles: [], default: "all", label: "Dashboard scope", hint: "all | block" , scopedBy: ["block_specific"]},
    { key: "dashboard.firstWidget", category: "dashboard", rank: "cosmetic", roles: [], default: null, label: "First widget" , scopedBy: ["exam_week", "faculty_hod", "faculty_shift_evening", "faculty_shift_morning", "medical_chronic", "oversight_analytics", "oversight_compliance", "placement_active", "semester_start", "sports_athlete"]},
    { key: "dashboard.transitionCard", category: "dashboard", rank: "cosmetic", roles: ["student"], default: false, label: "Transition card (placement/alumni)" , scopedBy: ["placement_active", "year_4"]},
    { key: "dashboard.showStudyTracker", category: "dashboard", rank: "cosmetic", roles: ["student"], default: false, label: "Study tracker widget" , scopedBy: ["exam_week"]},
    { key: "dashboard.showComplianceStatus", category: "dashboard", rank: "cosmetic", roles: ["student"], default: false, label: "Compliance status widget" , scopedBy: ["scholarship"]},

  // Health / emergency (trait-reachable)
    { key: "emergency.contactOrder", category: "privacy_share", rank: "recommended", roles: ["student", "guardian"], default: ["parent"], label: "Emergency contact order" , scopedBy: ["medical_chronic"]},
    { key: "profile.transitionCard", category: "privacy_share", rank: "cosmetic", roles: ["student"], default: false, label: "Profile transition card" , scopedBy: ["year_4"]},

  // Parent / guardian (trait-reachable)
    { key: "parent.consentMode", category: "privacy_share", rank: "cosmetic", roles: ["parent", "guardian"], default: "in_app", label: "Outpass consent mode" , scopedBy: ["parent_working"]},
    { key: "parent.layout", category: "navigation", rank: "cosmetic", roles: ["parent", "guardian"], default: "single_child", label: "Parent home layout" , scopedBy: ["parent_multiple_children"]},
    { key: "parent.childSafetyPriority", category: "notifications", rank: "recommended", roles: ["parent", "guardian"], default: "normal", label: "Child-safety priority" , scopedBy: ["parent_distant"]},
    { key: "parent.digestGrouping", category: "notifications", rank: "cosmetic", roles: ["parent", "guardian"], default: "per_child", label: "Digest grouping" , scopedBy: ["parent_multiple_children"]},
    { key: "parent.digestSuppress", category: "notifications", rank: "cosmetic", roles: ["parent", "guardian"], default: [], label: "Digest suppress (non-critical)" , scopedBy: ["child_in_exam_week", "exam_week"]},
    { key: "parent.notificationPriority", category: "notifications", rank: "cosmetic", roles: ["parent", "guardian"], default: [], label: "Notification priority" , scopedBy: ["child_in_exam_week", "exam_week"]},

  // Faculty / operational (trait-reachable)
    { key: "faculty.classReminderShift", category: "notifications", rank: "cosmetic", roles: ["faculty"], default: "auto", label: "Class reminder timing" , scopedBy: ["faculty_shift_evening", "faculty_shift_morning"]},
    { key: "operational.queueFilter", category: "lists_filters", rank: "cosmetic", roles: ["warden", "hostel_manager", "caretaker"], default: "all", label: "Queue filter (block)" , scopedBy: ["block_specific"]},
    { key: "operational.showHelpTooltips", category: "navigation", rank: "cosmetic", roles: [], default: true, label: "Help tooltips" , scopedBy: ["role_new"]},
    { key: "operational.analyticsAdvanced", category: "dashboard", rank: "cosmetic", roles: ["warden", "hostel_manager"], default: false, label: "Advanced analytics" , scopedBy: ["oversight_analytics", "role_veteran"]},
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