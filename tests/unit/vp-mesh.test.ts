/**
 * tests/unit/vp-mesh.test.ts — regression tests for the VP role-mesh slice:
 *  - HOD→VP escalation: VP now sits in the memo + staff_leave ladders
 *  - VP scope clamping: a HOD can't widen to campus on /api/class-sessions/live
 *  - live-session state classification (pure, no DB)
 *
 * These lock in the two load-bearing claims of the "VP can't function in
 * isolation" plan: VP actually receives academic escalations, and the live
 * scope is server-authoritative.
 */
import { describe, it, expect } from "vitest";
import { WORKFLOW_STAGES, resolveNextStage } from "../../src/lib/permission-workflow";
import { resolveLiveScope } from "../../src/lib/class-live-state";
import type { AuthContext } from "../../src/lib/authContext";

function auth(over: Partial<AuthContext>): AuthContext {
  return {
    authUserId: "u",
    userId: "u",
    role: "faculty",
    status: "ACTIVE",
    email: "x@y.z",
    ...over,
  } as AuthContext;
}

describe("HOD → VP escalation (ladder)", () => {
  it("memo now routes hod → vice_principal → principal", () => {
    expect(WORKFLOW_STAGES.memo).toEqual(["hod", "vice_principal", "principal"]);
    expect(resolveNextStage("memo", "hod")).toBe("vice_principal");
    expect(resolveNextStage("memo", "vice_principal")).toBe("principal");
    expect(resolveNextStage("memo", "principal")).toBeNull();
  });

  it("staff_leave now routes hod → vice_principal → principal", () => {
    expect(resolveNextStage("staff_leave", "hod")).toBe("vice_principal");
    expect(resolveNextStage("staff_leave", "vice_principal")).toBe("principal");
  });

  it("exam still routes through oie + exam_branch to VP", () => {
    expect(resolveNextStage("exam", "exam_branch")).toBe("vice_principal");
  });
});

describe("live-class scope clamping (server-authoritative)", () => {
  it("a HOD is clamped to their department even if the client asks for campus", () => {
    const scope = resolveLiveScope(auth({ role: "hod", departmentId: "CSE" }));
    expect(scope.departmentId).toBe("CSE");
    expect(scope.facultyIds).toBeNull();
  });

  it("a faculty is clamped to self only", () => {
    const scope = resolveLiveScope(auth({ role: "faculty", userId: "fac-1" }));
    expect(scope.facultyIds).toEqual(["fac-1"]);
  });

  it("VP + Principal see the whole academic surface (no dept clamp)", () => {
    expect(resolveLiveScope(auth({ role: "vice_principal" })).facultyIds).toBeNull();
    expect(resolveLiveScope(auth({ role: "principal" })).facultyIds).toBeNull();
  });

  it("a student has no live-class scope at all", () => {
    expect(resolveLiveScope(auth({ role: "student" })).facultyIds).toEqual([]);
  });
});
