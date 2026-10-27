/**
 * Operator recommendation engine.
 *
 * Pure, client-safe (no DB / pg / Node builtins) — mirrors the
 * `resolveEntryOptions` button matrix in permission-workflow-core.ts so the
 * gate operator and the approval engine agree on what is offered.
 *
 * Input: the scanned person's authoritative campus occupancy status, their
 * last OUT reason, current entry type, whether an approved gate pass is on
 * file, the curfew window, and biometric readiness. Output: one recommended
 * action (direction + reason + entry type/button + confidence) plus up to two
 * alternatives. The recommendation drives the "1 big button + 2 alternatives"
 * UI in ScanConfirmation — no free multi-step reason/entry-type choice.
 */

import type { ExitReason, ScanDirection } from "@/lib/types";

export type EntryButtonId = "return_to_hostel" | "home_in" | "day_scholar_in";

export interface RecommendationInput {
  campusStatus: "IN" | "OUT" | null;
  lastReason: string | null;
  currentEntryType: "hosteller" | "day_scholar" | null;
  hasApprovedPass: boolean;
  /** Minutes until curfew; null when no curfew is configured. */
  curfewMinutes: number | null;
  /** True when a thumbprint/biometric is registered + verified. */
  biometricReady: boolean;
}

export interface RecommendationAlternative {
  /** Stable button id / reason code. */
  code: string;
  label: string;
  /** lucide icon name, resolved via operator-icons.ts. */
  icon: string;
  /** Direction this alternative records. */
  direction: ScanDirection;
  payload: {
    direction: ScanDirection;
    reason?: ExitReason;
    entryType?: "hosteller" | "day_scholar" | null;
    buttonId?: EntryButtonId;
  };
}

export interface Recommendation {
  direction: ScanDirection;
  reason: ExitReason | null;
  entryType: "hosteller" | "day_scholar" | null;
  entryButton: EntryButtonId | null;
  /** 0..1. confidence < 0.7 → surface all alternatives. */
  confidence: number;
  /** 0..2 alternatives rendered under the recommended button. */
  alternatives: RecommendationAlternative[];
}

/** IN-movement button metadata (icon token via operator-icons.ts). */
const ENTRY_META: Record<EntryButtonId, { label: string; icon: string; entryType: "hosteller" | "day_scholar" }> = {
  return_to_hostel: { label: "Return to Hostel", icon: "in", entryType: "hosteller" },
  home_in: { label: "Home In", icon: "in", entryType: "hosteller" },
  day_scholar_in: { label: "Day Scholar In", icon: "in", entryType: "day_scholar" },
};

/** OUT-movement button metadata (canonical exit reasons). */
const EXIT_META: Record<string, { label: string; icon: string; reason: ExitReason; requiresApproval: boolean }> = {
  daily_outing: { label: "Daily Outing", icon: "out", reason: "daily_outing", requiresApproval: false },
  day_pass: { label: "Day Pass", icon: "out", reason: "day_pass", requiresApproval: true },
  home_out: { label: "Home Out", icon: "out", reason: "home_out", requiresApproval: true },
  day_scholar_out: { label: "Day Scholar Out", icon: "out", reason: "day_scholar_out", requiresApproval: false },
  emergency: { label: "Emergency", icon: "flag", reason: "emergency", requiresApproval: true },
};

function entryAlt(code: EntryButtonId, direction: ScanDirection = "IN"): RecommendationAlternative {
  const m = ENTRY_META[code];
  return {
    code,
    label: m.label,
    icon: m.icon,
    direction,
    payload: { direction, entryType: m.entryType, buttonId: code },
  };
}

function exitAlt(code: string, direction: ScanDirection = "OUT"): RecommendationAlternative {
  const m = EXIT_META[code] ?? EXIT_META.daily_outing;
  return {
    code,
    label: m.label,
    icon: m.icon,
    direction,
    payload: { direction, reason: m.reason },
  };
}

export function recommend(input: RecommendationInput): Recommendation {
  const { campusStatus, lastReason, currentEntryType, hasApprovedPass, curfewMinutes, biometricReady } = input;

  const alternatives: RecommendationAlternative[] = [];

  // ── Direction auto-select from occupancy ─────────────────────────────────
  // OUT (person is off campus) → record an entry (IN). IN → record an exit.
  let direction: ScanDirection = "IN";
  if (campusStatus === "IN") direction = "OUT";
  else if (campusStatus === "OUT") direction = "IN";
  else direction = "IN"; // unknown → default entry, operator can flip
  let confidence = campusStatus === null ? 0.5 : 0.9;

  let entryType: "hosteller" | "day_scholar" | null = currentEntryType;
  let entryButton: EntryButtonId | null = null;
  let reason: ExitReason | null = null;

  if (direction === "IN") {
    // Entry: pick the re-entry button from the last OUT reason (mirrors
    // resolveEntryOptions), auto-selecting the recommended one.
    if (lastReason === "daily_outing" || lastReason === "day_pass") {
      entryButton = "return_to_hostel";
      alternatives.push(entryAlt("home_in"), entryAlt("day_scholar_in"));
      confidence = 0.9;
    } else if (lastReason === "day_scholar_out") {
      entryButton = "day_scholar_in";
      entryType = "day_scholar";
      confidence = 0.9;
    } else {
      // home_out / null / unknown → recommend Home In; offer Day Scholar In.
      entryButton = "home_in";
      alternatives.push(entryAlt("day_scholar_in"));
      confidence = lastReason === null ? 0.7 : 0.85;
    }
    reason = null;
  } else {
    // Exit: auto-select the canonical reason.
    if (currentEntryType === "day_scholar") {
      reason = "day_scholar_out";
      confidence = 0.9;
      alternatives.push(exitAlt("home_out"));
    } else {
      // hosteller (or unknown→hosteller): recommend Daily Outing (no pass
      // needed), offer Day Pass + Home Out as alternatives.
      reason = "daily_outing";
      confidence = 0.85;
      alternatives.push(exitAlt("day_pass"), exitAlt("home_out"));
    }
    entryType = null; // entry type is irrelevant on an exit
  }

  // ── Alternatives: curfew + biometric cautions ─────────────────────────────
  if (curfewMinutes !== null && curfewMinutes < 30) {
    alternatives.push({
      code: "curfew",
      label: "Curfew in " + Math.max(curfewMinutes, 0) + "m",
      icon: "curfew",
      direction,
      payload: { direction },
    });
  }
  if (!biometricReady) {
    alternatives.push({
      code: "no_biometric",
      label: "No biometric on file",
      icon: "locked",
      direction,
      payload: { direction },
    });
  }

  // cap at 2 alternatives (principle 3 + acceptance "1 recommended + 2 alt")
  const cappedAlts = alternatives.slice(0, 2);

  // hasApprovedPass is a badge-only signal — it does not change the
  // recommendation (principle: keep the safe path 1 tap).
  void hasApprovedPass;

  return {
    direction,
    reason,
    entryType,
    entryButton,
    confidence,
    alternatives: cappedAlts,
  };
}
