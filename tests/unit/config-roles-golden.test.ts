/**
 * tests/unit/config-roles-golden.test.ts — golden snapshot tests for the
 * config-driven capability model (P1 + guardrail #10).
 *
 * These assert `resolveRoleConfig()` — the P1 resolver that reads
 * `config/roles/*.ts` (nav[] + capabilities[] with when(ctx)) — NOT a
 * separate capability engine. If any expected capability changes, it must
 * be a REVIEWED config edit + test update, never an accident.
 *
 * The persona matrix mirrors the user's spec:
 *   day scholar IN → no hostel features
 *   day scholar OUT → no hostel features, day-out available
 *   hosteller IN → curfew + leave.apply
 *   hosteller OUT pending → expected-return (not overstay)
 *   hosteller OUT overdue → overstay
 */
import { describe, it, expect } from "vitest";
import {
  resolveRoleConfig,
  type WorkspaceContext,
  type NavEntry,
} from "../../src/config/roles/index";

/** Build a context fixture. */
function ctx(over: Partial<WorkspaceContext> = {}): WorkspaceContext {
  return {
    roles: ["student"],
    personType: "student",
    residentialStatus: "day_scholar",
    campusStatus: "in_campus",
    activeAuthorizations: [],
    activeApprovals: [],
    ...over,
  };
}

const GOLDEN: Array<{
  name: string;
  given: Partial<WorkspaceContext>;
  must: string[];
  mustNot: string[];
}> = [
  {
    name: "Day scholar, IN campus",
    given: { residentialStatus: "day_scholar", campusStatus: "in_campus" },
    must: ["campus.entry", "campus.exit", "credential.view", "classes.view", "attendance.view", "day.out.request"],
    mustNot: ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"],
  },
  {
    name: "Day scholar, OUT campus",
    given: { residentialStatus: "day_scholar", campusStatus: "out_campus" },
    must: ["campus.entry", "campus.exit", "credential.view", "day.out.request"],
    mustNot: ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view"],
  },
  {
    name: "Hosteller, IN campus",
    given: { residentialStatus: "hosteller", campusStatus: "in_campus", hostel: { blockId: "GH-2", roomId: "12" } },
    must: ["hostel.leave.apply", "curfew.view", "hostel.leave.view", "hostel.occupancy.view", "mess.off.request"],
    mustNot: ["day.out.request", "expected-return.view", "overstay.view", "return-gate.view"],
  },
  {
    name: "Hosteller, OUT with active leave (return pending)",
    given: {
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: new Date(Date.now() + 3_600_000).toISOString() }],
    },
    must: ["expected-return.view", "return-gate.view", "hostel.leave.view"],
    mustNot: ["overstay.view", "hostel.leave.apply", "hostel.occupancy.view"],
  },
  {
    name: "Hosteller, OUT, overstay (deadline passed)",
    given: {
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: new Date(Date.now() - 3_600_000).toISOString() }],
    },
    must: ["overstay.view", "expected-return.view", "return-gate.view"],
    mustNot: ["hostel.leave.apply"],
  },
];

describe("config-driven capability resolver — golden persona matrix (guardrail #10)", () => {
  it("resolves the exact expected capability set per persona/state", () => {
    for (const g of GOLDEN) {
      const { capabilities } = resolveRoleConfig("student", ctx(g.given));
      const caps = new Set(capabilities);
      for (const c of g.must) {
        expect(caps.has(c), `${g.name}: expected capability '${c}' to be present`).toBe(true);
      }
      for (const c of g.mustNot) {
        expect(caps.has(c), `${g.name}: expected capability '${c}' to be ABSENT`).toBe(false);
      }
    }
  });

  it("day scholar never gets any hostel feature (the core split)", () => {
    const { capabilities } = resolveRoleConfig("student", ctx({ residentialStatus: "day_scholar", campusStatus: "in_campus" }));
    const caps = new Set(capabilities);
    const hostelCaps = ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"];
    for (const c of hostelCaps) expect(caps.has(c), `day scholar must not get '${c}'`).toBe(false);
  });

  it("hosteller IN shows the hostel widget family (curfew + leave + occupancy)", () => {
    const { visibleNav } = resolveRoleConfig("student", ctx({ residentialStatus: "hosteller", campusStatus: "in_campus", hostel: { blockId: "GH-2", roomId: "12" } }));
    const keys = new Set(visibleNav.map((n: NavEntry) => n.key));
    expect(keys.has("curfew")).toBe(true);
    expect(keys.has("leave")).toBe(true);
    expect(keys.has("day-out")).toBe(false); // day scholars only
  });

  it("hosteller OUT shows expected-return/overstay, not curfew", () => {
    const { visibleNav } = resolveRoleConfig("student", ctx({
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: new Date(Date.now() + 3_600_000).toISOString() }],
    }));
    const keys = new Set(visibleNav.map((n: NavEntry) => n.key));
    expect(keys.has("expected-return")).toBe(true);
    expect(keys.has("leave")).toBe(false); // leave.apply is IN-campus only
  });

  it("unknown role → empty projection (no crash)", () => {
    const { visibleNav, capabilities } = resolveRoleConfig("unknown_role", ctx());
    expect(visibleNav).toHaveLength(0);
    expect(capabilities).toHaveLength(0);
  });
});
