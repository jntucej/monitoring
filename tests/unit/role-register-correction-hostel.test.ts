import { describe, expect, it } from "vitest";
import type { InspectionSection } from "@/components/shared/EntityInspector";
import { buildFacultyCorrectionInspection } from "@/lib/role-registers/facultyInspections";
import {
  buildHostelGateOccupancyInspection,
  buildHostelPermissionInspection,
} from "@/lib/role-registers/hostelInspections";

describe("role-register-faculty correction-requests inspection builder", () => {
  it("correction request row → overview + context + honest faculty inspect-only action", () => {
    const inspection = buildFacultyCorrectionInspection({
      id: "memo-101",
      ticket_number: "MEMO-2026-0042",
      workflow_type: "memo",
      current_stage: "faculty",
      status: "PENDING",
      sla_deadline: "2026-11-25T14:30:00Z",
      student: { name: "Ananya Roy", unique_id: "2024-EC-089" },
      requester: { id: "req-1", name: "Prof. Sen", role: "faculty" },
    });

    expect(inspection.kind).toBe("correction_request");
    expect(inspection.title).toContain("MEMO-2026-0042");
    expect(inspection.subtitle).toContain("Ananya Roy");
    expect(inspection.subtitle).toContain("Stage: faculty");
    expect(inspection.detailHref).toBe("/permissions/MEMO-2026-0042");
    expect(inspection.detailLabel).toBe("Open permission detail");

    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Context & Relationships")).toBe(true);
    const actionSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
    expect(actionSection).toBeDefined();
  });

  it("handles missing optional student/requester fields gracefully", () => {
    const inspection = buildFacultyCorrectionInspection({
      id: "memo-102",
      ticket_number: "MEMO-2026-0043",
      workflow_type: "memo",
      current_stage: "faculty",
      status: "PENDING",
    });

    expect(inspection.kind).toBe("correction_request");
    expect(inspection.title).toContain("MEMO-2026-0043");
    expect(inspection.subtitle).toContain("—");
  });
});

describe("role-register-hostel inspection builders", () => {
  it("hostel gate occupancy row → gate telemetry + overview + context", () => {
    const inspection = buildHostelGateOccupancyInspection({
      id: "gate-north",
      name: "North Gate",
      code: "NG-01",
      audience: "students",
      type: "turnstile",
      totalOnCampus: 85,
      roleCounts: { student: 80, warden: 5 },
    });

    expect(inspection.kind).toBe("gate_occupancy");
    expect(inspection.title).toBe("North Gate");
    expect(inspection.subtitle).toContain("NG-01");
    expect(inspection.subtitle).toContain("85 on campus");

    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Context & Relationships")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Actions")).toBe(true);
  });

  it("hostel permission row → overview + inspect-only note + permission detail link", () => {
    const inspection = buildHostelPermissionInspection({
      id: "perm-201",
      ticket_number: "HST-2026-8801",
      workflow_type: "hostel",
      current_stage: "caretaker",
      status: "PENDING",
      sla_deadline: "2026-11-24T18:00:00Z",
      student: {
        name: "Vikram Mehta",
        student_details: {
          roll: "2023-ME-112",
          hostel_block: "Block B",
        },
      },
    });

    expect(inspection.kind).toBe("hostel_permission");
    expect(inspection.title).toBe("Pass · HST-2026-8801");
    expect(inspection.subtitle).toContain("Vikram Mehta");
    expect(inspection.subtitle).toContain("Stage: caretaker");
    expect(inspection.detailHref).toBe("/permissions/HST-2026-8801");
    expect(inspection.detailLabel).toBe("Open permission detail");

    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Context & Relationships")).toBe(true);
    const actionSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
    expect(actionSection).toBeDefined();
  });

  it("handles missing student details in hostel permission gracefully", () => {
    const inspection = buildHostelPermissionInspection({
      id: "perm-202",
      ticket_number: "HST-2026-8802",
    });

    expect(inspection.kind).toBe("hostel_permission");
    expect(inspection.title).toBe("Pass · HST-2026-8802");
    expect(inspection.subtitle).toContain("—");
  });
});
