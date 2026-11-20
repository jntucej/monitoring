/**
 * lib/traits/types.ts — the trait-layer types.
 *
 * A trait is a profile signal (year, distance, medical, exam-week, …) that
 * owns a SMALL declared slice of preference keys. Traits never own the
 * whole UI — they contribute scoped overrides. The guardrail:
 *
 *   - A trait only influences a key when the registry's `scopedBy` for that
 *     key includes the trait. That's the "scopedBy guardrail" — a trait
 *     cannot touch what the registry says it doesn't own.
 *   - No trait may override a "required"-rank key (that's the compliance
 *     safety rail; the conformance test hard-fails on this).
 *   - A trait must override ≥ 2 keys, else it's not a trait — fold it into
 *     persona or user pref.
 *
 * This is Tier 0 (kernel) — it never forks.
 */

import type { Role, Persona } from "@/lib/preferences/registry";

/** How a trait becomes active. Trust level + whether the user can edit it. */
export type TraitSource = "profile" | "computed" | "temporal" | "declared";

/**
 * A trait definition: the seed row. Declares which role(s) it applies to,
 * what keys it owns (the trait's scoped override map), and a priority for
 * conflict resolution (higher wins when two traits scope the same key).
 */
export interface TraitDef {
  /** Stable id, e.g. "year_1", "exam_week", "medical_chronic". */
  id: string;
  /** Human label. */
  label: string;
  /** Derivation source (trust level). */
  source: TraitSource;
  /** Which roles this trait applies to (empty = everyone). */
  roles: Role[];
  /**
   * The keys this trait overrides, with their values. Each key MUST be in
   * the trait's id's `scopedBy` (enforced by the conformance test). The
   * priority is for conflict resolution when two active traits scope the
   * same key.
   */
  overrides: Record<string, unknown>;
  /** Conflict priority (higher wins). Temporal traits get a boost. */
  priority: number;
  description?: string;
}

/**
 * An ACTIVE trait: a TraitDef that has been derived as true for a specific
 * user right now. Carries the evidence + any temporal window. The client
 * receives ActiveTrait[] in the auth payload; the resolver uses it.
 */
export interface ActiveTrait {
  id: string;
  source: TraitSource;
  /** The trait's scoped overrides (the only keys it can influence). */
  overrides: Record<string, unknown>;
  priority: number;
  /** Why this trait fired (audit). */
  evidence?: Record<string, unknown>;
  /** Temporal window. */
  activeFrom?: string;
  activeUntil?: string;
}

export default TraitDef;
