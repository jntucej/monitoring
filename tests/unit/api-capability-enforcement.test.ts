/**
 * tests/unit/api-capability-enforcement.test.ts — Layer 3: API enforcement.
 *
 * The plan's "one test per mutating route, asserting the ROUTE denies what
 * the resolver says deny." This is a CONTRACT test: it asserts the expected
 * 403 responses derived from the config resolver, against the persona
 * fixtures. The routes themselves gain the capability gate in the P7
 * "API enforcement" phase (one role group per PR); this test is the target
 * spec that phase must satisfy.
 *
 * When a mutating route is wired with `capability` + `context` (per the
 * §1 Touch 4 pattern), this test flips from "contract" to "live" by
 * swapping the expected-status computation for a real fetch.
 */
import { describe, it, expect } from "vitest";
import { hasCapability } from "../../src/config/roles/index";
import { PERSONA_FIXTURES, type PersonaFixture } from "../capabilities/fixtures";

/**
 * The mutating routes each persona should be DENIED (403). Derived from the
 * fixture's deniedRoutes + the resolver's decision on the route's capability.
 */
const ROUTE_CAPABILITY: Record<string, string> = {
  // POST /api/permissions opens a hostel-leave ticket → gated on hostel.leave.apply
  "/api/permissions": "hostel.leave.apply",
};

describe("Layer 3 — API enforcement contract (from fixtures)", () => {
  for (const f of PERSONA_FIXTURES) {
    describe(f.name, () => {
      for (const route of f.deniedRoutes) {
        const capId = ROUTE_CAPABILITY[route];
        it(`POST ${route} → 403 (capability '${capId}' denied)`, () => {
          // The route SHOULD return 403 when the capability is not granted.
          // The resolver says this persona lacks the cap → expect the route to deny.
          const granted = hasCapability(f.role, f.ctx, capId);
          expect(granted, `'${f.name}' should NOT have '${capId}' for ${route}`).toBe(false);
        });
      }
      // Personas with no denied routes: the resolver grants them the cap →
      // the route SHOULD allow (2xx). This is the positive case.
      it("has no denied routes → resolver grants the cap (positive case)", () => {
        if (f.deniedRoutes.length === 0) {
          const capId = "hostel.leave.apply";
          // For hosteller-in, the cap is granted; for day scholar, it's not.
          // We only assert the positive case for personas that SHOULD have it.
          const shouldHave = f.expectedCaps.includes(capId);
          const granted = hasCapability(f.role, f.ctx, capId);
          expect(granted, `'${f.name}' expected to have '${capId}' = ${shouldHave}`).toBe(shouldHave);
        }
      });
    });
  }

  it("day scholar is denied the hostel-leave route; hosteller is not", () => {
    const day = PERSONA_FIXTURES.find((f) => f.name === "day-scholar-in")!;
    const hostel = PERSONA_FIXTURES.find((f) => f.name === "hosteller-in")!;
    expect(hasCapability(day.role, day.ctx, "hostel.leave.apply")).toBe(false); // denied
    expect(hasCapability(hostel.role, hostel.ctx, "hostel.leave.apply")).toBe(true); // allowed
  });
});
