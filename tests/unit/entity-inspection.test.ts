import { describe, it, expect } from "vitest";

/**
 * Entity Inspection System — pure-model tests.
 *
 * The components (EntityInspector, HoverPreview) are React; the part that's
 * testable without a DOM is the *inspection model* itself: the standardized
 * shape every entity exposes. These tests pin that shape so a page that
 * forgets a section (e.g. "Actions" or "History") is caught in review.
 */

export interface InspectionSection {
  title: string;
  content: unknown;
  collapsible?: boolean;
}

export interface EntityInspectionModel {
  kind: string;
  title: string;
  subtitle?: string | null;
  status?: unknown;
  sections: InspectionSection[];
  detailHref?: string;
  detailLabel?: string;
}

/** Every entity inspection must expose the progressive-disclosure hierarchy. */
function assertHierarchy(model: EntityInspectionModel) {
  expect(model.kind).toBeTypeOf("string");
  expect(model.title).toBeTypeOf("string");
  expect(model.sections.length).toBeGreaterThanOrEqual(1);

  // The first section is always the quick overview (overview / what /
  // provenance / why — the "start here" layer of the hierarchy).
  expect(model.sections[0].title.toLowerCase()).toMatch(
    /overview|what|provenance|why|context/,
  );

  // Long sections must be collapsible (history / relationships).
  for (const s of model.sections) {
    if (/history|timeline|relations/i.test(s.title)) {
      expect(s.collapsible, `${s.title} must be collapsible`).toBe(true);
    }
  }

  // The deepest layer: a full-detail link (unless the panel IS the detail).
  if (!model.detailHref) {
    expect(
      model.sections.some((s) => /actions/i.test(s.title)),
      "must expose an Actions section or a detailHref",
    ).toBe(true);
  }
}

describe("entity inspection models", () => {
  it("student: overview → hostel → actions + full profile link", () => {
    const model: EntityInspectionModel = {
      kind: "student",
      title: "Priya Sharma",
      subtitle: "23JJ1A0599",
      status: "ACTIVE",
      sections: [
        { title: "Overview", content: null },
        { title: "Hostel", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/admin/students/23JJ1A0599",
      detailLabel: "View full profile",
    };
    assertHierarchy(model);
  });

  it("gate: overview → actions + telemetry link", () => {
    const model: EntityInspectionModel = {
      kind: "gate",
      title: "Main Gate",
      subtitle: "G-MAIN",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/admin/gates/g-1",
    };
    assertHierarchy(model);
  });

  it("alert: what → evidence → authority → actions (no full page — the panel is the detail)", () => {
    const model: EntityInspectionModel = {
      kind: "alert",
      title: "Critical breach at G-MAIN",
      subtitle: "Repeated badge scan",
      sections: [
        { title: "What happened", content: null },
        { title: "Evidence & timeline", content: null, collapsible: true },
        { title: "Responsible authority", content: null },
        { title: "Actions", content: null },
      ],
    };
    assertHierarchy(model);
  });

  it("decision: provenance → reason → timeline + audit link", () => {
    const model: EntityInspectionModel = {
      kind: "decision",
      title: "DEC-2027-0042",
      subtitle: "debar · principal",
      sections: [
        { title: "Provenance", content: null },
        { title: "Reason", content: null },
        { title: "Timeline", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
    };
    assertHierarchy(model);
  });

  it("rejects a model that omits the overview layer", () => {
    const bad: EntityInspectionModel = {
      kind: "student",
      title: "X",
      sections: [{ title: "Actions", content: null }],
      detailHref: "/x",
    };
    // The first section is not an overview → the hierarchy is broken.
    expect(() => assertHierarchy(bad)).toThrow();
  });

  it("rejects a non-collapsible history section", () => {
    const bad: EntityInspectionModel = {
      kind: "alert",
      title: "X",
      sections: [
        { title: "What happened", content: null },
        { title: "History", content: null }, // long + not collapsible
        { title: "Actions", content: null },
      ],
    };
    expect(() => assertHierarchy(bad)).toThrow();
  });

  it("department: overview → context → actions + register link", () => {
    const model: EntityInspectionModel = {
      kind: "department",
      title: "Computer Science",
      subtitle: "CSE",
      status: "82% present",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/people/departments",
      detailLabel: "View department register",
    };
    assertHierarchy(model);
  });

  it("hostel: overview → context → actions + oversight link", () => {
    const model: EntityInspectionModel = {
      kind: "hostel",
      title: "Block A",
      subtitle: "A",
      status: "ACTIVE",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/operations/hostel",
    };
    assertHierarchy(model);
  });

  it("incident: overview → context → timeline (collapsible) → actions (no detail page)", () => {
    const model: EntityInspectionModel = {
      kind: "incident",
      title: "Critical breach at G-MAIN",
      subtitle: "evt-123",
      status: "CRITICAL",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Timeline", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
    };
    assertHierarchy(model);
  });

  it("audit_event: overview → context → details (collapsible) → actions + audit trail link", () => {
    const model: EntityInspectionModel = {
      kind: "audit_event",
      title: "HOSTEL_APPROVAL",
      subtitle: "Dr. Iyer (principal)",
      status: "RECORDED",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Details", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/audit",
    };
    assertHierarchy(model);
  });

  it("delegation: overview → context → actions + delegation manager link", () => {
    const model: EntityInspectionModel = {
      kind: "delegation",
      title: "Delegation → Hostel Manager",
      subtitle: "hostel workflows",
      status: "ACTIVE",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/governance/delegations",
    };
    assertHierarchy(model);
  });

  it("exam_case: overview → context → actions + examination oversight link", () => {
    const model: EntityInspectionModel = {
      kind: "exam_case",
      title: "Priya Sharma — exam clearance",
      subtitle: "EXM-2027-014",
      status: "PENDING",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/examinations",
    };
    assertHierarchy(model);
  });

  it("report: overview → context → actions + governance reports link", () => {
    const model: EntityInspectionModel = {
      kind: "report",
      title: "hostel workflow volume",
      subtitle: "7-day digest",
      status: "12 this week",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/principal/governance/reports",
    };
    assertHierarchy(model);
  });

  it("approval: overview → context → actions + full ticket link", () => {
    const model: EntityInspectionModel = {
      kind: "approval",
      title: "P-1027 · hostel",
      subtitle: "Priya Sharma",
      status: "PENDING",
      sections: [
        { title: "Overview", content: null },
        { title: "Context", content: null },
        { title: "Actions", content: null },
        { title: "Workflow", content: null, collapsible: true },
      ],
      detailHref: "/approver/permissions/P-1027",
      detailLabel: "View full ticket",
    };
    assertHierarchy(model);
  });
});
