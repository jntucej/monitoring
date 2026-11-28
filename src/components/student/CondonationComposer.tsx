"use client";

import React, { useMemo, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Condonation Composer — a student submits a CAC condonation application to
 * unlock their hall ticket when they are in the condonation band.
 *
 * No fabricated data: the gate (when it may be used) + the live aggregate pct
 * come from GET /api/student/attendance/threshold (config-driven). The composer
 * is only shown when verdict.condonationRemedyAvailable is true (i.e. the
 * student's attendance is in the band AND the ticket is locked). Otherwise the
 * parent renders nothing / an explicit "not applicable" note.
 */

interface ThresholdVerdict {
  verdict?: {
    status: string;
    aggregatePct: number;
    hallTicketLocked: boolean;
    condonationRemedyAvailable: boolean;
    activeCondonation: {
      id: string;
      status: string;
      grounds_category: string;
      fee_cleared: boolean;
    } | null;
    eligibleMinPct: number;
    condonationMinPct: number;
  };
}

const GROUNDS = [
  { value: "MEDICAL", label: "Medical (certificate)" },
  { value: "INSTITUTIONAL_DEPUTATION", label: "Institutional deputation" },
] as const;

export function CondonationComposer() {
  const { data } = useApiResource<ThresholdVerdict>("/api/student/attendance/threshold");
  const verdict = data?.verdict;

  const [grounds, setGrounds] = useState<string>("MEDICAL");
  const [absenceFrom, setAbsenceFrom] = useState("");
  const [absenceTo, setAbsenceTo] = useState("");
  const [missedHours, setMissedHours] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remedyAvailable = !!verdict?.condonationRemedyAvailable;
  const active = verdict?.activeCondonation;

  const inBand = useMemo(() => {
    if (!verdict) return false;
    const pct = verdict.aggregatePct;
    return pct >= verdict.condonationMinPct && pct < verdict.eligibleMinPct;
  }, [verdict]);

  // Nothing to compose: not in the band, or already has a live application.
  if (!inBand || !remedyAvailable) return null;

  if (active && active.status !== "REJECTED") {
    return (
      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-300">
        <div className="text-xs font-bold text-indigo-900">
          Condonation application in progress ({active.status.replaceAll("_", " ")})
        </div>
        <p className="text-xs text-indigo-800 mt-0.5">
          Grounds: {active.grounds_category.toLowerCase().replaceAll("_", " ")} ·{" "}
          {active.fee_cleared ? "fee cleared" : "fee pending"} · your hall ticket unlocks
          once the CAC approves and the fee is cleared.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/student/attendance/condonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groundsCategory: grounds,
          absenceFrom,
          absenceTo,
          missedHours: Math.max(1, Number(missedHours || 0)),
          academicYear: academicYear || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not submit the application.");
        return;
      }
      setDone("Submitted — your application is with the HOD for endorsement.");
      setAbsenceFrom("");
      setAbsenceTo("");
      setMissedHours("");
    } catch {
      setError("Could not submit the application. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 rounded-2xl bg-bg-surface border border-border">
      <div className="text-xs font-bold text-text-primary mb-1">
        Condonation application
      </div>
      <p className="text-xs text-text-muted mb-3">
        You are at {Math.round(verdict!.aggregatePct)}% — between the condonation floor (
        {verdict!.condonationMinPct}%) and the eligibility threshold ({verdict!.eligibleMinPct}%).
        Submit a condonation to unlock your hall ticket.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-text-secondary">Grounds</label>
          <select
            value={grounds}
            onChange={(e) => setGrounds(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-xs"
          >
            {GROUNDS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Absence from"
            type="date"
            value={absenceFrom}
            onChange={(e) => setAbsenceFrom(e.target.value)}
            required
          />
          <Input
            label="Absence to"
            type="date"
            value={absenceTo}
            onChange={(e) => setAbsenceTo(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Missed hours"
            type="number"
            min={1}
            value={missedHours}
            onChange={(e) => setMissedHours(e.target.value)}
            required
          />
          <Input
            label="Academic year (optional)"
            placeholder="e.g. 2026-27"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>

        {done && <p className="text-xs font-semibold text-emerald-700">{done}</p>}
        {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit for HOD endorsement"}
        </Button>
      </form>
    </div>
  );
}
