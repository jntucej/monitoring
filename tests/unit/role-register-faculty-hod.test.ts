import { describe, expect, it } from "vitest";
import type { InspectionSection } from "@/components/shared/EntityInspector";
import {
  buildFacultyReportDeptInspection,
} from "@/lib/role-registers/facultyInspections";
import {
  buildFacultyRequestHistoryInspection,
} from "@/lib/role-registers/facultyRequestHistoryInspection";
import {
  buildStudentDirectoryInspection,
} from "@/lib/role-registers/studentDirectoryInspection";
import {
  buildHodScheduleInspection,
  buildHodFacultyAttendanceInspection,
  buildHodFacultyDirectoryInspection,
  buildHodReportMetricInspection,
} from "@/lib/role-registers/hodInspections";

describe("role-register-faculty-hod inspection builders", () => {
  it("faculty/reports: dept summary row → overview + context + read-only actions", () => {
    const inspection = buildFacultyReportDeptInspection({
      department: "Computer Science & Engineering",
      totalFaculty: 45,
      presentToday: 41,
      attendanceRate: 91.1,
    });
    expect(inspection.kind).toBe("department_report");
    expect(inspection.title).toBe("Computer Science & Engineering");
    expect(inspection.subtitle).toBe("41 / 45 present");
    expect(inspection.detailHref).toBe("/faculty/my-classes");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Context & Relationships")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Actions")).toBe(true);
  });

  it("faculty/request-history: permission history row → ticket + student info + permission link", () => {
    const inspection = buildFacultyRequestHistoryInspection({
      id: "req-1",
      ticket_number: "EX-2026-0042",
      workflow_type: "exam",
      current_stage: "faculty",
      status: "APPROVED",
      sla_deadline: "2026-11-25T18:00:00Z",
      student: { name: "Ananya Sharma", unique_id: "2024-CS-101" },
    });
    expect(inspection.kind).toBe("request_history");
    expect(inspection.title).toContain("EX-2026-0042");
    expect(inspection.subtitle).toContain("Ananya Sharma");
    expect(inspection.detailHref).toBe("/permissions/EX-2026-0042");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Actions")).toBe(true);
  });

  it("faculty/student-directory: student directory row → student info + roster scope", () => {
    const inspection = buildStudentDirectoryInspection({
      id: "stu-1",
      name: "Rohan Patel",
      roll: "2024-CS-088",
      department: "CSE",
      year: 3,
      section: "A",
      status: "ACTIVE",
      hostelBlock: "BH-1",
      roomNumber: "204",
    });
    expect(inspection.kind).toBe("student");
    expect(inspection.title).toBe("Rohan Patel");
    expect(inspection.subtitle).toContain("2024-CS-088");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });

  it("hod/_shared/ClassesView: timetable item → schedule inspection with period & room", () => {
    const inspection = buildHodScheduleInspection({
      id: "sch-1",
      periodNumber: 2,
      subjectName: "Operating Systems",
      subjectCode: "CS302",
      roomNumber: "LH-201",
      startTime: "10:00",
      endTime: "11:00",
      attendanceMarked: true,
      className: "Year 3 · Sec A",
    });
    expect(inspection.kind).toBe("class_schedule");
    expect(inspection.title).toBe("Operating Systems");
    expect(inspection.subtitle).toContain("LH-201");
    expect(inspection.detailHref).toBe("/hod/faculty/attendance");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });

  it("hod/_shared/FacultyAttendanceView: faculty attendance row → biometric scan status & timing", () => {
    const inspection = buildHodFacultyAttendanceInspection({
      id: "fa-1",
      fullName: "Dr. Ramesh Rao",
      designation: "Associate Professor",
      status: "PRESENT",
      firstInTime: "08:45 AM",
      lastOutTime: "05:15 PM",
      punctualityStatus: "ON_TIME",
      totalHoursToday: "8h 30m",
    });
    expect(inspection.kind).toBe("faculty_attendance");
    expect(inspection.title).toBe("Dr. Ramesh Rao");
    expect(inspection.subtitle).toContain("Associate Professor");
    expect(inspection.detailHref).toBe("/hod/faculty/directory");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });

  it("hod/_shared/FacultyDirectoryView: faculty directory row → profile info & employee ID", () => {
    const inspection = buildHodFacultyDirectoryInspection({
      id: "fac-10",
      name: "Dr. Sunita Sen",
      email: "sunita.sen@college.edu",
      employee_details: {
        designation: "Professor",
        employee_id: "EMP-2041",
      },
    });
    expect(inspection.kind).toBe("faculty_member");
    expect(inspection.title).toBe("Dr. Sunita Sen");
    expect(inspection.subtitle).toContain("EMP-2041");
    expect(inspection.detailHref).toBe("/hod/classes");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });

  it("hod/_shared/ReportsView: department metric row → live metric card inspection", () => {
    const inspection = buildHodReportMetricInspection({
      metric: "On Campus Today",
      value: 1250,
      description: "Students present on campus",
    });
    expect(inspection.kind).toBe("department_metric");
    expect(inspection.title).toBe("On Campus Today");
    expect(inspection.detailHref).toBe("/hod/students");
    expect(inspection.sections.some((s: InspectionSection) => s.title === "Overview")).toBe(true);
  });
});
