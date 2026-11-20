/**
 * lib/traits/derive.ts — the pure trait-derivation function.
 *
 * Runs server-side (so it can't be spoofed). Takes a user + profile +
 * context (calendar, roster, weather) and returns the ActiveTrait[] for
 * that user right now. The client receives this in the auth payload;
 * useEffectivePref consults it between the user and persona layers.
 *
 * A trait is active when its predicate returns true. The predicate reads
 * from the (trusted, admin-verified) profile fields — never from the
 * client.
 *
 * This is Tier 0 (kernel) — it never forks.
 */

import { TRAIT_DEFINITIONS, TRAIT_MAP } from "@/lib/traits/definitions";
import type { TraitDef } from "@/lib/traits/types";
import type { ActiveTrait } from "@/lib/traits/types";

// ── Input shapes (the trusted server-side record) ─────────────────────────

export interface DeriveContext {
  now: Date;
  /** Academic calendar — drives temporal traits. */
  calendar?: { examWeekActive?: boolean; semesterStart?: boolean };
  /** Weather — drives monsoon. */
  weather?: { monsoon?: boolean };
  /** Duty roster — drives shift traits. */
  roster?: { shift?: "morning" | "evening" | "night" | null };
  /** Pager schedule — drives on_call. */
  onCall?: boolean;
}

export interface DeriveInput {
  userId: string;
  role: string;
  /** Profile-derived signals (admin-verified, high trust). */
  profile: {
    year?: number | null;
    distanceKm?: number | null;
    language?: string | null;
    medicalChronic?: boolean;
    medicalCondition?: string | null;
    hasSickLeave?: boolean;
    sportsTeam?: string | null;
    placementActive?: boolean;
    scholarship?: boolean;
    hireDate?: string | null;
    isHod?: boolean;
    hostelBlock?: string | null;
    childCount?: number | null;
    working?: boolean;
    oversightFocus?: "compliance" | "analytics" | null;
    techComfort?: "novice" | "ok" | "expert";
    /** Inherited: is a related child in exam week? (parent traits). */
    childInExamWeek?: boolean;
  };
  ctx: DeriveContext;
}

// ── Per-trait predicates ────────────────────────────────────────────────────
// Each returns the evidence (audit) or null when the trait is not active.
// Kept pure: same input → same output. No I/O.

type Predicate = (input: DeriveInput) => Record<string, unknown> | null;

