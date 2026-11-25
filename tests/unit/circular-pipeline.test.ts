import { describe, it, expect } from "vitest";
import { extractCircularFields } from "../../src/lib/circulars/pipeline";

describe("Circular OCR field extraction", () => {
  it("extracts circular_no, deadline, and action_required from OCR text", () => {
    const raw = `Circular No: JNTUH/2026/14
Hostel Curfew & Mess Timing Update
Mandatory for all 3rd Year CSE & IT hostellers.
Deadline: 2026-11-28`;
    const f = extractCircularFields(raw);
    expect(f.circular_no).toBe("JNTUH/2026/14");
    expect(f.deadline).toBe("2026-11-28");
    expect(f.action_required).toBe(true);
    expect(f.title).toContain("Hostel Curfew");
  });
});
