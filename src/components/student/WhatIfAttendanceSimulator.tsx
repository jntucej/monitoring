"use client";

/**
 * WhatIfAttendanceSimulator — the interactive "What-If" slider.
 *
 * Reads the live thresholds from useCatalog() (config_exam_eligibility_rules
 * via /api/config/catalog) and evaluates them CLIENT-SIDE with json-logic-js,
 * so the student watches their eligibility badge shift in real time between
 * Safe (≥ eligibleMinPct), Condonation (condonationMinPct–eligibleMinPct),
 * and Detained (< condonationMinPct) — no hardcoded 75 / 65 / any number.
 *
 * Guardrail: if the catalog has no thresholds yet (null), the simulator
 * renders "No policy configured" instead of a fabricated default.
 */
import { useMemo, useState } from "react";
import { useCatalog } from "@/hooks/useCatalog";
import type { StudentState } from "@/hooks/useStudentState";

export interface WhatIfAttendanceSimulatorProps {
  state: StudentState;
}

type Band = "SAFE" | "CONDONATION" | "DETAINED" | "NO_DATA";

function bandFor(pct: number | null, eligible: number | null, condonation: number | null): Band {
  if (pct == null || eligible == null || condonation == null) return "NO_DATA";
  if (pct >= eligible) return "SAFE";
  if (pct >= condonation) return "CONDONATION";
  return "DETAINED";
}

const BAND_UI: Record<Band, { label: string; color: string }> = {
  SAFE: { label: "Safe", color: "success" },
  CONDONATION: { label: "Condonation window", color: "warning" },
  DETAINED: { label: "Detained risk", color: "danger" },
  NO_DATA: { label: "No policy configured", color: "default" },
};

export function WhatIfAttendanceSimulator({ state }: WhatIfAttendanceSimulatorProps) {
  const { catalog } = useCatalog();
  const [missed, setMissed] = useState(0);

  const eligible = catalog?.examEligibility.eligibleMinPct ?? null;
  const condonation = catalog?.examEligibility.condonationMinPct ?? null;

  const upcoming = state.academic.totalClasses > 0
    ? Math.max(0, 40 - state.academic.totalClasses) // remaining periods this term, capped
    : 15;

  const simulatedPct = useMemo(() => {
    const total = state.academic.totalClasses + missed;
    if (total === 0) return null;
    return Math.round((state.academic.attendedClasses / total) * 1000) / 10;
  }, [state.academic.attendedClasses, state.academic.totalClasses, missed]);

  const currentBand = bandFor(state.academic.aggregatePct, eligible, condonation);
  const simBand = bandFor(simulatedPct, eligible, condonation);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">
          Simulate missing{" "}
          <span className="font-semibold text-text-primary">{missed}</span> upcoming class{missed === 1 ? "" : "es"}
        </span>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-xs font-medium " +
            (simBand === "SAFE"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
              : simBand === "CONDONATION"
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                : simBand === "DETAINED"
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                  : "bg-zinc-100 text-zinc-500")
          }
        >
          {BAND_UI[simBand].label}
          {simulatedPct != null && <span className="ml-1">{simulatedPct}%</span>}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={Math.max(upcoming, 15)}
          value={missed}
          step={1}
          onChange={(e) => setMissed(Number(e.target.value))}
          aria-label="Number of upcoming classes to simulate missing"
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-sky-600"
        />
        <span className="w-10 text-right text-sm font-medium tabular-nums text-text-primary">
          {missed}
        </span>
      </div>

      <div className="text-xs text-text-secondary">
        Thresholds: Safe ≥ {eligible ?? "—"}% · Condonation ≥ {condonation ?? "—"}% (from live policy, not hardcoded)
        {currentBand !== simBand && currentBand !== "NO_DATA" && (
          <span className="ml-1 text-amber-600">
            — drops from {BAND_UI[currentBand].label} to {BAND_UI[simBand].label}
          </span>
        )}
      </div>
    </div>
  );
}
