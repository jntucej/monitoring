/**
 * tests/unit/capabilities-golden.test.ts — golden snapshot tests for the
 * capability resolver (guardrail #10). The minimum persona/state matrix from
 * the architecture spec. If any expected capability changes, it must be a
 * REVIEWED change (bump CAPABILITY_REGISTRY_VERSION + update this matrix),
 * never an accident.
 *
 * These assert resolveCapabilities() directly — pure, no DB — so they run
 * in the vitest unit tier and guard against capability drift.
 */
import { describe, it, expect } from "vitest";
import {
  CAPABILITY_REGISTRY,
  CAPABILITY_REGISTRY_VERSION,
  resolveCapabilities,
  type WorkspaceContext,
} from "@/lib/capabilities";

/** Build a context fixture with the persona fields that matter. */
function ctx(over: Partial<WorkspaceContext> = {}): WorkspaceContext {
  return {
    personId: "test",
    roles: ["student"],
    personType: "student",
    residentialStatus: "day_scholar",
    gender: null,
    campusStatus: "in_campus",
    activeAuthorizations: [],
    activeApprovals: [],
    registryVersion: CAPABILITY_REGISTRY_VERSION,
    ...over,
  };
}

/** Expected capability sets per persona/state (the regression baseline). */
const GOLDEN: Array<{
  name: string;
  given: Partial<WorkspaceContext>;
  /** capabilities that MUST be present. */
  must: string[];
  /** capabilities that MUST be absent. */
  mustNot: string[];
}> = [
  {
    name: "Day scholar, IN campus",
    given: { residentialStatus: "day_scholar", campusStatus: "in_campus", roles: ["student"], personType: "student" },
    must: ["campus.status.view", "movement.view", "credential.view", "classes.view", "attendance.view", "day.out.request", "campus.exit"],
    mustNot: ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"],
  },
  {
    name: "Day scholar, OUT campus",
    given: { residentialStatus: "day_scholar", campusStatus: "out_campus", roles: ["student"], personType: "student" },
    must: ["campus.status.view", "movement.view", "credential.view", "campus.entry", "campus.exit", "day.out.request"],
    mustNot: ["hostel.leave.apply", "curfew.view"],
  },
  {
    name: "Hosteller, IN campus",
    given: { residentialStatus: "hosteller", campusStatus: "in_campus", roles: ["student"], personType: "student", hostel: { blockId: "GH-2", roomId: "12" } },
    must: ["hostel.leave.apply", "curfew.view", "hostel.leave.view", "hostel.occupancy.view", "mess.off.request"],
    mustNot: ["expected-return.view", "overstay.view", "return-gate.view", "day.out.request"],
  },
  {
    name: "Hosteller, OUT with active leave (return pending)",
    given: {
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      roles: ["student"],
      personType: "student",
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
      roles: ["student"],
      personType: "student",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: new Date(Date.now() - 3_600_000).toISOString() }],
    },
    must: ["overstay.view", "expected-return.view", "return-gate.view"],
    mustNot: ["hostel.leave.apply"],
  },
  {
    name: "Operator on shift",
    given: { roles: ["operator"], personType: "operator", currentShift: "day", assignedGate: "Gate 1", residentialStatus: "n_a", campusStatus: "in_campus" },
    must: ["gate.scan", "gate.live.view", "gate.exception.view", "gate.device.view"],
    mustNot: ["hostel.leave.apply", "incident.manage", "lockdown.act"],
  },
  {
    name: "Supervisor on shift",
    given: { roles: ["supervisor"], personType: "supervisor", currentShift: "day", residentialStatus: "n_a" },
    must: ["incident.manage", "escalation.resolve", "operator.manage", "gate.live.view", "lockdown.view"],
    mustNot: ["gate.scan", "hostel.leave.apply", "lockdown.act"],
  },
  {
    name: "Warden (principal) with pending hostel leave",
    given: {
      roles: ["principal"],
      personType: "principal",
      residentialStatus: "n_a",
      activeApprovals: [{ stage: "final_signoff", role: "principal", domain: "hostel" }],
    },
    must: ["approval.hostel.view", "approval.hostel.act", "campus.overview", "lockdown.act", "movement.trends.view"],
    mustNot: ["hostel.leave.apply", "gate.scan"],
  },
  {
    name: "Principal, no pending hostel approvals",
    given: { roles: ["principal"], personType: "principal", residentialStatus: "n_a", activeApprovals: [] },
    must: ["approval.hostel.view", "campus.overview", "lockdown.act"],
    mustNot: ["approval.hostel.act"], // nothing in scope to act on (guardrail #8)
  },
];

describe("capability resolver — golden persona matrix (guardrail #10)", () => {
  it("resolves the exact expected capability set per persona/state", () => {
    for (const g of GOLDEN) {
      const caps = new Set(resolveCapabilities(CAPABILITY_REGISTRY, ctx(g.given)));
      for (const c of g.must) {
        expect(caps.has(c), `${g.name}: expected capability '${c}' to be present`).toBe(true);
      }
      for (const c of g.mustNot) {
        expect(caps.has(c), `${g.name}: expected capability '${c}' to be ABSENT`).toBe(false);
      }
    }
  });

  it("day scholar never gets any hostel feature (the core split)", () => {
    const dayScholar = new Set(resolveCapabilities(CAPABILITY_REGISTRY, ctx({ residentialStatus: "day_scholar", campusStatus: "in_campus" })));
    const hostelCaps = ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"];
    for (const c of hostelCaps) expect(dayScholar.has(c), `day scholar must not get '${c}'`).toBe(false);
  });

  it("view ≠ act ≠ approve are separate (guardrail #6): a hostel approver sees the queue without the act cap when nothing is in scope", () => {
    const viewOnly = new Set(resolveCapabilities(CAPABILITY_REGISTRY, ctx({ roles: ["hostel_manager"], personType: "hostel_manager", residentialStatus: "n_a", activeApprovals: [] })));
    expect(viewOnly.has("approval.hostel.view")).toBe(true);
    expect(viewOnly.has("approval.hostel.act")).toBe(false);
  });

  it("fail-closed for security caps on an unknown/throwing condition (guardrail #2)", () => {
    const throwing = [
      { id: "x.security", kind: "security" as const, label: "s", when: () => { throw new Error("boom"); } },
      { id: "x.ux", kind: "ux" as const, label: "u", when: () => { throw new Error("boom"); } },
    ];
    const out = new Set(resolveCapabilities(throwing, ctx()));
    expect(out.has("x.security")).toBe(false); // security fails closed
    expect(out.has("x.ux")).toBe(true); // ux fails open
  });
});
