/**
 * tests/unit/mess-eligibility.test.ts — regression tests for the mess
 * eligibility resolver (the single definition of "who gets a mess token").
 *
 * The resolver is pure: (student signals) → { eligible, reason }. These lock
 * in the decision order + the billing-safety fix (a hosteller on approved
 * leave covering the meal is EXCLUDED, so they're not charged for food they
 * didn't eat).
 */
import { describe, it, expect } from "vitest";
import { resolveMessEligibility, type MessEligibilityInput } from "../../src/lib/mess-eligibility";

function input(over: Partial<MessEligibilityInput> = {}): MessEligibilityInput {
  return {
    isHosteller: true,
    userStatus: "ACTIVE",
    optedOut: false,
    onApprovedLeave: false,
    presence: "in",
    hasPreference: true,
    ...over,
  };
}

describe("resolveMessEligibility — decision order", () => {
  it("a suspended/graduated student is never eligible (status gates first)", () => {
    expect(resolveMessEligibility(input({ userStatus: "SUSPENDED" })).eligible).toBe(false);
    expect(resolveMessEligibility(input({ userStatus: "GRADUATED" })).reason).toBe("GRADUATED");
    expect(resolveMessEligibility(input({ userStatus: "Suspended" })).reason).toBe("SUSPENDED");
  });

  it("a day scholar is never a mess student", () => {
    const r = resolveMessEligibility(input({ isHosteller: false }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("DAY_SCHOLAR");
  });

  it("the billing-safety fix: a hosteller ON APPROVED LEAVE is excluded even if in-campus", () => {
    const r = resolveMessEligibility(input({ onApprovedLeave: true, presence: "in" }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("HOSTELLER_ON_LEAVE");
  });

  it("an opted-out hosteller gets no token", () => {
    const r = resolveMessEligibility(input({ optedOut: true }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("HOSTELLER_OPTED_OUT");
  });

  it("an in-campus hosteller (no leave, no opt-out) is eligible", () => {
    const r = resolveMessEligibility(input({ presence: "in" }));
    expect(r.eligible).toBe(true);
    expect(r.reason).toBe("HOSTELLER_IN_CAMPUS");
  });

  it("a hosteller OUT but returning today is eligible (they'll eat)", () => {
    const r = resolveMessEligibility(input({ presence: "returned_today" }));
    expect(r.eligible).toBe(true);
    expect(r.reason).toBe("HOSTELLER_OUT_CAMPUS_RETURNING");
  });

  it("a hosteller OUT + not-returning falls back to the stored preference", () => {
    expect(resolveMessEligibility(input({ presence: "out", hasPreference: true })).eligible).toBe(true);
    expect(resolveMessEligibility(input({ presence: "out", hasPreference: false })).reason).toBe("NO_PREFERENCE");
  });

  it("unknown presence + no preference is ineligible (the safe default)", () => {
    const r = resolveMessEligibility(input({ presence: "unknown", hasPreference: false }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("NO_PREFERENCE");
  });

  it("every reason carries a human explanation (for the empty states)", () => {
    const cases: Array<Partial<MessEligibilityInput>> = [
      { userStatus: "SUSPENDED" },
      { isHosteller: false },
      { onApprovedLeave: true },
      { optedOut: true },
      { presence: "in" },
      { presence: "returned_today" },
      { presence: "out", hasPreference: false },
    ];
    for (const c of cases) {
      const r = resolveMessEligibility(input(c));
      expect(typeof r.explanation).toBe("string");
      expect(r.explanation.length).toBeGreaterThan(0);
    }
  });
});
