import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmSheet } from "@/components/operator/sheet/ConfirmSheet";
import {
  recommend,
  type Recommendation,
  type RecommendationAlternative,
  type RecommendationInput,
} from "@/lib/operator-recommend";

// The first-scan ENTRY_TYPE_REQUIRED fix lives in recommend(): an unknown
// student (campusStatus null, lastReason null, currentEntryType null) must
// yield direction IN + entryType hosteller + button home_in, with a
// day_scholar_in alternative — the exact button set the server accepts.
const firstScanInput: RecommendationInput = {
  campusStatus: null,
  lastReason: null,
  currentEntryType: null,
  hasApprovedPass: false,
  curfewMinutes: null,
  biometricReady: false,
};

describe("recommend() — first-scan ENTRY_TYPE_REQUIRED fix", () => {
  it("unknown student → IN, entryButton home_in (recommended) + day_scholar_in alternative; no OUT leak", () => {
    const rec = recommend(firstScanInput);
    expect(rec.direction).toBe("IN");
    // The button carries the entry type on confirm (home_in → hosteller);
    // the sheet's entry-type toggle lets the operator override once.
    expect(rec.entryButton).toBe("home_in");
    expect(rec.alternatives.map((a) => a.code)).toContain("day_scholar_in");
    // No OUT leaks into the first-scan alternative set.
    expect(rec.alternatives.every((a) => a.direction === "IN")).toBe(true);
  });

  it("day_scholar pinned → day_scholar_in, entryType set", () => {
    const rec = recommend({ ...firstScanInput, currentEntryType: "day_scholar" });
    expect(rec.direction).toBe("IN");
    expect(rec.entryButton).toBe("day_scholar_in");
    expect(rec.entryType).toBe("day_scholar");
  });
  it("hosteller on OUT → daily_outing with day_pass + home_out alternatives", () => {
    const rec = recommend({
      ...firstScanInput,
      campusStatus: "IN",
      currentEntryType: "hosteller",
    });
    expect(rec.direction).toBe("OUT");
    expect(rec.reason).toBe("daily_outing");
    const codes = rec.alternatives.map((a) => a.code);
    expect(codes).toEqual(expect.arrayContaining(["day_pass", "home_out"]));
  });
});

describe("ConfirmSheet render", () => {
  const student = {
    personType: "student" as const,
    name: "Test Student",
    roll: "TEST001",
    department: "CSE",
    flagStatus: null,
  };

  it("shows direction toggles, entry type for student, and confirm posts the selection", () => {
    const onConfirm = jest.fn();
    const rec = recommend(firstScanInput);
    render(
      <ConfirmSheet
        student={student}
        recommendation={rec}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    // Sheet header + confirm button
    expect(screen.getByText("Confirm Scan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    // Direction toggles are present.
    expect(screen.getByText("Entry (IN)")).toBeInTheDocument();
    expect(screen.getByText("Exit (OUT)")).toBeInTheDocument();
    // Student + direction IN → entry-type toggle renders.
    expect(screen.getByText("Hosteller")).toBeInTheDocument();
    expect(screen.getByText("Day Scholar")).toBeInTheDocument();
    // Confirming posts the selected direction; entry type is null for a
    // first scan (the sheet's entry-type toggle lets the operator pick).
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(
      "IN",
      null,
      null,
      "home_in",
    );
  });

  it("selecting OUT + reason changes the posted payload", () => {
    const onConfirm = jest.fn();
    const rec = recommend(firstScanInput);
    render(
      <ConfirmSheet
        student={student}
        recommendation={rec}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    // selectedReason seeds from the IN recommendation (reason=null → null);
    // flipping to OUT exposes the reason dropdown, and entryType/button keep
    // their seeded null/home_in values.
    fireEvent.click(screen.getByText("Exit (OUT)"));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "day_pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(
      "OUT",
      "day_pass",
      null,
      "home_in",
    );
  });

  it("OUT direction exposes the reason dropdown", () => {
    const rec = recommend({
      ...firstScanInput,
      campusStatus: "IN",
      currentEntryType: "hosteller",
    });
    render(
      <ConfirmSheet
        student={student}
        recommendation={rec}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    // The OUT recommendation auto-selects OUT direction, so the reason
    // dropdown renders immediately.
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("daily_outing");
  });
});
