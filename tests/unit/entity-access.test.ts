import { describe, it, expect } from "vitest";
import {
  canInspectEntity,
  getFullPageRoute,
  ENTITY_ACCESS,
  type EntityKind,
} from "@/lib/entity-access";
import { ROLES, type Role } from "@/lib/roles";

/**
 * entity-access — pure-logic tests.
 *
 * Pins the role/kind access matrix and the "deepest layer" route resolver.
 * No DOM needed: these helpers are pure functions.
 */

const ADMIN = ROLES.ADMIN as Role;
const SYSADMIN = ROLES.SYSADMIN as Role;
const PRINCIPAL = ROLES.PRINCIPAL as Role;
const STUDENT = ROLES.STUDENT as Role;
const HOOD = ROLES.HOD as Role;
const OPERATOR = ROLES.OPERATOR as Role;

describe("canInspectEntity", () => {
  it("returns false for a nullish role regardless of kind", () => {
    expect(canInspectEntity(null, "student")).toBe(false);
    expect(canInspectEntity(undefined, "gate")).toBe(false);
    expect(canInspectEntity("", "ticket")).toBe(false);
  });

  it("allows admin/sysadmin for every entity kind", () => {
    for (const kind of Object.keys(ENTITY_ACCESS) as EntityKind[]) {
      expect(canInspectEntity(ADMIN, kind)).toBe(true);
      expect(canInspectEntity(SYSADMIN, kind)).toBe(true);
    }
  });

  it("student may inspect ticket and complaint only", () => {
    // Student is NOT in the `student` allowlist: a student cannot browse the
    // roster of other students, but they can inspect their own complaint and ticket.
    expect(canInspectEntity(STUDENT, "student")).toBe(false);
    expect(canInspectEntity(STUDENT, "ticket")).toBe(true);
    expect(canInspectEntity(STUDENT, "complaint")).toBe(true);
    expect(canInspectEntity(STUDENT, "gate")).toBe(false);
    expect(canInspectEntity(STUDENT, "faculty")).toBe(false);
    expect(canInspectEntity(STUDENT, "case")).toBe(false);
    expect(canInspectEntity(STUDENT, "alert")).toBe(false);
  });

  it("hod may inspect faculty and student but not case", () => {
    expect(canInspectEntity(HOOD, "faculty")).toBe(true);
    expect(canInspectEntity(HOOD, "student")).toBe(true);
    expect(canInspectEntity(HOOD, "case")).toBe(false);
    expect(canInspectEntity(HOOD, "alert")).toBe(false);
  });

  it("operator may inspect gate and ticket but not student", () => {
    expect(canInspectEntity(OPERATOR, "gate")).toBe(true);
    expect(canInspectEntity(OPERATOR, "ticket")).toBe(true);
    expect(canInspectEntity(OPERATOR, "student")).toBe(false);
  });

  it("principal may inspect case and student; not alert", () => {
    expect(canInspectEntity(PRINCIPAL, "case")).toBe(true);
    expect(canInspectEntity(PRINCIPAL, "student")).toBe(true);
    expect(canInspectEntity(PRINCIPAL, "alert")).toBe(false); // admin/sysadmin/supervisor only
  });
});

describe("getFullPageRoute", () => {
  it("returns null for a nullish role", () => {
    expect(getFullPageRoute(null, "ticket", "t-1")).toBeNull();
    expect(getFullPageRoute(undefined, "complaint", "c-1")).toBeNull();
  });

  it("returns null for an empty id", () => {
    expect(getFullPageRoute(ADMIN, "ticket", "")).toBeNull();
  });

  it("resolves ticket routes by role", () => {
    expect(getFullPageRoute(STUDENT, "ticket", "TKT-100")).toBe("/student/passes/TKT-100");
    expect(getFullPageRoute(ROLES.GUARDIAN as Role, "ticket", "TKT-100")).toBe(
      "/permissions/TKT-100",
    );
    expect(getFullPageRoute(PRINCIPAL, "ticket", "TKT-100")).toBe("/permissions/TKT-100");
    expect(getFullPageRoute(ADMIN, "ticket", "TKT-100")).toBe("/permissions/TKT-100");
  });

  it("resolves complaint routes for approvers and student", () => {
    expect(getFullPageRoute(ROLES.CARETAKER as Role, "complaint", "C-1")).toBe(
      "/caretaker/complaints/C-1",
    );
    expect(getFullPageRoute(STUDENT, "complaint", "C-1")).toBe("/student/complaints/C-1");
    // admin has no dedicated complaint detail route in this module — null.
    expect(getFullPageRoute(ADMIN, "complaint", "C-1")).toBeNull();
  });

  it("resolves student/faculty/gate detail routes only for admin or sysadmin", () => {
    expect(getFullPageRoute(ADMIN, "student", "s-1")).toBe("/admin/students/s-1");
    expect(getFullPageRoute(SYSADMIN, "faculty", "f-1")).toBe("/admin/faculty/f-1");
    expect(getFullPageRoute(ADMIN, "gate", "g-1")).toBe("/admin/gates/g-1");
    // Not admin/sysadmin → null even if the role can inspect the kind.
    expect(getFullPageRoute(HOOD, "student", "s-1")).toBeNull();
    expect(getFullPageRoute(OPERATOR, "gate", "g-1")).toBeNull();
  });

  it("resolves case route only for principal", () => {
    expect(getFullPageRoute(PRINCIPAL, "case", "case-9")).toBe("/principal/cases/case-9");
    expect(getFullPageRoute(ADMIN, "case", "case-9")).toBeNull();
  });

  it("returns null for device and alert kinds (no deepest-layer page)", () => {
    expect(getFullPageRoute(ADMIN, "device", "d-1")).toBeNull();
    expect(getFullPageRoute(SYSADMIN, "alert", "a-1")).toBeNull();
  });
});
