import { describe, expect, it } from "vitest";
import type { InspectionSection } from "@/components/shared/EntityInspector";
import {
  buildGuardianChildRequestInspection,
  buildGuardianWardStatusInspection,
  buildGuardianScanActivityInspection,
} from "@/lib/role-registers/guardianInspections";
import type { Person, Scan } from "@/lib/types";

describe("role-register-guardian inspection builders", () => {
  describe("buildGuardianChildRequestInspection", () => {
    it("builds inspection for pending leave request with honest school-decision note", () => {
      const inspection = buildGuardianChildRequestInspection({
        id: "req-123",
        ticket_number: "TKT-LV-1001",
        workflow_type: "outing_pass",
        status: "PENDING",
        current_stage: "warden",
        created_at: "2026-11-23T08:30:00Z",
        student: {
          name: "Aarav Sharma",
          student_details: { roll: "24CS101" },
        },
      });

      expect(inspection.kind).toBe("child_request");
      expect(inspection.title).toBe("Outing pass · Aarav Sharma");
      expect(inspection.subtitle).toBe("TKT-LV-1001");
      expect(inspection.detailHref).toBe("/guardian/request-status?ticket=TKT-LV-1001");

      const overviewSection = inspection.sections.find((s: InspectionSection) => s.title === "Overview");
      expect(overviewSection).toBeDefined();

      const actionsSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
      expect(actionsSection).toBeDefined();
    });

    it("surfaces acknowledgement pathway when leave request is warden-approved", () => {
      const inspection = buildGuardianChildRequestInspection({
        id: "req-456",
        ticket_number: "TKT-LV-1002",
        workflow_type: "hostel_leave",
        status: "PENDING",
        current_stage: "PARENT_ACKNOWLEDGE",
        created_at: "2026-11-23T09:00:00Z",
        student: {
          name: "Diya Patel",
          student_details: { roll: "24EC202" },
        },
      });

      expect(inspection.kind).toBe("child_request");
      const actionsSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
      expect(actionsSection).toBeDefined();
    });
  });

  describe("buildGuardianWardStatusInspection", () => {
    it("builds ward presence inspection with campus status and gate lastSeen", () => {
      const ward: Person = {
        id: "student-1",
        uniqueId: "24CS101",
        fullName: "Aarav Sharma",
        personType: "student",
        status: "ACTIVE",
        department: "Computer Science",
        hostelBlock: "Block B",
        roomNumber: "204",
      };

      const statusSnapshot = {
        campusStatus: "IN",
        lastScan: {
          gateName: "Main Gate",
          timestamp: "2026-11-23T07:45:00Z",
        },
      };

      const inspection = buildGuardianWardStatusInspection(ward, statusSnapshot);

      expect(inspection.kind).toBe("ward_status");
      expect(inspection.title).toBe("Aarav Sharma");
      expect(inspection.subtitle).toBe("24CS101");
      expect(inspection.detailHref).toBe("/guardian/child-attendance");

      const overviewSection = inspection.sections.find((s: InspectionSection) => s.title === "Overview");
      expect(overviewSection).toBeDefined();

      const contextSection = inspection.sections.find((s: InspectionSection) => s.title === "Context & Relationships");
      expect(contextSection).toBeDefined();

      const actionsSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
      expect(actionsSection).toBeDefined();
    });

    it("handles null status gracefully for off-campus/unscanned ward", () => {
      const ward: Person = {
        id: "student-2",
        uniqueId: "24ME303",
        fullName: "Rohan Verma",
        personType: "student",
        status: "ACTIVE",
      };

      const inspection = buildGuardianWardStatusInspection(ward, null);
      expect(inspection.kind).toBe("ward_status");
      expect(inspection.title).toBe("Rohan Verma");
    });
  });

  describe("buildGuardianScanActivityInspection", () => {
    it("builds gate scan inspection with timestamp and entry/exit direction", () => {
      const scan: Scan = {
        id: "scan-999",
        roll: "24CS101",
        uniqueId: "24CS101",
        name: "Aarav Sharma",
        personType: "student",
        direction: "IN",
        gateId: "gate-1",
        gateName: "North Gate",
        operatorId: "op-1",
        operatorName: "Guard Officer",
        timestamp: "2026-11-23T10:15:00Z",
        isManual: false,
        isCorrection: false,
      };

      const inspection = buildGuardianScanActivityInspection(scan, "Aarav Sharma");

      expect(inspection.kind).toBe("gate_scan");
      expect(inspection.title).toContain("Entry (IN)");
      expect(inspection.title).toContain("North Gate");

      const actionsSection = inspection.sections.find((s: InspectionSection) => s.title === "Actions");
      expect(actionsSection).toBeDefined();
    });
  });
});
