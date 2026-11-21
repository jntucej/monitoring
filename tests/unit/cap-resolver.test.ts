/**
 * tests/unit/cap-resolver.test.ts — Layer 1: pure resolver unit tests.
 *
 * Driven by tests/capabilities/fixtures.ts (the single persona source).
 * Fast, no DB, no React. Every row of the fixture matrix is one assertion
 * block. This is where the "day scholar never gets hostel features" rule
 * is enforced.
 */
import { describe, it, expect } from "vitest";
import { hasCapability, resolveRoleConfig } from "../../src/config/roles/index";
import { PERSONA_FIXTURES, type PersonaFixture } from "../capabilities/fixtures";

describe("Layer 1 — capability resolver (pure, from fixtures)", () => {
  for (const f of PERSONA_FIXTURES) {
    describe(f.name, () => {
      it("grants exactly the expected capabilities", () => {
        const { capabilities } = resolveRoleConfig(f.role, f.ctx);
        const caps = new Set(capabilities);
        for (const c of f.expectedCaps) {
          expect(caps.has(c), `'${f.name}': expected capability '${c}' to be present`).toBe(true);
        }
        for (const c of f.forbiddenCaps) {
          expect(caps.has(c), `'${f.name}': expected capability '${c}' to be ABSENT`).toBe(false);
        }
      });

      it("hasCapability() agrees with the resolver", () => {
        for (const c of f.expectedCaps) {
          expect(hasCapability(f.role, f.ctx, c), `'${f.name}': hasCapability('${c}') should be true`).toBe(true);
        }
        for (const c of f.forbiddenCaps) {
          expect(hasCapability(f.role, f.ctx, c), `'${f.name}': hasCapability('${c}') should be false`).toBe(false);
        }
      });
    });
  }

  it("day scholar provably gets no hostel capability (the core split)", () => {
    const fixture = PERSONA_FIXTURES.find((f) => f.name === "day-scholar-in")!;
    const hostelCaps = ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"];
    for (const c of hostelCaps) {
      expect(hasCapability(fixture.role, fixture.ctx, c), `day scholar must not get '${c}'`).toBe(false);
    }
  });

  it("unknown capability → fail closed (never granted)", () => {
    const fixture = PERSONA_FIXTURES[0];
    expect(hasCapability(fixture.role, fixture.ctx, "nonexistent.cap")).toBe(false);
  });

  it("unknown role → empty projection (no crash)", () => {
    const { capabilities, visibleNav } = resolveRoleConfig("unknown_role", PERSONA_FIXTURES[0].ctx);
    expect(capabilities).toHaveLength(0);
    expect(visibleNav).toHaveLength(0);
  });
});
