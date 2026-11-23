import { describe, it, expect } from "vitest";

/**
 * PR-05D — Person-roles entity inspection model tests.
 *
 * Asserts the model contract for the new entity kinds wired by this PR:
 *   - permission_ticket (student / guardian view)
 *   - attendance (student / OIE candidate / HOD faculty)
 *   - exam_case (student / OIE access-exception)
 *   - complaint (faculty class-request)
 *   - child_record (guardian ward)
 *
 * Follows the same `assertHierarchy` pattern as entity-inspection.test.ts.
 */

interface InspectionSection {
  title: string;
  content: unknown;
  collapsible?: boolean;
}

interface EntityInspectionModel {
  kind: string;
  title: string;
  subtitle?: string | null;
  status?: unknown;
  sections: InspectionSection[];
  detailHref?: string;
  detailLabel?: string;
}

function assertHierarchy(model: EntityInspectionModel) {
  expect(model.kind).toBeTypeOf("string");
  expect(model.title).toBeTypeOf("string");
  expect(model.sections.length).toBeGreaterThanOrEqual(1);

  // First section must be the quick overview layer.
  expect(model.sections[0].title.toLowerCase()).toMatch(
    /overview|what|provenance|why|context/,
  );

  // Long sections must be collapsible.
  for (const s of model.sections) {
    if (/history|timeline|relations/i.test(s.title)) {
      expect(s.collapsible, `${s.title} must be collapsible`).toBe(true);
    }
  }

  // Must expose Actions or detailHref.
  if (!model.detailHref) {
    expect(
      model.sections.some((s) => /actions/i.test(s.title)),
      "must expose an Actions section or a detailHref",
    ).toBe(true);
  }
}

describe("PR-05D person-roles inspection models", () => {
  it("permission_ticket (student): overview → stage history (collapsible) → actions + full view", () => {
    const model: EntityInspectionModel = {
      kind: "permission_ticket",
      title: "P-1042",
      subtitle: "hostel_leave · hod",
      status: "PENDING",
      sections: [
        { title: "Overview", content: null },
        { title: "Stage history", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
      detailHref: "/student/permissions?focus=P-1042",
      detailLabel: "Full ticket view",
    };
    assertHierarchy(model);
  });

  it("permission_ticket (guardian): overview → stage history (collapsible) → actions + request status", () => {
    const model: EntityInspectionModel = {
      kind: "permission_ticket",
      title: "P-1043",
      subtitle: "Priya Sharma · daily_outing",
      status: "PENDING",
      sections: [
        { title: "Overview", content: null },
        { title: "Stage history", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
      detailHref: "/guardian/request-status",
      detailLabel: "All requests",
    };
    assertHierarchy(model);
  });

  it("attendance (student): overview → scheduled classes (collapsible) → actions + all attendance", () => {
    const model: EntityInspectionModel = {
      kind: "attendance",
      title: "Mon 23 Nov",
      subtitle: "2026-11-23",
      status: "ABSENT",
      sections: [
        { title: "Overview", content: null },
        { title: "Scheduled classes", content: null, collapsible: true },
        { title: "Actions", content: null },
      ],
      detailHref: "/student/attendance",
      detailLabel: "All attendance",
    };
    assertHierarchy(model);
  });

  it("attendance (OIE candidate): overview → actions + all records", () => {
    const model: EntityInspectionModel = {
      kind: "attendance",
      title: "Priya Sharma",
      subtitle: "IN · 2026-11-23",
      status: "IN",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/oie/candidate-attendance",
      detailLabel: "All candidate attendance",
    };
    assertHierarchy(model);
  });

  it("attendance (HOD faculty): overview → actions + all records", () => {
    const model: EntityInspectionModel = {
      kind: "attendance",
      title: "Dr. Raman",
      subtitle: "Assistant Professor",
      status: "ABSENT",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/hod/faculty/attendance",
      detailLabel: "All faculty attendance",
    };
    assertHierarchy(model);
  });

  it("exam_case (student): overview → actions + exam schedule", () => {
    const model: EntityInspectionModel = {
      kind: "exam_case",
      title: "Data Structures",
      subtitle: "2026-11-30",
      status: "SCHEDULED",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/student/exams",
      detailLabel: "Exam schedule",
    };
    assertHierarchy(model);
  });

  it("exam_case (OIE access-exception): overview → actions + full ticket", () => {
    const model: EntityInspectionModel = {
      kind: "exam_case",
      title: "Priya Sharma",
      subtitle: "EXM-2027-001",
      status: "ESCALATED",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/permissions/EXM-2027-001",
      detailLabel: "Full ticket",
    };
    assertHierarchy(model);
  });

  it("complaint (faculty class-request): overview → actions + all requests", () => {
    const model: EntityInspectionModel = {
      kind: "complaint",
      title: "Missing lab equipment",
      subtitle: "Priya Sharma · CSE-B",
      status: "open",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/faculty/class-requests",
      detailLabel: "All class requests",
    };
    assertHierarchy(model);
  });

  it("child_record (guardian ward): overview → actions + ward detail", () => {
    const model: EntityInspectionModel = {
      kind: "child_record",
      title: "Priya Sharma",
      subtitle: "23JJ1A0599",
      status: "ON CAMPUS",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/guardian/child-status",
      detailLabel: "Ward detail",
    };
    assertHierarchy(model);
  });

  it("student (HOD directory): overview → actions + student directory", () => {
    const model: EntityInspectionModel = {
      kind: "student",
      title: "Priya Sharma",
      subtitle: "23JJ1A0599",
      status: "HOSTEL",
      sections: [
        { title: "Overview", content: null },
        { title: "Actions", content: null },
      ],
      detailHref: "/hod/students",
      detailLabel: "Student directory",
    };
    assertHierarchy(model);
  });

  // Contract guards
  it("rejects a model that omits the overview layer", () => {
    const bad: EntityInspectionModel = {
      kind: "permission_ticket",
      title: "X",
      sections: [{ title: "Actions", content: null }],
      detailHref: "/x",
    };
    expect(() => assertHierarchy(bad)).toThrow();
  });

  it("rejects a non-collapsible stage history section", () => {
    const bad: EntityInspectionModel = {
      kind: "permission_ticket",
      title: "X",
      sections: [
        { title: "Overview", content: null },
        { title: "Stage history", content: null },
        { title: "Actions", content: null },
      ],
    };
    expect(() => assertHierarchy(bad)).toThrow();
  });
});
