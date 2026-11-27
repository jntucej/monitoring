"use client";

/**
 * AttendanceDateRatioPanel — a date selector + barcode-style ratio strips
 * (Present / Absent / Delayed) for a class, driven by REAL roster counts.
 *
 * The "period" tabs (today / 7d / 30d / all-time) map to the
 * /api/faculty/attendance/roster `period` query param; the parent refetches
 * on tab change. The barcode strips are a literal present:absent:unmarked
 * bar (real proportions, never fabricated) plus a per-student ratio strip
 * grid. An explicit empty state shows when there are no records.
 */
import { cn } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CalendarDays, Loader2, Inbox } from "lucide-react";
import type { RosterPayload } from "./AttendanceStatusBoard";

export type PeriodKey = "this-month" | "last-month" | "all-time";
// Period values are the EXACT `period` query values /api/faculty/attendance/roster
// accepts (see periodRange): this-month (default), last-month, all-time.
export const PERIODS: Array<{ key: PeriodKey; label: string; param: string }> = [
  { key: "this-month", label: "This month", param: "this-month" },
  { key: "last-month", label: "Last month", param: "last-month" },
  { key: "all-time", label: "All time", param: "all-time" },
];

interface Props {
  data: RosterPayload | null;
  loading?: boolean;
  error?: string | null;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  onInspectStudent?: (s: import("./AttendanceStatusBoard").RosterStudent) => void;
  title?: string;
}

/** A literal barcode strip: 3 segments proportional to the real counts. */
function BarcodeStrip({ present, absent, unmarked }: { present: number; absent: number; unmarked: number }) {
  const total = present + absent + unmarked;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-elev-1" role="img" aria-label={`${present} present, ${absent} absent, ${unmarked} unmarked`}>
      <div className="h-full bg-action-success" style={{ width: `${pct(present)}%` }} />
      <div className="h-full bg-action-danger" style={{ width: `${pct(absent)}%` }} />
      <div className="h-full bg-text-muted/40" style={{ width: `${pct(unmarked)}%` }} />
    </div>
  );
}

export function AttendanceDateRatioPanel({
  data,
  loading,
  error,
  period,
  onPeriodChange,
  onInspectStudent,
  title = "Attendance by Date",
}: Props) {
  const s = data?.summary;

  if (loading && !data) {
    return (
      <WidgetBoundary name="AttendanceDateRatioPanel" title={title}>
        <div className="p-4 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading attendance…
        </div>
      </WidgetBoundary>
    );
  }
  if (error && !data) {
    return (
      <WidgetBoundary name="AttendanceDateRatioPanel" title={title}>
        <div className="p-4 text-sm text-action-danger">{error}</div>
      </WidgetBoundary>
    );
  }
  if (!data || !s || s.total === 0) {
    return (
      <WidgetBoundary name="AttendanceDateRatioPanel" title={title}>
        <div className="p-4">
          <PeriodTabs period={period} onChange={onPeriodChange} />
          <div className="mt-4 flex items-center gap-2 text-sm text-text-muted min-h-10">
            <Inbox className="w-4 h-4" /> No attendance records for the selected period.
          </div>
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary name="AttendanceDateRatioPanel" title={title}>
      <div className="p-4 min-w-0">
        <div className="mb-3">
          <PeriodTabs period={period} onChange={onPeriodChange} />
        </div>

        {/* Overall barcode strip — literal real proportions */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> {data.period}
            </span>
            <span className="font-mono">{s.pct}% present</span>
          </div>
          <BarcodeStrip present={s.present} absent={s.absent} unmarked={s.unmarked} />
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-action-success" /> {s.present} present</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-action-danger" /> {s.absent} absent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-text-muted/40" /> {s.unmarked} unmarked</span>
          </div>
        </div>

        {/* Per-student ratio strips */}
        <div className="space-y-1.5">
          {data.students.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => onInspectStudent?.(st)}
              className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-bg-elev-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              aria-label={`${st.name} (${st.roll}) — ${st.pct}% present`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate text-text-primary font-medium">{st.name}</span>
                <span className="font-mono text-text-muted shrink-0">{st.roll} · {st.pct}%</span>
              </div>
              <BarcodeStrip present={st.present} absent={st.absent} unmarked={st.unmarked} />
            </button>
          ))}
        </div>
      </div>
    </WidgetBoundary>
  );
}

function PeriodTabs({ period, onChange }: { period: PeriodKey; onChange: (p: PeriodKey) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-bg-elev-1 p-1" role="tablist">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="tab"
          aria-selected={period === p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            period === p.key
              ? "bg-bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
