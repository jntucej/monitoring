/**
 * tests/unit/preferences-conformance.test.ts — the guardrail for the taste layer.
 *
 * The model's one rule: "You can hide decoration. You cannot hide compliance."
 * That rule lives in the registry: every preference key is declared with a
 * rank. This test asserts:
 *   1. every key has a rank in {required, recommended, cosmetic}
 *   2. compliance-critical keys are "required" (cannot be user-silenced)
 *   3. no key is declared twice
 *   4. the resolver honors the "required" rank (policy beats user)
 *
 * If a new key lands without a rank, or a compliance key is downgraded to
 * "cosmetic", this fails. That's the drift guard for the taste layer.
 */

import { describe, it, expect } from "vitest";
import {
  PREF_REGISTRY,
  getPrefDef,
  isKnownPrefKey,
  prefRank,
  type PrefRank,
} from "@/lib/preferences/registry";
import {
  resolvePref,
  PERSONA_DEFAULTS,
  ROLE_DEFAULTS,
  POLICY_DEFAULTS,
  type CascadeContext,
} from "@/lib/preferences/resolve";

const VALID_RANKS: PrefRank[] = ["required", "recommended", "cosmetic"];

// The compliance-critical keys that must NEVER be user-silencable.
const REQUIRED_KEYS = [
  "notifications.curfew_breach",
  "notifications.parent_consent",
  "notifications.emergency_broadcast",
];

describe("preference registry conformance", () => {
  it("registry is non-empty", () => {
    expect(PREF_REGISTRY.length).toBeGreaterThan(0);
  });

  it("every key has a valid rank", () => {
    for (const k of PREF_REGISTRY) {
      expect(
        VALID_RANKS.includes(k.rank),
        `${k.key} has an invalid rank ${k.rank}`,
      ).toBe(true);
    }
  });

  it("no key is declared twice", () => {
    const keys = PREF_REGISTRY.map((k) => k.key);
    expect(new Set(keys).size, "duplicate preference keys").toBe(keys.length);
  });

  it("compliance-critical keys are ranked 'required'", () => {
    for (const key of REQUIRED_KEYS) {
      expect(prefRank(key), `${key} must be 'required'`).toBe("required");
      expect(getPrefDef(key)?.hint ?? "").toMatch(/required|institute|🔒/i);
    }
  });

  it("a 'required' key cannot be user-overridden (resolver honors the rank)", () => {
    const ctx: CascadeContext = {
      // The user tries to silence the curfew breach — a "required" key.
      user: { "notifications.curfew_breach": { channels: ["off"], timing: "never" } },
      persona: {},
      role: {},
      policy: { "notifications.curfew_breach": { channels: ["in_app", "sms"], timing: "immediate" } },
    };
    const resolved = resolvePref("notifications.curfew_breach", ctx);
    // The policy value wins; the user's "off" is ignored but kept in userValue.
    expect(resolved.source).toBe("policy");
    expect(resolved.value).toEqual({ channels: ["in_app", "sms"], timing: "immediate" });
    expect(resolved.userValue).toEqual({ channels: ["off"], timing: "never" });
    expect(resolved.locked ?? resolved.rank).toBeTruthy();
  });

  it("a 'cosmetic' key honors the user value over persona/role", () => {
    const ctx: CascadeContext = {
      user: { "appearance.density": "compact" },
      persona: { "appearance.density": "spacious" },
      role: { "appearance.density": "comfortable" },
      policy: {},
    };
    const resolved = resolvePref("appearance.density", ctx);
    expect(resolved.value).toBe("compact");
    expect(resolved.source).toBe("user");
  });

  it("unknown keys fall back to the system default (drift guard)", () => {
    const ctx: CascadeContext = { user: { "not.a.real.key": "x" }, persona: {}, role: {}, policy: {} };
    const resolved = resolvePref("not.a.real.key", ctx);
    expect(isKnownPrefKey("not.a.real.key")).toBe(false);
    expect(resolved.value).toBeUndefined();
    expect(resolved.source).toBe("system");
  });

  it("persona defaults differ for the two student personas", () => {
    const ds = PERSONA_DEFAULTS.day_scholar;
    const ho = PERSONA_DEFAULTS.hosteller;
    // Different widget orders + different digest days.
    expect(ds["dashboard.widgetOrder"]).not.toEqual(ho["dashboard.widgetOrder"]);
    expect((ds["notifications.weekly_digest"] as { day: string }).day).not.toBe(
      (ho["notifications.weekly_digest"] as { day: string }).day,
    );
    // Different default pass type (early_leave vs outpass_home).
    expect(ds["pass.defaultType"]).not.toBe(ho["pass.defaultType"]);
  });

  it("role defaults exist for the core roles", () => {
    for (const r of ["student", "warden", "operator", "sysadmin"]) {
      expect(ROLE_DEFAULTS[r], `no role defaults for ${r}`).toBeDefined();
    }
  });

  it("policy defaults lock the required notification keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(POLICY_DEFAULTS[key], `${key} missing from policy defaults`).toBeDefined();
    }
  });
});

