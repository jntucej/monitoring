/**
 * tests/unit/nav-snapshots.test.ts — Layer 2: nav visibility per persona.
 *
 * Tests the ACTUAL student shell nav (`_shell/nav.ts`) against the fixture
 * personas. This is where "if a PR accidentally shows `leave` to a day
 * scholar, this test fails and the diff shows which nav keys changed."
 *
 * It builds the shell's NavContext slice from the fixture ctx, evaluates the
 * `when(ctx)` predicates, and checks the visible keys.
 */
import { describe, it, expect } from "vitest";
import { STUDENT_NAV } from "../../src/app/(student)/student/_shell/nav";
import type { NavContext, NavEntry, NavChild } from "../../src/components/shell/types";
import { PERSONA_FIXTURES, type PersonaFixture } from "../capabilities/fixtures";

/** Map a fixture's WorkspaceContext to the shell's NavContext slice. */
function toNavCtx(f: PersonaFixture): NavContext {
  return {
    roles: f.ctx.roles,
    personType: f.ctx.personType,
    residentialStatus: f.ctx.residentialStatus,
    campusStatus: f.ctx.campusStatus,
  };
}

/** All nav keys (top-level link hrefs + group ids + child hrefs) that pass `when(ctx)`. */
function visibleNavKeys(nav: NavEntry[], ctx?: NavContext): Set<string> {
  const out = new Set<string>();
  for (const entry of nav) {
    // group: the `when` on the group itself
    if (entry.kind === "group") {
      if (ctx && entry.when) {
        try {
          if (!entry.when(ctx)) continue; // whole group hidden
        } catch {
          continue; // security group fails closed
        }
      }
      // children
      for (const child of entry.children as NavChild[]) {
        let show = true;
        if (ctx && child.when) {
          try {
            show = child.when(ctx);
          } catch {
            show = true; // children are cosmetic (fail-open)
          }
        }
        if (show) out.add(child.href);
      }
      // also register the group id as a visible key
      out.add(entry.id);
    } else {
      // link
      let show = true;
      if (ctx && entry.when) {
        try {
          show = entry.when(ctx);
        } catch {
          // links are cosmetic (fail-open); only security-kind items fail closed.
          show = true;
        }
      }
      if (show) out.add(entry.href);
    }
  }
  return out;
}

describe("Layer 2 — nav visibility per persona (from fixtures)", () => {
  for (const f of PERSONA_FIXTURES) {
    it(`nav keys for ${f.name}`, () => {
      const navCtx = toNavCtx(f);
      const visible = visibleNavKeys(STUDENT_NAV, navCtx);

      for (const key of f.expectedNavKeys) {
        expect(visible.has(key), `'${f.name}': expected nav key '${key}' to be visible`).toBe(true);
      }
      for (const key of f.forbiddenNavKeys) {
        expect(visible.has(key), `'${f.name}': expected nav key '${key}' to be HIDDEN`).toBe(false);
      }
    });
  }

  it("day scholar's sidebar never shows the hostel Permissions group", () => {
    const fixture = PERSONA_FIXTURES.find((x) => x.name === "day-scholar-in")!;
    const visible = visibleNavKeys(STUDENT_NAV, toNavCtx(fixture));
    expect(visible.has("/student/permissions"), "day scholar must not see hostel Permissions").toBe(false);
    expect(visible.has("/student/passes"), "day scholar must not see Passes").toBe(false);
  });

  it("hosteller's sidebar shows the hostel Permissions group", () => {
    const fixture = PERSONA_FIXTURES.find((x) => x.name === "hosteller-in")!;
    const visible = visibleNavKeys(STUDENT_NAV, toNavCtx(fixture));
    expect(visible.has("permissions"), "hosteller sees the Permissions group").toBe(true);
    expect(visible.has("/student/passes"), "hosteller sees Passes").toBe(true);
  });
});
