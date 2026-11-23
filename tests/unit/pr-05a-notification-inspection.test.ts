import { describe, expect, it } from "vitest";
import { buildNotificationInspection } from "@/lib/principal/notificationInspection";

describe("notification → inspection bridge (PR-05A §13)", () => {
  it("ticket notification → permission inspection with overview + open-record action", () => {
    const i = buildNotificationInspection({
      id: "perm-pending-T-1",
      urgency: "approval",
      type: "exam_access",
      title: "Exam access pending",
      message: "Candidate cleared",
      ticketNumber: "T-1",
      createdAt: "2026-11-23T09:00:00Z",
    });
    expect(i).not.toBeNull();
    if (!i) return;
    expect(i.kind).toBe("notification.permission");
    expect(i.subtitle).toBe("T-1");
    expect(i.sections.some((s) => s.title === "Overview")).toBe(true);
    expect(i.sections.some((s) => s.title === "Action")).toBe(true);
    // The action links to the real permission record, not an invented route.
    const actionSection = i.sections.find((s) => s.title === "Action");
    expect(String(actionSection?.content)).not.toContain("undefined");
  });

  it("alert notification → incident inspection with register action", () => {
    const i = buildNotificationInspection({
      id: "alert-abc",
      urgency: "urgent",
      title: "Gate offline",
      message: "Main gate reader down",
    });
    expect(i?.kind).toBe("notification.alert");
    expect(i?.sections.some((s) => s.title === "Action")).toBe(true);
  });

  it("info-only notification with no reference → null (inspect-only, nothing invented)", () => {
    const i = buildNotificationInspection({
      id: "info-x",
      urgency: "info",
      title: "Digest ready",
      message: "Your weekly digest",
    });
    expect(i).toBeNull();
  });
});
