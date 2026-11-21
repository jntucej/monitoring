/**
 * tests/capabilities/fixtures.ts — the single source of persona fixtures.
 *
 * One data file drives THREE test suites (per the plan §2):
 *   - tests/unit/config-roles-golden.test.ts   (resolver units)
 *   - tests/unit/nav-snapshots.test.ts          (nav snapshot per persona)
 *   - tests/unit/api-capability-enforcement.test.ts (API enforcement)
 *
 * If a new persona is needed, add ONE row here — all three suites gain
 * coverage automatically. A PR that adds a `when()` condition without
 * touching this file fails the resolver coverage check.
 *
 * The fixtures are PURE data (no DB, no React). Each one carries:
 *   - name: human label
 *   - ctx: the WorkspaceContext
 *   - role: the role id to resolve
 *   - expectedCaps: capability ids that MUST be present
 *   - forbiddenCaps: capability ids that MUST be absent
 *   - expectedNavKeys: nav keys that MUST be visible (for the nav snapshot)
 *   - forbiddenNavKeys: nav keys that MUST be hidden
 */
import type { WorkspaceContext } from "../../src/config/roles/types";

/** Helper: a base student context. */
export function studentCtx(over: Partial<WorkspaceContext> = {}): WorkspaceContext {
  return {
    roles: ["student"],
    personType: "student",
    residentialStatus: "day_scholar",
    campusStatus: "unknown",
    activeAuthorizations: [],
    activeApprovals: [],
    ...over,
  };
}

export interface PersonaFixture {
  name: string;
  role: string;
  ctx: WorkspaceContext;
  /** capability ids that MUST be present. */
  expectedCaps: string[];
  /** capability ids that MUST be absent. */
  forbiddenCaps: string[];
  /** nav keys that MUST be visible in the student shell. */
  expectedNavKeys: string[];
  /** nav keys that MUST be hidden in the student shell. */
  forbiddenNavKeys: string[];
  /** for API enforcement: the routes this persona should be DENIED. */
  deniedRoutes: string[];
}

const future = () => new Date(Date.now() + 3_600_000).toISOString();
const past = () => new Date(Date.now() - 3_600_000).toISOString();

export const PERSONA_FIXTURES: PersonaFixture[] = [
  {
    name: "day-scholar-in",
    role: "student",
    ctx: studentCtx({ residentialStatus: "day_scholar", campusStatus: "in_campus" }),
    expectedCaps: ["campus.entry", "campus.exit", "credential.view", "classes.view", "attendance.view", "day.out.request"],
    forbiddenCaps: ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view", "mess.off.request"],
    // Shell nav keys: link hrefs + group ids + child hrefs that should be VISIBLE.
    expectedNavKeys: ["/student", "mess", "campus", "support", "account"],
    forbiddenNavKeys: ["permissions", "/student/permissions", "/student/passes"],
    deniedRoutes: ["/api/permissions"],
  },
  {
    name: "day-scholar-out",
    role: "student",
    ctx: studentCtx({ residentialStatus: "day_scholar", campusStatus: "out_campus" }),
    expectedCaps: ["campus.entry", "campus.exit", "credential.view", "day.out.request"],
    forbiddenCaps: ["hostel.leave.apply", "curfew.view", "hostel.occupancy.view", "expected-return.view", "overstay.view"],
    expectedNavKeys: ["/student", "mess", "campus", "support", "account"],
    forbiddenNavKeys: ["permissions", "/student/permissions", "/student/passes"],
    deniedRoutes: ["/api/permissions"],
  },
  {
    name: "hosteller-in",
    role: "student",
    ctx: studentCtx({
      residentialStatus: "hosteller",
      campusStatus: "in_campus",
      hostel: { blockId: "GH-2", roomId: "12" },
    }),
    expectedCaps: ["hostel.leave.apply", "curfew.view", "hostel.leave.view", "hostel.occupancy.view", "mess.off.request"],
    forbiddenCaps: ["day.out.request", "expected-return.view", "overstay.view", "return-gate.view"],
    expectedNavKeys: ["/student", "permissions", "/student/permissions", "/student/passes", "mess", "campus", "support", "account"],
    forbiddenNavKeys: [],
    deniedRoutes: [],
  },
  {
    name: "hosteller-out-pending",
    role: "student",
    ctx: studentCtx({
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: future() }],
    }),
    expectedCaps: ["expected-return.view", "return-gate.view", "hostel.leave.view"],
    forbiddenCaps: ["overstay.view", "hostel.leave.apply", "hostel.occupancy.view"],
    expectedNavKeys: ["/student", "permissions", "/student/permissions", "/student/passes", "mess", "campus", "support", "account"],
    forbiddenNavKeys: [],
    deniedRoutes: [],
  },
  {
    name: "hosteller-out-overdue",
    role: "student",
    ctx: studentCtx({
      residentialStatus: "hosteller",
      campusStatus: "out_campus",
      activeAuthorizations: [{ kind: "hostel_leave", code: "p1", status: "active", expectedReturnAt: past() }],
    }),
    expectedCaps: ["overstay.view", "expected-return.view", "return-gate.view"],
    forbiddenCaps: ["hostel.leave.apply", "hostel.occupancy.view"],
    expectedNavKeys: ["/student", "permissions", "/student/permissions", "/student/passes", "mess", "campus", "support", "account"],
    forbiddenNavKeys: [],
    deniedRoutes: [],
  },
];

/** The API routes each persona should be DENIED (for the enforcement layer). */
export function routesDeniedFor(fixture: PersonaFixture): string[] {
  return fixture.deniedRoutes;
}