const P: Record<string, Predicate> = {
  year_1: (i) => (i.profile.year === 1 ? { year: 1 } : null),
  year_4: (i) => (i.profile.year === 4 ? { year: 4 } : null),
  distant: (i) => (i.profile.distanceKm != null && i.profile.distanceKm > 50 ? { distanceKm: i.profile.distanceKm } : null),
  local: (i) => (i.profile.distanceKm != null && i.profile.distanceKm < 10 ? { distanceKm: i.profile.distanceKm } : null),
  language_hi: (i) => (i.profile.language === "hi" ? { language: "hi" } : null),
  language_regional: (i) => (i.profile.language === "regional" ? { language: "regional" } : null),
  medical_chronic: (i) => (i.profile.medicalChronic ? { condition: i.profile.medicalCondition ?? "chronic" } : null),
  medical_acute: (i) => (i.profile.hasSickLeave ? { reason: "active_sick_leave" } : null),
  sports_athlete: (i) => (i.profile.sportsTeam ? { team: i.profile.sportsTeam } : null),
  placement_active: (i) => (i.profile.placementActive ? { window: "active" } : null),
  scholarship: (i) => (i.profile.scholarship ? { type: "sponsor" } : null),
  tech_novice: (i) => (i.profile.techComfort === "novice" ? { inferred: true } : null),

  // Temporal
  exam_week: (i) => (i.ctx.calendar?.examWeekActive ? { source: "calendar" } : null),
  semester_start: (i) => (i.ctx.calendar?.semesterStart ? { source: "calendar" } : null),
  monsoon: (i) => (i.ctx.weather?.monsoon ? { source: "weather" } : null),
  on_call: (i) => (i.ctx.onCall ? { source: "pager" } : null),

  // Parent / guardian
  parent_working: (i) => (i.profile.working ? { occupation: "working" } : null),
  parent_distant: (i) => (i.profile.distanceKm != null && i.profile.distanceKm > 50 ? { distanceKm: i.profile.distanceKm } : null),
  parent_multiple_children: (i) => (i.profile.childCount != null && i.profile.childCount > 1 ? { childCount: i.profile.childCount } : null),
  parent_language_hi: (i) => (i.profile.language === "hi" ? { language: "hi" } : null),
  child_in_exam_week: (i) => (i.profile.childInExamWeek ? { inherited: true } : null),

  // Faculty
  faculty_new: (i) => {
    if (!i.profile.hireDate) return null;
    const days = Math.floor((i.ctx.now.getTime() - new Date(i.profile.hireDate).getTime()) / 86_400_000);
    return days < 90 ? { hireDate: i.profile.hireDate, days } : null;
  },
  faculty_senior: (i) => {
    if (!i.profile.hireDate) return null;
    const days = Math.floor((i.ctx.now.getTime() - new Date(i.profile.hireDate).getTime()) / 86_400_000);
    return days > 3 * 365 ? { hireDate: i.profile.hireDate, days } : null;
  },
  faculty_hod: (i) => (i.profile.isHod ? { scope: "department" } : null),
  faculty_shift_morning: (i) => (i.ctx.roster?.shift === "morning" ? { shift: "morning" } : null),
  faculty_shift_evening: (i) => (i.ctx.roster?.shift === "evening" ? { shift: "evening" } : null),

  // Operational
  shift_morning: (i) => (i.ctx.roster?.shift === "morning" ? { shift: "morning" } : null),
  shift_evening: (i) => (i.ctx.roster?.shift === "evening" ? { shift: "evening" } : null),
  shift_night: (i) => (i.ctx.roster?.shift === "night" ? { shift: "night" } : null),
  block_specific: (i) => (i.profile.hostelBlock ? { block: i.profile.hostelBlock } : null),
  role_new: (i) => {
    if (!i.profile.hireDate) return null;
    const days = Math.floor((i.ctx.now.getTime() - new Date(i.profile.hireDate).getTime()) / 86_400_000);
    return days < 30 ? { hireDate: i.profile.hireDate, days } : null;
  },
  role_veteran: (i) => {
    if (!i.profile.hireDate) return null;
    const days = Math.floor((i.ctx.now.getTime() - new Date(i.profile.hireDate).getTime()) / 86_400_000);
    return days > 2 * 365 ? { hireDate: i.profile.hireDate, days } : null;
  },

  // Executive
  oversight_compliance: (i) => (i.profile.oversightFocus === "compliance" ? { focus: "compliance" } : null),
  oversight_analytics: (i) => (i.profile.oversightFocus === "analytics" ? { focus: "analytics" } : null),
};

// ── deriveTraits (the pure function) ──────────────────────────────────────

/**
 * Derive the active traits for a user. Returns them sorted by priority
 * (highest first) so the resolver can walk them in conflict order.
 */
export function deriveTraits(input: DeriveInput): ActiveTrait[] {
  const active: ActiveTrait[] = [];

  for (const def of TRAIT_DEFINITIONS) {
    // Role gate: the trait only applies to its declared roles.
    if (def.roles.length > 0 && !def.roles.includes(input.role as TraitDef["roles"][number])) {
      continue;
    }
    const pred = P[def.id];
    if (!pred) continue;
    const evidence = pred(input);
    if (evidence == null) continue;

    const t = TRAIT_MAP[def.id];
    active.push({
      id: t.id,
      source: t.source,
      overrides: t.overrides,
      priority: t.priority,
      evidence,
      // Temporal traits carry a window (the calendar/roster says when it ends).
      activeFrom: t.source === "temporal" ? input.ctx.now.toISOString() : undefined,
      activeUntil: t.source === "temporal" ? input.ctx.now.toISOString() : undefined,
    });
  }

  // Highest priority first — the resolver walks in this order.
  active.sort((a, b) => b.priority - a.priority);
  return active;
}

/**
 * Convenience: the trait's scoped overrides, filtered to keys the registry
 * actually allows this trait to touch (the scopedBy guardrail). The resolver
 * uses this so a trait can never influence a key it doesn't own.
 */
import { getPrefDef } from "@/lib/preferences/registry";
export function traitScopedOverrides(trait: ActiveTrait): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(trait.overrides)) {
    const def = getPrefDef(k);
    // Only include the key when the registry says this trait may touch it.
    if (def && def.scopedBy && def.scopedBy.includes(trait.id)) out[k] = v;
  }
  return out;
}

export default deriveTraits;
