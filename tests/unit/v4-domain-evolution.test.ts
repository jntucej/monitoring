import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("@/lib/postgres", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { resolveStudentAcademicState } from "@/lib/academic/resolver";

describe("V4 Domain Evolution — Expected vs Actual Progression", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("distinguishes expected_year_of_study from actual year_of_study when a student repeats a year", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            academic_year_code: "2026-27",
            program_code: "BTECH",
            branch_code: "05",
            branch_short_name: "CSE",
            entry_mode_code: "1A",
            regulation_code: "R22",
            year_of_study: 2,
            section: "A",
            academic_status: "year_back",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ unique_id: "24JJ1A0501" }],
      });

    const state = await resolveStudentAcademicState(
      "00000000-0000-4000-8000-000000000020",
      "2026-11-25T10:00:00Z",
    );

    expect(state?.year_of_study).toBe(2);
    expect(state?.expected_year_of_study).toBe(3);
    expect(state?.progression_delta).toBe(-1);
    expect(state?.academic_status).toBe("year_back");
  });
});
