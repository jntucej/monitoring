import { describe, it, expect } from "vitest";
import { canGenerate, PASS_RANK_BY_TYPE } from "@/config/pass-ranks";

describe("canGenerate (hostel pass rank tiers)", () => {
  it("principal (rank 3) can issue any reason", () => {
    expect(canGenerate("principal", "home_out")).toBe(true);
    expect(canGenerate("principal", "special_leave")).toBe(true);
    expect(canGenerate("principal", "emergency")).toBe(true);
  });
  it("deputy_warden (rank 2) cannot issue emergency (rank 3)", () => {
    expect(canGenerate("deputy_warden", "home_out")).toBe(true);
    expect(canGenerate("deputy_warden", "special_leave")).toBe(true);
    expect(canGenerate("deputy_warden", "emergency")).toBe(false);
  });
  it("caretaker / hostel_manager are not in the generation allow-list", () => {
    expect(canGenerate("caretaker", "home_out")).toBe(false);
    expect(canGenerate("hostel_manager", "day_pass")).toBe(false);
  });
  it("unknown reasons fail-safe to rank 3 (only top tier)", () => {
    expect(canGenerate("deputy_warden", "unknown_type")).toBe(false);
    expect(canGenerate("principal", "unknown_type")).toBe(true);
  });
});
