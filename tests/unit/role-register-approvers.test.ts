import { describe, expect, it } from "vitest";
import type { InspectionSection } from "@/components/shared/EntityInspector";
import {
  buildDeputyWardenDecisionInspection,
  buildDeputyWardenGateMovementInspection,
  buildDeputyWardenIncidentInspection,
  buildDeputyWardenHandoverInspection,
} from "@/lib/role-registers/deputyWardenInspections";
import {
  buildOieAccessExceptionInspection,
  buildOieCandidateAttendanceInspection,
  buildOieDecisionHistoryInspection,
  buildOieCoordinationInspection,
  buildOieExaminationDayAccessInspection,
  buildOieRecordInspection,
} from "@/lib/role-registers/oieInspections";

describe("role-register-deputy-warden inspection builders", () => {
  it("decision history row → overview + context + read-only honest action", () => {
    const inspection = buildDeputyWardenDecisionInspection({
      id: "dec-1",
      ticket_number: "HST-2026-001",
      workflow_type: "hostel",
      current_stage: "completed",
      status: "APPROVED",
      decidedAt: "2026-11-20T10:00:00Z",
    });
    expect(inspection.kind).toBe("hostel_decision");
    expect(inspection.title).toContain("HST-2026-001");
    expect(inspection.detailHref).toBe("/permissions/HST-2026-001");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Context & Relationships")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Actions")).toBe(true);
  });

  it("gate movement row → gate name + telemetry counts", () => {
    const inspection = buildDeputyWardenGateMovementInspection({
      id: "gate-1",
      name: "Main Gate 1",
      code: "MG1",
      audience: "ALL",
      type: "PEDESTRIAN",
      onCampusCount: 42,
      roleCounts: { student: 30, staff: 12 },
    });
    expect(inspection.kind).toBe("gate_movement");
    expect(inspection.title).toBe("Main Gate 1");
    expect(inspection.detailHref).toBe("/deputy-warden/curfew-oversight");
    expect(inspection.sections[0].title).toBe("Overview");
  });

  it("incident alert row → alert title + honest escalation note", () => {
    const inspection = buildDeputyWardenIncidentInspection({
      id: "alert-99",
      title: "Hostel Noise Disturbance",
      severity: "medium",
      status: "OPEN",
      created_at: "2026-11-22T21:00:00Z",
    });
    expect(inspection.kind).toBe("incident");
    expect(inspection.title).toBe("Hostel Noise Disturbance");
    expect(inspection.detailHref).toBe("/deputy-warden/daily-overview");
  });

  it("shift handover row → items count + logged details", () => {
    const inspection = buildDeputyWardenHandoverInspection({
      id: "ho-1",
      toRole: "deputy_warden",
      byName: "Officer Sharma",
      createdAt: "2026-11-23T06:00:00Z",
      items: [
        { type: "GATE_LOCK", title: "Gate 2 locked at 23:00", severity: "info" },
      ],
    });
    expect(inspection.kind).toBe("shift_handover");
    expect(inspection.title).toContain("Officer Sharma");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });
});

describe("role-register-oie inspection builders", () => {
  it("access exception row → candidate info + honest review-only action", () => {
    const inspection = buildOieAccessExceptionInspection({
      id: "ex-1",
      ticket_number: "EX-101",
      workflow_type: "exam",
      current_stage: "exam_branch",
      status: "REJECTED",
      candidate_name: "Rahul Kumar",
      roll: "2024-CS-045",
    });
    expect(inspection.kind).toBe("exam_access_exception");
    expect(inspection.title).toContain("Rahul Kumar");
    expect(inspection.detailHref).toBe("/permissions/EX-101");
  });

  it("candidate attendance row → scan telemetry", () => {
    const inspection = buildOieCandidateAttendanceInspection({
      id: "att-1",
      person_id: "p-123",
      date: "2026-11-23",
      status: "VERIFIED",
      direction: "IN",
      timestamp_utc: "2026-11-23T08:30:00Z",
      candidate_name: "Sneha Patel",
      roll: "2024-EC-012",
    });
    expect(inspection.kind).toBe("candidate_attendance");
    expect(inspection.title).toContain("Sneha Patel");
    expect(inspection.detailHref).toBe("/oie/examination-day-access");
  });

  it("decision history row → past stages + ticket detail link", () => {
    const inspection = buildOieDecisionHistoryInspection({
      id: "h-1",
      ticket_number: "EX-DEC-99",
      workflow_type: "exam",
      current_stage: "completed",
      status: "APPROVED",
      student: { name: "Aman Gupta", student_details: { roll: "2023-ME-002" } },
      stage_history: [{}, {}],
    });
    expect(inspection.kind).toBe("exam_decision");
    expect(inspection.title).toContain("EX-DEC-99");
    expect(inspection.detailHref).toBe("/permissions/EX-DEC-99");
  });

  it("exam branch coordination row → student + stage info", () => {
    const inspection = buildOieCoordinationInspection({
      id: "coord-1",
      ticket_number: "EX-CRD-12",
      workflow_type: "exam",
      current_stage: "exam_branch",
      status: "PENDING",
      student: { name: "Priya Rao" },
    });
    expect(inspection.kind).toBe("exam_coordination");
    expect(inspection.title).toContain("EX-CRD-12");
  });

  it("examination-day access row → student + day access status", () => {
    const inspection = buildOieExaminationDayAccessInspection({
      id: "day-1",
      ticket_number: "EX-DAY-05",
      workflow_type: "exam",
      current_stage: "oie",
      status: "IN_REVIEW",
      student: { name: "Vikram Seth" },
    });
    expect(inspection.kind).toBe("exam_day_access");
    expect(inspection.title).toContain("Vikram Seth");
  });

  it("records row → actionable OIE operational record", () => {
    const inspection = buildOieRecordInspection({
      id: "rec-1",
      ticket_number: "EX-REC-01",
      workflow_type: "exam",
      current_stage: "oie",
      status: "PENDING",
      student: { name: "Ananya Roy" },
    });
    expect(inspection.kind).toBe("oie_operational_record");
    expect(inspection.title).toContain("EX-REC-01");
    expect(inspection.detailHref).toBe("/permissions/EX-REC-01");
  });
});
