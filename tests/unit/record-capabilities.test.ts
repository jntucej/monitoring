import { describe, it, expect } from "vitest";
import { getPassTicketRulesForRole } from "@/lib/pass-ticket-rules";
import { getComplaintRulesForRole } from "@/lib/complaint-rules";
import { getGateEventRulesForRole } from "@/lib/gate-event-rules";
import { getTierForRole, resolveRecordView } from "@/lib/record-capabilities";
import { resolveTokenHref } from "@/components/nav/SmartTextRef";
import { canRoleExport } from "@/components/shared/RoleExportButton";
import { getTimetableAbility, resolveTimetableSlots } from "@/lib/timetable-resolver";
import { HIERARCHY_ROLE_OPTIONS } from "@/components/complaints/HierarchyTargetPicker";
import { computeSatisfactionSummary } from "@/components/shared/SatisfactionOverviewPanel";
import { getActionsForRole } from "@/lib/role-action-engine";
import { formatStageLabel, formatWorkflowLabel, formatFieldLabel } from "@/lib/ui-labels";
import { buildCustomGreeting } from "@/lib/custom-greeting";

describe("record-capabilities & tier rules", () => {
  it("maps roles to canonical tiers", () => {
    expect(getTierForRole("student")).toBe("tier-0");
    expect(getTierForRole("guardian")).toBe("tier-0");
    expect(getTierForRole("operator")).toBe("tier-1");
    expect(getTierForRole("caretaker")).toBe("tier-1");
    expect(getTierForRole("hod")).toBe("tier-2");
    expect(getTierForRole("exam_branch")).toBe("tier-2");
    expect(getTierForRole("principal")).toBe("tier-3");
    expect(getTierForRole("admin")).toBe("tier-3");
    expect(getTierForRole("sysadmin")).toBe("tier-4");
  });

  it("getPassTicketRulesForRole gates stage actions to active stage owner", () => {
    const ticket = {
      id: "t-1",
      ticketNumber: "PASS-402",
      workflowType: "hostel",
      status: "PENDING",
      currentStage: "hod",
      studentRoll: "25JJ5A1203",
    };

    const hodRules = getPassTicketRulesForRole({ role: "hod" }, ticket);
    expect(hodRules.mode).toBe("stage-act");
    expect(hodRules.actions.map((a) => a.id)).toContain("approve");
    expect(hodRules.actions.map((a) => a.id)).toContain("reject");

    const wardenRules = getPassTicketRulesForRole({ role: "deputy_warden" }, ticket);
    expect(wardenRules.mode).toBe("stage-wait");
    expect(wardenRules.actions.map((a) => a.id)).not.toContain("approve");

    const opRules = getPassTicketRulesForRole({ role: "operator" }, ticket);
    expect(opRules.mode).toBe("gate-verify");
    expect(opRules.actions.map((a) => a.id)).toContain("scan-desk");

    const studentRules = getPassTicketRulesForRole({ role: "student" }, { ...ticket, status: "APPROVED" });
    expect(studentRules.mode).toBe("requester-loop");
    expect(studentRules.actions.map((a) => a.id)).toContain("qr-pass");
  });

  it("getComplaintRulesForRole enforces hostel scope for Tier 1 handlers", () => {
    const complaint = {
      id: "c-1",
      complaintNumber: "CMP-118",
      status: "OPEN",
      hostelScope: "boys_hostel_1",
      raisedByUserId: "u-stu-1",
    };

    const inScope = getComplaintRulesForRole(
      { role: "caretaker", hostelScope: "boys_hostel_1" },
      complaint,
    );
    expect(inScope.mode).toBe("handler-act");
    expect(inScope.actions.map((a) => a.id)).toContain("resolve");

    const outOfScope = getComplaintRulesForRole(
      { role: "caretaker", hostelScope: "girls_hostel_1" },
      complaint,
    );
    expect(outOfScope.mode).toBe("handler-observe");
    expect(outOfScope.actions.map((a) => a.id)).not.toContain("resolve");

    const selfStudent = getComplaintRulesForRole(
      { role: "student", userId: "u-stu-1" },
      complaint,
    );
    expect(selfStudent.mode).toBe("requester-track");
    expect(selfStudent.actions.map((a) => a.id)).toContain("escalate");
  });

  it("getGateEventRulesForRole blocks scans during LOCKDOWN", () => {
    const openGate = { id: "g-1", gateCode: "GATE-01", status: "OPEN" };
    const lockedGate = { id: "g-1", gateCode: "GATE-01", status: "LOCKDOWN" };

    const opOpen = getGateEventRulesForRole({ role: "operator" }, openGate);
    expect(opOpen.mode).toBe("gate-verify");
    expect(opOpen.actions.map((a) => a.id)).toContain("log-in");

    const opLocked = getGateEventRulesForRole({ role: "operator" }, lockedGate);
    expect(opLocked.actions.map((a) => a.id)).not.toContain("log-in");

    const adminRules = getGateEventRulesForRole({ role: "admin" }, openGate);
    expect(adminRules.mode).toBe("gate-admin");
    expect(adminRules.actions.map((a) => a.id)).toContain("set-mode");
  });

  it("resolveRecordView returns unified tier, mode, pivots, and actions", () => {
    const view = resolveRecordView(
      "ticket",
      {
        id: "t-1",
        ticket_number: "PASS-402",
        current_stage: "exam_branch",
        status: "PENDING",
        student_user_id: "u-1",
        student: { id: "u-1", unique_id: "25JJ5A1203", name: "Rahul" },
      },
      { userId: "u-eb", role: "exam_branch" },
    );
    expect(view.tier).toBe("tier-2");
    expect(view.mode).toBe("act");
    expect(view.pivots[0]?.id).toBe("25JJ5A1203");
    expect(view.actions[0]?.label).toBe("Verify & Forward to OIE");
  });

  it("resolveTokenHref links permitted tokens and leaves restricted ones null", () => {
    // Student can inspect their own ticket -> routes to /student/passes/[id]
    expect(resolveTokenHref("student", "ticket", "PASS-402", "/student")).toBe(
      "/student/passes/PASS-402",
    );
    // Student cannot inspect another student or gate -> null (plain text)
    expect(resolveTokenHref("student", "student", "25JJ5A1203", "/student")).toBeNull();
    expect(resolveTokenHref("student", "gate", "GATE-01", "/student")).toBeNull();
    // HOD can inspect student & ticket -> ?inspect=kind:id preserving path
    expect(resolveTokenHref("hod", "student", "25JJ5A1203", "/hod/approvals?status=PENDING")).toBe(
      "/hod/approvals?status=PENDING&inspect=student%3A25JJ5A1203",
    );
  });

  it("canRoleExport enforces role-scoped export permissions", () => {
    expect(canRoleExport("student", "own-history")).toBe(true);
    expect(canRoleExport("student", "audit-logs")).toBe(false);
    expect(canRoleExport("operator", "shift-scans")).toBe(true);
    expect(canRoleExport("operator", "approvals-ledger")).toBe(false);
    expect(canRoleExport("hod", "approvals-ledger")).toBe(true);
    expect(canRoleExport("principal", "audit-logs")).toBe(true);
    expect(canRoleExport("sysadmin", "audit-logs")).toBe(true);
  });

  it("getTimetableAbility & resolveTimetableSlots resolve role actions and date overrides", () => {
    expect(getTimetableAbility("faculty").canMarkAttendance).toBe(true);
    expect(getTimetableAbility("faculty").nextActionLabel).toBe("Take Attendance");
    expect(getTimetableAbility("hod").canApproveOverride).toBe(true);
    expect(getTimetableAbility("student").canRequestSwapOrCancel).toBe(false);

    const resolved = resolveTimetableSlots(
      [
        {
          id: "s-1",
          date: "2026-11-23",
          periodNumber: 1,
          startTime: "09:30",
          endTime: "10:20",
          classId: "c-1",
          classLabel: "CSE-A",
          subjectCode: "CS301",
          subjectLabel: "Operating Systems",
          facultyId: "f-1",
          facultyName: "Dr. Rao",
          roomNumber: "204",
          status: "scheduled",
          attendanceMarked: false,
        },
      ],
      [
        {
          slotId: "s-1",
          date: "2026-11-23",
          status: "swapped",
          substituteFacultyName: "Prof. Kiran",
          overrideNote: "Swapped for lab",
        },
      ],
      "2026-11-23",
    );
    expect(resolved[0]?.status).toBe("swapped");
    expect(resolved[0]?.facultyName).toBe("Prof. Kiran");
  });

  it("HIERARCHY_ROLE_OPTIONS & computeSatisfactionSummary cover hierarchy routing and ratings", () => {
    expect(HIERARCHY_ROLE_OPTIONS.map((r) => r.roleCode)).toContain("hod");
    expect(HIERARCHY_ROLE_OPTIONS.map((r) => r.roleCode)).toContain("principal");
    const summary = computeSatisfactionSummary([
      { id: "1", source: "mess", rating: 5, tag: "Food quality" },
      { id: "2", source: "complaint", rating: 2, tag: "Queue delay" },
    ]);
    expect(summary.avg).toBe(3.5);
    expect(summary.lowCount).toBe(1);
    expect(summary.total).toBe(2);
  });

  it("getActionsForRole guarantees scoped actions for CR, student, faculty, frontline, executive, and sysadmin", () => {
    expect(getActionsForRole("cr", { kind: "assignment", recordId: "a-1" }).map((a) => a.id)).toContain(
      "confirm_assignment",
    );
    expect(getActionsForRole("student", { kind: "assignment", recordId: "a-1" }).map((a) => a.id)).toContain(
      "confirm_assignment",
    );
    expect(getActionsForRole("faculty", { kind: "assignment", recordId: "a-1" }).map((a) => a.id)).toContain(
      "verify_assignment",
    );
    expect(getActionsForRole("operator", { kind: "gate", recordId: "g-1" }).map((a) => a.id)).toContain(
      "open_scanner",
    );
    expect(getActionsForRole("caretaker", { kind: "complaint", recordId: "c-1" }).map((a) => a.id)).toContain(
      "resolve_work",
    );
    expect(getActionsForRole("principal", { kind: "ticket", recordId: "t-1" }).map((a) => a.id)).toContain(
      "override_approve",
    );
    expect(getActionsForRole("sysadmin", { kind: "session", recordId: "s-1" }).map((a) => a.id)).toContain(
      "revoke_session",
    );
  });

  it("ui-labels formats raw enums into human-centered campus labels", () => {
    expect(formatStageLabel("deputy_warden")).toBe("Awaiting Deputy Warden Sign-Off");
    expect(formatWorkflowLabel("home_out")).toBe("Home Outing Pass");
    expect(formatFieldLabel("uniqueId")).toBe("Roll / Employee ID");
  });

  it("buildCustomGreeting tailors salutation and subline by time and role", () => {
    const morning = buildCustomGreeting({
      name: "Aarav Sharma",
      role: "hod",
      pendingCount: 3,
      urgentCount: 1,
      now: new Date("2026-11-23T09:00:00"),
    });
    expect(morning.timePeriod).toBe("morning");
    expect(morning.headline).toBe("Good morning, Aarav");
    expect(morning.subline).toContain("3 items at your stage");

    const nightOp = buildCustomGreeting({
      name: "Ravi",
      role: "operator",
      gateCode: "GATE-01",
      now: new Date("2026-11-23T22:30:00"),
    });
    expect(nightOp.timePeriod).toBe("night");
    expect(nightOp.subline).toContain("GATE-01");
  });
});
