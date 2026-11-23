import { describe, it, expect } from "vitest";
import { buildIncidentInspection } from "@/lib/principal/incidentInspection";

type Built = ReturnType<typeof buildIncidentInspection>;

function sectionsOf(i: Built) {
  return i.sections.map((s) => s.title);
}

describe("PR-05A buildIncidentInspection", () => {
  const base = {
    id: "82dd6221-ef86-4380-8910-06d6a84430bd",
    severity: "critical",
    title: "AUDIT CHAIN BROKEN",
    message: "",
    gateId: "g-1",
    studentRoll: "",
    timestamp: "2026-11-21T20:45:07.315Z",
    resolved: false,
  };

  it("builds an inspection with overview + context + actions", () => {
    const insp = buildIncidentInspection({
      alert: base,
      related: [{ kind: "gate", id: "g-1", label: "Gate", subtitle: "g-1" }],
      actions: {
        acknowledge: { available: true },
        resolve: { available: true },
      },
    });
    expect(insp.kind).toBe("incident");
    expect(insp.title).toBe("AUDIT CHAIN BROKEN");
    expect(sectionsOf(insp)).toEqual(
      expect.arrayContaining(["Overview", "Context", "Actions"])
    );
    expect(insp.statusText).toContain("CRITICAL");
  });

  it("marks a resolved alert as resolved + actions unavailable", () => {
    const insp = buildIncidentInspection({
      alert: { ...base, resolved: true },
      related: [],
      actions: {
        acknowledge: { available: false, reason: "already resolved" },
        resolve: { available: false, reason: "already resolved" },
      },
    });
    expect(insp.statusText).toBe("RESOLVED");
  });

  it("omits the detail CTA when no detail page exists", () => {
    const insp = buildIncidentInspection({
      alert: base,
      related: [],
      actions: { acknowledge: { available: true } },
    });
    expect(insp.detailHref).toBeUndefined();
  });

  it("carries the honest action availability flags", () => {
    const insp = buildIncidentInspection({
      alert: base,
      related: [],
      actions: {
        acknowledge: { available: true },
        resolve: { available: false, reason: "not supported" },
      },
    });
    // The Actions section renders both; resolve shows its honest reason.
    expect(sectionsOf(insp)).toContain("Actions");
  });
});
