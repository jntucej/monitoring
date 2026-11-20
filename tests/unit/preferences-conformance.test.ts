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
