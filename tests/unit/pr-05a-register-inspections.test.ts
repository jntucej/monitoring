import { describe, expect, it } from "vitest";
import {
  buildGateInspection,
  buildHostelInspection,
  buildDepartmentInspection,
  buildDelegationInspection,
  buildExamInspection,
  buildAuditInspection,
} from "@/lib/principal/registerInspections";

describe("register inspection builders (PR-05A)", () => {
  it("gate row → overview + gate-detail action", () => {
    const i = buildGateInspection({ id: "g1", name: "Main Gate", code: "G1", status: "ACTIVE" });
    expect(i.kind).toBe("gate");
    expect(i.title).toBe("Main Gate");
    expect(i.detailHref).toContain("/principal/operations/gates");
    expect(i.sections[0].title).toBe("Overview");
  });

  it("hostel row → overview + hostel-activity action", () => {
    const i = buildHostelInspection({ name: "Hostel A", capacity: 120, occupied: 95 });
    expect(i.kind).toBe("hostel");
    expect(i.sections.some((s) => s.title === "Overview")).toBe(true);
    expect(i.detailHref).toContain("/principal/operations/hostel");
  });

  it("department row → faculty/student/attendance + pending-matters action", () => {
    const i = buildDepartmentInspection({
      code: "CSE",
      name: "Computer Science",
      hodName: "Dr. X",
      faculty: 12,
      students: 300,
      ratio: 25,
      attendancePct: 84,
    });
    expect(i.kind).toBe("department");
    expect(i.detailHref).toContain("/principal/people/departments");
  });

  it("delegation row → scope/expiry + review action", () => {
    const i = buildDelegationInspection({
      id: "d1",
      delegate_role: "exams",
      scope: "full",
      status: "ACTIVE",
      expires_at: null,
    });
    expect(i.kind).toBe("delegation");
    expect(i.detailHref).toContain("/principal/governance/delegations");
    expect(i.subtitle).toBe("full");
  });

  it("exam exception row → student/reason + case-review action", () => {
    const i = buildExamInspection({ id: "e1", ticket_number: "T-9", student_name: "Ravi", reason: "Clearance", status: "PENDING" });
    expect(i.kind).toBe("exam_case");
    expect(i.title).toContain("Ravi");
    expect(i.detailHref).toContain("/principal/examinations");
  });

  it("audit event row → actor/role/details", () => {
    const i = buildAuditInspection({ id: "a1", action: "approval", user_name: "Dr. P", user_role: "PRINCIPAL", timestamp: "2026-11-23T10:00:00Z" });
    expect(i.kind).toBe("audit_event");
    expect(i.sections.some((s) => s.title === "Details")).toBe(true);
  });
});
