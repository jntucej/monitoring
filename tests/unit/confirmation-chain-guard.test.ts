/**
 * tests/unit/confirmation-chain-guard.test.ts — the hostel-vs-academic
 * segregation guardrail (src/lib/confirmations/chains.ts).
 *
 * The docs keep emphasising: NO academic role (faculty/hod/dean/exam-*) may
 * ever appear in a hostel chain (leave, gate_pass, hostel_room_allot,
 * mess_bill). validateChain() throws on any such inclusion. This locks that
 * in so a bad chain seed or a bad request fails fast, before a permission
 * row is written.
 */
import { describe, it, expect } from "vitest";
import {
  validateChain,
  ChainValidationError,
} from "../../src/lib/confirmations/chains";

describe("confirmation chain guardrail", () => {
  it("allows a pure hostel chain", () => {
    // guardian → deputy_warden → supervisor is the canonical gate_pass chain.
    expect(() =>
      validateChain("gate_pass", [
        { role: "guardian" },
        { role: "deputy_warden" },
        { role: "supervisor" },
      ])
    ).not.toThrow();
  });

  it("allows a pure academic chain (no guard applies)", () => {
    // marks_entry: faculty → hod is fine (academic, not a hostel entity).
    expect(() =>
      validateChain("marks_entry", [{ role: "faculty" }, { role: "hod" }])
    ).not.toThrow();
  });

  it("throws when a hostel chain includes faculty", () => {
    expect(() =>
      validateChain("leave", [
        { role: "deputy_warden" },
        { role: "faculty" }, // ← academic role in a hostel chain
      ])
    ).toThrow(ChainValidationError);
  });

  it("throws when a mess_bill chain includes hod", () => {
    expect(() =>
      validateChain("mess_bill", [
        { role: "mess_incharge" },
        { role: "hod" }, // ← violation
      ])
    ).toThrow(ChainValidationError);
  });

  it("throws when gate_pass includes dean", () => {
    expect(() =>
      validateChain("gate_pass", [{ role: "guardian" }, { role: "dean" }])
    ).toThrow(/must not include academic role 'dean'/);
  });

  it("ignores non-hostel entity types even with academic roles", () => {
    // exam_result is academic; exam_branch/controller are fine, no throw.
    expect(() =>
      validateChain("exam_result", [
        { role: "exam_branch" },
        { role: "controller_examinations" },
      ])
    ).not.toThrow();
  });
});
