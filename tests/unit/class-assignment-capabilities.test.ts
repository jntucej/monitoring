/**
 * tests/unit/class-assignment-capabilities.test.ts — regression safety for the
 * class-confirmation + assignment capability gates (Flow A + Flow B).
 *
 * The config-driven model adds (universally true for the role):
 *   faculty : class.confirm, class.review.view, class.review.reply,
 *             assignment.view
 *   hod     : class.confirm.on_behalf, class.review.view
 *   principal : class.review.view
 *   student : assignment.view
 *
 * These must resolve through the single resolver (never branch in the UI),
 * and the fail-closed behavior must hold: an undeclared capability is denied.
 */
import { describe, it, expect } from "vitest";
import {
  resolveRoleConfig,
  hasCapability,
  type WorkspaceContext,
} from "../../src/config/roles/index";

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

const EMPTY = ctx();

describe("class-confirmation + assignment capabilities (Flow A/B regression)", () => {
  it("faculty gets the class.confirm + class.review + assignment.view gates", () => {
    for (const c of [
      "class.confirm",
      "class.review.view",
      "class.review.reply",
      "assignment.view",
    ]) {
      expect(hasCapability("faculty", EMPTY, c), `faculty should grant '${c}'`).toBe(true);
    }
  });

  it("hod gets the on-behalf confirmation gate + class.review.view", () => {
    expect(hasCapability("hod", EMPTY, "class.confirm.on_behalf")).toBe(true);
    expect(hasCapability("hod", EMPTY, "class.review.view")).toBe(true);
  });

  it("principal gets the class.review.view (overall satisfaction) gate", () => {
    expect(hasCapability("principal", EMPTY, "class.review.view")).toBe(true);
  });

  it("student gets the assignment.view gate", () => {
    expect(hasCapability("student", EMPTY, "assignment.view")).toBe(true);
  });

  it("a faculty does NOT get the HOD on-behalf gate (role separation)", () => {
    expect(hasCapability("faculty", EMPTY, "class.confirm.on_behalf")).toBe(false);
  });

  it("an undeclared capability is fail-closed for every role", () => {
    for (const role of ["faculty", "hod", "principal", "student"]) {
      expect(
        hasCapability(role, EMPTY, "nonexistent.capability"),
        `${role} must deny an undeclared capability (fail-closed)`,
      ).toBe(false);
    }
  });

  it("resolveRoleConfig surfaces the new capabilities in the projected set", () => {
    const { capabilities } = resolveRoleConfig("faculty", EMPTY);
    const caps = new Set(capabilities);
    expect(caps.has("class.confirm")).toBe(true);
    expect(caps.has("assignment.view")).toBe(true);
  });
});