// ── Trait-layer conformance ─────────────────────────────────────────────────
// The trait stack's guardrails:
//   - every trait override key is in the registry AND its scopedBy includes
//     the trait (the "scopedBy guardrail" — a trait can't touch a key it
//     doesn't own)
//   - no trait overrides a "required" key (compliance safety rail)
//   - every trait overrides ≥ 2 keys (else fold into persona/user pref)
//   - the resolver honors the trait layer between user and persona

import { TRAIT_DEFINITIONS } from "@/lib/traits/definitions";
import { deriveTraits } from "@/lib/traits/derive";

describe("trait layer conformance", () => {
  it("every trait overrides at least 2 keys", () => {
    for (const t of TRAIT_DEFINITIONS) {
      expect(
        Object.keys(t.overrides).length,
        `${t.id} overrides ${Object.keys(t.overrides).length} keys — fold into persona/user pref`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("every trait override key is registered AND scoped to this trait", () => {
    for (const t of TRAIT_DEFINITIONS) {
      for (const key of Object.keys(t.overrides)) {
        const def = getPrefDef(key);
        expect(def, `${t.id} overrides unknown key ${key}`).toBeDefined();
        // The scopedBy guardrail: the registry must list this trait for
        // the key. Empty scopedBy = trait-immune.
        expect(
          (def!.scopedBy ?? []).includes(t.id),
          `${t.id} overrides ${key} but the registry's scopedBy does not include ${t.id}`,
        ).toBe(true);
      }
    }
  });

  it("no trait overrides a 'required'-rank key (compliance rail)", () => {
    for (const t of TRAIT_DEFINITIONS) {
      for (const key of Object.keys(t.overrides)) {
        const def = getPrefDef(key);
        expect(
          def!.rank !== "required",
          `${t.id} overrides required key ${key} — traits can never touch compliance`,
        ).toBe(true);
      }
    }
  });

  it("the trait layer wins between user and persona (resolver)", () => {
    const trait = {
      id: "exam_week",
      source: "temporal" as const,
      priority: 100,
      overrides: { "curfew.liftForStudy": true },
    };
    const ctx: CascadeContext = {
      user: {}, // no user override
      traits: [trait],
      persona: {},
      role: {},
      policy: {},
    };
    const resolved = resolvePref("curfew.liftForStudy", ctx);
    expect(resolved.value).toBe(true);
    expect(resolved.source).toBe("trait");
    expect(resolved.traitId).toBe("exam_week");
  });

  it("a trait CANNOT influence a key it doesn't own (scopedBy guard)", () => {
    // distant owns pass.defaultType but NOT curfew.liftForStudy.
    const trait = {
      id: "distant",
      source: "computed" as const,
      priority: 40,
      overrides: { "curfew.liftForStudy": true }, // not in distant's scopedBy
    };
    const ctx: CascadeContext = {
      user: {},
      traits: [trait],
      persona: {},
      role: {},
      policy: {},
    };
    const resolved = resolvePref("curfew.liftForStudy", ctx);
    // The trait is skipped for this key (not in scopedBy) → falls to system.
    expect(resolved.source).toBe("system");
    expect(resolved.value).toBe(false); // curfew.liftForStudy system default
  });

  it("temporal traits auto-activate from the calendar context", () => {
    const active = deriveTraits({
      userId: "u1",
      role: "student",
      profile: { year: 1, distanceKm: 60 },
      ctx: { now: new Date(), calendar: { examWeekActive: true } },
    });
    const ids = active.map((t) => t.id);
    expect(ids).toContain("exam_week"); // temporal fired
    expect(ids).toContain("year_1"); // profile fired
    expect(ids).toContain("distant"); // computed fired
    // exam_week has the highest priority (temporal = 100).
    expect(active[0].id).toBe("exam_week");
  });

  it("a required key stays policy-locked even with active traits", () => {
    // medical_chronic is active but health_med_reminder is "required"
    // (scopedBy: []) — the trait cannot touch it.
    const active = deriveTraits({
      userId: "u1",
      role: "student",
      profile: { medicalChronic: true, medicalCondition: "diabetes" },
      ctx: { now: new Date() },
    });
    expect(active.map((t) => t.id)).toContain("medical_chronic");
    const ctx: CascadeContext = {
      user: {},
      traits: active,
      persona: {},
      role: {},
      policy: { "notifications.health_med_reminder": { channels: ["in_app", "push"], bypassQuietHours: true } },
    };
    const resolved = resolvePref("notifications.health_med_reminder", ctx);
    expect(resolved.source).toBe("policy"); // required → policy wins, trait ignored
  });
});
