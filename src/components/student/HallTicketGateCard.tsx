"use client";

/**
 * HallTicketGateCard — the hero KPI: single pass/warn/block badge plus the
 * 3-point checklist (attendance %, zero dues, disciplinary clearance).
 *
 * All thresholds come from useCatalog() (examEligibility) — zero hardcoded
 * 75 / 65 / any number. If the catalog has no policy, the card shows
 * "No policy configured" instead of a fabricated verdict.
 */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Lock } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import type { StudentState } from "@/hooks/useStudentState";

export interface HallTicketGateCardProps {
  state: StudentState;
}

type Verdict = "ELIGIBLE" | "CONDONATION" | "BLOCKED" | "NO_DATA";

function derive(state: StudentState, catalog: ReturnType<typeof useCatalog>["catalog"]): Verdict {
  const pct = state.academic.aggregatePct;
  const eligible = catalog?.examEligibility.eligibleMinPct;
  const condonation = catalog?.examEligibility.condonationMinPct;
  if (pct == null || eligible == null || condonation == null) return "NO_DATA";

  const attendanceOk = pct >= eligible;
  const condonationOk = pct >= condonation;
  const duesOk = state.academic.duesBalanceInr == null || state.academic.duesBalanceInr <= 0;
  const discOk = state.academic.disciplinaryClearance !== false;

  if (attendanceOk && duesOk && discOk) return "ELIGIBLE";
  if (condonationOk && duesOk && discOk) return "CONDONATION";
  return "BLOCKED";
}

const VERDICT_UI: Record<Verdict, { label: string; variant: "success" | "error" | "offline" | "entry" | "leave" | "dayout" | "exit"; icon: React.ReactNode }> = {
  ELIGIBLE: { label: "Hall Ticket: Eligible", variant: "success", icon: <Check className="h-3.5 w-3.5" /> },
  CONDONATION: { label: "Condonation window", variant: "leave", icon: <Minus className="h-3.5 w-3.5" /> },
  BLOCKED: { label: "Hall Ticket: Blocked", variant: "error", icon: <X className="h-3.5 w-3.5" /> },
  NO_DATA: { label: "No policy / no data yet", variant: "offline", icon: <Lock className="h-3.5 w-3.5" /> },
};

export function HallTicketGateCard({ state }: HallTicketGateCardProps) {
  const { catalog } = useCatalog();
  const verdict = derive(state, catalog);
  const ui = VERDICT_UI[verdict];

  const rows: Array<{
    label: string;
    ok: boolean | null;
    detail: string;
  }> = [
    {
      label: "Attendance",
      ok:
        state.academic.hasAttendanceData
          ? verdict === "ELIGIBLE"
            ? true
            : verdict === "CONDONATION"
              ? null
              : false
          : null,
      detail: state.academic.hasAttendanceData
        ? `${state.academic.aggregatePct}% (Safe ≥ ${catalog?.examEligibility.eligibleMinPct ?? "—"}%)`
        : "No attendance data yet",
    },
    {
      label: "Zero dues",
      ok:
        state.academic.duesBalanceInr == null
          ? null
          : state.academic.duesBalanceInr <= 0,
      detail:
        state.academic.duesBalanceInr == null
          ? "Dues not computed yet"
          : state.academic.duesBalanceInr > 0
            ? `₹${state.academic.duesBalanceInr.toLocaleString("en-IN")} outstanding`
            : "Cleared",
    },
    {
      label: "Disciplinary clearance",
      ok: state.academic.disciplinaryClearance,
      detail:
        state.academic.disciplinaryClearance == null
          ? "No record yet"
          : state.academic.disciplinaryClearance
            ? "Cleared"
            : "On hold",
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex w-full items-center justify-between">
          <CardTitle className="text-base">Hall Ticket Gate</CardTitle>
          <Badge variant={ui.variant} dot={false}>
            {ui.icon}
            {ui.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-sm">
              {r.ok == null ? (
                <Minus className="h-4 w-4 shrink-0 text-text-muted" aria-label="no data" />
              ) : r.ok ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="pass" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-rose-600" aria-label="fail" />
              )}
              <span className="text-text-secondary">{r.label}</span>
              <span className="ml-auto text-xs text-text-secondary">{r.detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
