import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import {
  resolveStudentAcademicState,
  recordAcademicTransition,
  resolveEffectiveSchedule,
} from "@/lib/academic/resolver";

describe("Versioned Academic Core & Schedule Exceptions", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("resolves student academic state from student_academic_history at a historical timestamp", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          academic_year_code: "2025-26",
          program_code: "BTECH",
          branch_code: "12",
          branch_short_name: "IT",
          entry_mode_code: "1A",
          regulation_code: "R22",
          year_of_study: 2,
          section: "A",
          academic_status: "active",
        },
      ],
    });

    const state = await resolveStudentAcademicState("00000000-0000-4000-8000-000000000010", "2025-10-01T10:00:00Z");
    expect(state?.source).toBe("history");
    expect(state?.year_of_study).toBe(2);
    expect(state?.branch_short_name).toBe("IT");
  });

  it("falls back to parseRollNumber only when no history row exists", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ unique_id: "23JJ1A0599" }] });

    const state = await resolveStudentAcademicState("00000000-0000-4000-8000-000000000011");
    expect(state?.source).toBe("roll_fallback");
    expect(state?.branch_short_name).toBe("CSE");
  });

  it("closes previous effective_to window and appends new row on detention/branch_change/graduation", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "new-row", academic_status: "detained", year_of_study: 2 }] });

    const row = await recordAcademicTransition({
      studentId: "00000000-0000-4000-8000-000000000010",
      academicYearCode: "2026-27",
      programCode: "BTECH",
      branchCode: "05",
      entryModeCode: "1A",
      yearOfStudy: 2,
      academicStatus: "detained",
      eventReason: "Attendance shortage",
      createdBy: "00000000-0000-4000-8000-000000000001",
    });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery.mock.calls[0][0]).toContain("SET effective_to = NOW()");
    expect(row.academic_status).toBe("detained");
  });

  it("resolves date-specific schedule_exceptions before default schedule", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ override_mode: "extended", open_time: "07:00", close_time: "18:00", reason: "Mid-Exam" }],
    });

    const sched = await resolveEffectiveSchedule("campus", "all", "2026-11-26");
    expect(sched.source).toBe("exception");
    expect(sched.open_time).toBe("07:00");
  });
});
