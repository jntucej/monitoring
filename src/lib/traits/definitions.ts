/**
 * lib/traits/definitions.ts — the trait seed (~20 traits).
 *
 * Each trait owns a SMALL slice of keys (3–8). The overrides here must only
 * reference keys whose registry `scopedBy` includes this trait's id — the
 * conformance test enforces that. Temporal traits (exam_week, monsoon,
 * on_call, semester_start) get a priority boost so they win conflicts.
 *
 * A Year-1 distant diabetic hosteller during exam week: year_1 + distant +
 * medical_chronic + exam_week are all active. They don't conflict because
 * they own disjoint scopes; where they do overlap, the temporal exam_week
 * wins (higher priority).
 */

import type { TraitDef } from "@/lib/traits/types";

// Priority bands:
//   temporal   = 100 (current context wins)
//   medical    = 60  (more-specific, health-critical)
//   placement  = 50
//   distance   = 40
//   sports     = 40
//   year       = 30
//   language   = 30
//   scholarship= 30
//   tech/role  = 20
//   shift/block= 20

export const TRAIT_DEFINITIONS: TraitDef[] = [
  // ── Student: identity ──────────────────────────────────────────────────
  {
    id: "year_1",
    label: "First year",
    source: "profile",
    roles: ["student"],
    priority: 30,
    overrides: {
      "onboarding.tour.show": "every_session",
      "onboarding.hints.show": true,
      "ui.menuDepth": 5,
      "dashboard.widgetOrder": ["goals", "feed", "events", "recap", "notifications"],
      "quick_actions.selected": ["ask_help", "request_early_leave", "view_attendance", "view_meals"],
      "notifications.weekly_digest": { channels: ["email"], day: "friday", time: "18:00" },
    },
  },
  {
    id: "year_4",
    label: "Final year",
    source: "profile",
    roles: ["student"],
    priority: 30,
    overrides: {
      "dashboard.transitionCard": true,
      "profile.transitionCard": true,
      "onboarding.tour.show": "off",
      "onboarding.hints.show": false,
      "quick_actions.selected": ["placement_calendar", "view_records", "raise_issue"],
    },
  },

  // ── Student: distance ──────────────────────────────────────────────────
  {
    id: "distant",
    label: "Distant (>50km)",
    source: "computed",
    roles: ["student"],
    priority: 40,
    overrides: {
      "notifications.weekly_digest": { channels: ["email"], day: "sunday", time: "18:00" },
      "notifications.home_travel": { channels: ["in_app"], timing: "fri" },
      "pass.defaultType": "outpass_home",
      "pass.template": "weekend_home",
      "privacy.parentVisibility": ["attendance", "passes", "travel_plans", "complaints"],
    },
  },
  {
    id: "local",
    label: "Local (<10km)",
    source: "computed",
    roles: ["student"],
    priority: 40,
    overrides: {
      "pass.defaultType": "day_out",
      "pass.template": "day_local",
      "notifications.curfew_approaching": { channels: ["in_app"], timing: "T-30m" },
      "quick_actions.selected": ["request_early_leave", "view_attendance", "raise_issue", "mess_menu"],
    },
  },

  // ── Student: language ──────────────────────────────────────────────────
  {
    id: "language_hi",
    label: "Hindi speaker",
    source: "declared",
    roles: ["student", "parent", "guardian"],
    priority: 30,
    overrides: {
      "language.ui": "en",
      "language.sms": "hi",
      "language.digest": "hi",
    },
  },
  {
    id: "language_regional",
    label: "Regional language",
    source: "declared",
    roles: ["student", "parent", "guardian"],
    priority: 30,
    overrides: {
      "language.ui": "en",
      "language.sms": "regional",
      "language.digest": "regional",
    },
  },

  // ── Student: medical ───────────────────────────────────────────────────
  {
    id: "medical_chronic",
    label: "Chronic medical condition",
    source: "profile",
    roles: ["student"],
    priority: 60,
    overrides: {
      "meals.showAllergens": true,
      "meals.dietary": "optional",
      "emergency.contactOrder": ["doctor", "parent"],
      "dashboard.firstWidget": "health_card",
      // health_med_reminder is "required" — the trait does NOT override it;
      // it's always on. (scopedBy: [] in the registry.)
    },
  },
  {
    id: "medical_acute",
    label: "Acute (active sick leave)",
    source: "computed",
    roles: ["student"],
    priority: 60,
    overrides: {
      "meals.skipOnSick": true,
      "dashboard.defaultPeriod": "today",
      "notifications.reduce_non_critical": true,
    },
  },

  // ── Student: athletics / placement / scholarship ─────────────────────
  {
    id: "sports_athlete",
    label: "Sports athlete",
    source: "profile",
    roles: ["student"],
    priority: 40,
    overrides: {
      "meals.preWorkoutAlert": true,
      "curfew.extendForPractice": true,
      "attendance.exemptionFlow": "coach_co_sign",
      "pass.template": "sports_travel",
      "pass.defaultType": "sports_outpass",
      "dashboard.firstWidget": "practice_schedule",
    },
  },
  {
    id: "placement_active",
    label: "Placement active",
    source: "computed",
    roles: ["student"],
    priority: 50,
    overrides: {
      "dashboard.firstWidget": "placement_calendar",
      "dashboard.transitionCard": true,
      "curfew.extendForPlacement": true,
      "attendance.exemptionFlow": "placement_cell",
      "pass.template": "interview_leave",
      "pass.defaultType": "interview",
      "notifications.event_rsvp": { channels: ["in_app", "push"], timing: "immediate" },
    },
  },
  {
    id: "scholarship",
    label: "Scholarship / sponsored",
    source: "profile",
    roles: ["student"],
    priority: 30,
    overrides: {
      "reports.monthlyCompliance": true,
      "reports.digestCC": "sponsor",
      "reports.attendanceFormat": "detailed_with_reasons",
      "goals.mealsPerWeek": 10,
      "dashboard.showComplianceStatus": true,
    },
  },

  // ── Student: tech comfort ──────────────────────────────────────────────
  {
    id: "tech_novice",
    label: "Tech novice",
    source: "computed",
    roles: ["student"],
    priority: 20,
    overrides: {
      "ui.motion": "reduced",
      "ui.menuDepth": 5,
      "onboarding.hints.show": true,
      "appearance.fontSize": "lg",
      "notifications.reduce_non_critical": true,
    },
  },

  // ── Temporal (auto-activate, auto-revert; highest priority) ──────────
  {
    id: "exam_week",
    label: "Exam week",
    source: "temporal",
    roles: ["student", "parent", "guardian", "faculty"],
    priority: 100,
    overrides: {
      "dashboard.showStudyTracker": true,
      "dashboard.firstWidget": "study_tracker",
      "notifications.reduce_non_critical": true,
      "pass.autoRouteCC": ["hod"],
      "attendance.disputeWindowHours": 336,
      "curfew.liftForStudy": true,
      "goals.sleepSchedule": { bed: "23:30", wake: "06:30" },
      "parent.digestSuppress": ["social", "events"],
      "parent.notificationPriority": ["exam", "health", "safety"],
    },
  },
  {
    id: "semester_start",
    label: "Semester start",
    source: "temporal",
    roles: ["student", "faculty"],
    priority: 100,
    overrides: {
      "onboarding.tour.show": "once",
      "onboarding.hints.show": true,
      "dashboard.firstWidget": "what_s_new",
    },
  },
  {
    id: "monsoon",
    label: "Monsoon / weather",
    source: "temporal",
    roles: ["student"],
    priority: 100,
    overrides: {
      "notifications.home_travel": { channels: ["in_app"], timing: "commute" },
      "attendance.lateGraceMinutes": 25,
      "attendance.disputeWindowHours": 240,
    },
  },

  // ── Parent / guardian ──────────────────────────────────────────────────
  {
    id: "parent_working",
    label: "Working parent",
    source: "declared",
    roles: ["parent", "guardian"],
    priority: 30,
    overrides: {
      "notifications.weekly_digest": { channels: ["email"], day: "saturday", time: "19:00" },
      "parent.consentMode": "sms_one_tap",
      "format.time": "24h",
    },
  },
  {
    id: "parent_distant",
    label: "Distant parent",
    source: "computed",
    roles: ["parent", "guardian"],
    priority: 40,
    overrides: {
      "parent.childSafetyPriority": "high",
      "notifications.weekly_digest": { channels: ["email"], day: "sunday", time: "18:00" },
      "format.firstDayOfWeek": "sunday",
    },
  },
  {
    id: "parent_multiple_children",
    label: "Multiple children",
    source: "computed",
    roles: ["parent", "guardian"],
    priority: 30,
    overrides: {
      "parent.layout": "children_grid",
      "parent.digestGrouping": "unified",
      "quick_actions.selected": ["switch_child", "view_attendance", "raise_issue"],
    },
  },
  {
    id: "parent_language_hi",
    label: "Hindi-speaking parent",
    source: "declared",
    roles: ["parent", "guardian"],
    priority: 30,
    overrides: {
      "language.sms": "hi",
      "language.digest": "hi",
    },
  },
  {
    id: "child_in_exam_week",
    label: "Child in exam week (inherited)",
    source: "temporal",
    roles: ["parent", "guardian"],
    priority: 100,
    overrides: {
      "parent.digestSuppress": ["social", "events"],
      "parent.notificationPriority": ["exam", "health", "safety"],
      "notifications.reduce_non_critical": true,
    },
  },

  // ── Faculty ────────────────────────────────────────────────────────────
  {
    id: "faculty_new",
    label: "New faculty (<90d)",
    source: "computed",
    roles: ["faculty"],
    priority: 30,
    overrides: {
      "onboarding.tour.show": "every_session",
      "onboarding.hints.show": true,
      "ui.menuDepth": 5,
    },
  },
  {
    id: "faculty_senior",
    label: "Senior faculty (>3y)",
    source: "computed",
    roles: ["faculty"],
    priority: 20,
    overrides: {
      "appearance.density": "compact",
      "onboarding.hints.show": false,
    },
  },
  {
    id: "faculty_hod",
    label: "Department head",
    source: "profile",
    roles: ["faculty"],
    priority: 40,
    overrides: {
      "dashboard.firstWidget": "department_overview",
      "lists.defaultSort": "oldest",
      "dashboard.defaultPeriod": "month",
    },
  },
  {
    id: "faculty_shift_morning",
    label: "Morning shift faculty",
    source: "computed",
    roles: ["faculty"],
    priority: 20,
    overrides: {
      "faculty.classReminderShift": "08:00",
      "dashboard.firstWidget": "todays_shift",
      "format.time": "24h",
    },
  },
  {
    id: "faculty_shift_evening",
    label: "Evening shift faculty",
    source: "computed",
    roles: ["faculty"],
    priority: 20,
    overrides: {
      "faculty.classReminderShift": "14:00",
      "dashboard.firstWidget": "todays_shift",
      "format.time": "24h",
    },
  },

  // ── Operational (warden / hostel / caretaker / mess / operator) ──────
  {
    id: "shift_morning",
    label: "Morning duty shift",
    source: "computed",
    roles: ["warden", "hostel_manager", "caretaker", "operator"],
    priority: 20,
    overrides: {
      "nav.landingTab": "queue",
      "notifications.quietHours": { start: "20:00", end: "05:00" },
      "dashboard.defaultPeriod": "today",
    },
  },
  {
    id: "shift_evening",
    label: "Evening duty shift",
    source: "computed",
    roles: ["warden", "hostel_manager", "caretaker", "operator"],
    priority: 20,
    overrides: {
      "nav.landingTab": "queue",
      "notifications.quietHours": { start: "23:00", end: "05:00" },
      "dashboard.defaultPeriod": "today",
    },
  },
  {
    id: "shift_night",
    label: "Night duty shift",
    source: "computed",
    roles: ["warden", "hostel_manager", "caretaker", "operator"],
    priority: 20,
    overrides: {
      "nav.landingTab": "queue",
      "notifications.quietHours": { start: "06:00", end: "16:00" },
      "appearance.theme": "graphite",
    },
  },
  {
    id: "block_specific",
    label: "Block-assigned",
    source: "profile",
    roles: ["warden", "hostel_manager", "caretaker"],
    priority: 20,
    overrides: {
      "operational.queueFilter": "block",
      "dashboard.scope": "block",
      "lists.defaultSort": "newest",
    },
  },
  {
    id: "role_new",
    label: "New in role (<30d)",
    source: "computed",
    roles: ["warden", "hostel_manager", "caretaker", "mess_incharge", "operator"],
    priority: 20,
    overrides: {
      "onboarding.tour.show": "every_session",
      "operational.showHelpTooltips": true,
      "onboarding.hints.show": true,
    },
  },
  {
    id: "role_veteran",
    label: "Veteran in role (>2y)",
    source: "computed",
    roles: ["warden", "hostel_manager", "caretaker", "mess_incharge", "operator"],
    priority: 20,
    overrides: {
      "appearance.density": "compact",
      "operational.analyticsAdvanced": true,
      "onboarding.hints.show": false,
    },
  },

  // ── Executive (principal / VP / admin / sysadmin) ────────────────────
  {
    id: "oversight_compliance",
    label: "Oversight: compliance",
    source: "declared",
    roles: ["principal", "vice_principal", "admin", "sysadmin"],
    priority: 20,
    overrides: {
      "dashboard.firstWidget": "compliance",
      "reports.attendanceFormat": "detailed_with_reasons",
      "dashboard.defaultPeriod": "month",
    },
  },
  {
    id: "oversight_analytics",
    label: "Oversight: analytics",
    source: "declared",
    roles: ["principal", "vice_principal", "admin", "sysadmin"],
    priority: 20,
    overrides: {
      "dashboard.firstWidget": "analytics",
      "dashboard.widgetOrder": ["analytics", "compliance", "sla", "flags", "health"],
      "operational.analyticsAdvanced": true,
    },
  },
  {
    id: "on_call",
    label: "On-call",
    source: "temporal",
    roles: ["principal", "vice_principal", "admin", "sysadmin", "operator"],
    priority: 100,
    overrides: {
      "ui.minimal": true,
      "notifications.quietHours": { start: "00:00", end: "00:00" }, // SMS bypass quiet hours
      "format.time": "24h",
    },
  },
];

/** Index by id. */
export const TRAIT_MAP: Record<string, TraitDef> = Object.fromEntries(
  TRAIT_DEFINITIONS.map((t) => [t.id, t]),
);

export default TRAIT_DEFINITIONS;
