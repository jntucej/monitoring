"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock, CalendarX, FileDown, RefreshCw,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { LifefulCalendarAgenda } from "@/components/nav/LifefulCalendarAgenda";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useExport } from "@/hooks/useExport";
import { getAuthHeaders } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

type PeriodKey = "today" | "this-week" | "this-month" | "all";
const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "this-month", label: "This month" },
  { key: "all", label: "All" },
];

function periodWindow(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const today = new Date(now).toISOString().slice(0, 10);
  switch (key) {
    case "this-week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: d(start), to: today };
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d(start), to: today };
    }
    default:
      return { from: today, to: today };
  }
}

interface RuleRow {
  id: string;
  name: string;
  gate_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  policy: string | null;
  priority: number | null;
}

interface HolidayRow {
  id: string;
  date: string;
  name: string;
}

/**
 * Sysadmin Gate Schedule — gate access rules + holiday calendar.
 * Backend: /api/gates/schedule (open GET; rules + holidays).
 */
function SysadminGateScheduleInner() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const { exportCSV } = useExport();

  const { from, to } = useMemo(() => periodWindow(period), [period]);
  const [rangeKey, setRangeKey] = useState(0);

  const handleExport = () => {
    exportCSV(
      rules.map((r) => ({
        name: r.name,
        gate: r.gate_id ?? "all",
        day: r.day_of_week != null ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][r.day_of_week] : "every",
        window: r.start_time ? `${r.start_time}–${r.end_time ?? ""}` : "—",
        policy: r.policy ?? "—",
        priority: r.priority ?? "—",
      })),
      [
        { key: "name", header: "Rule" },
        { key: "gate", header: "Gate" },
        { key: "day", header: "Day" },
        { key: "window", header: "Window" },
        { key: "policy", header: "Policy" },
        { key: "priority", header: "Priority" },
      ],
      `gate_schedule_${from}_${to}.csv`
    );
  };

  const handleExportHolidays = () => {
    exportCSV(
      holidays.map((h) => ({
        date: h.date,
        name: h.name,
      })),
      [
        { key: "date", header: "Date" },
        { key: "name", header: "Holiday" },
      ],
      `gate_holidays_${from}_${to}.csv`
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = period !== "all" ? `?from=${from}&to=${to}` : "";
      const res = await fetch(`/api/gates/schedule${params}`, { headers: getAuthHeaders() });
      const body = await res.json();
      setRules((body?.data?.rules ?? []) as RuleRow[]);
      setHolidays((body?.data?.holidays ?? []) as HolidayRow[]);
      if (body?.data?.rules?.length) setRangeKey((k) => k + 1);
    } catch (e) {
      console.error("gate-schedule", e);
    } finally {
      setLoading(false);
    }
  }, [from, to, period]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Access rules and the gate holiday calendar"
        why="Use this to audit whether gate hours match institutional policy before each term."
        contextLabel="Access rules and the gate holiday calendar"
        statusSummary="Review current access rules and the gate holiday calendar state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Gate Schedule"
        subtitle="Access rules and the gate holiday calendar"
        onRefresh={load}
      />

      {/* Period picker + CSV export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg p-0.5 gap-0.5 bg-bg-elevated border border-border">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === key
                  ? "bg-action-primary text-white"
                  : "text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={rules.length === 0}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            title="Export rules CSV"
          >
            <FileDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportHolidays}
            disabled={holidays.length === 0}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            title="Export holidays CSV"
          >
            <FileDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary rounded-lg bg-bg-elevated border border-border hover:bg-bg-surface"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <WidgetBoundary title="Access rules">
        <div className="glass-card">
          {rules.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="No access rules defined"
              description="Rules are managed in the sysadmin gate configuration."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="p-3 text-left">Rule</th>
                    <th className="p-3 text-left">Gate</th>
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-left">Window</th>
                    <th className="p-3 text-left">Policy</th>
                    <th className="p-3 text-center">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-elevated/40">
                      <td className="p-3 font-medium text-text-primary">{r.name}</td>
                      <td className="p-3 font-mono text-xs text-text-muted">{r.gate_id ?? "all"}</td>
                      <td className="p-3 text-xs text-text-muted">
                        {r.day_of_week != null ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][r.day_of_week] : "—"}
                      </td>
                      <td className="p-3 font-mono text-xs text-text-muted">
                        {r.start_time ? `${r.start_time}–${r.end_time ?? ""}` : "—"}
                      </td>
                      <td className="p-3 text-xs text-text-muted capitalize">{r.policy ?? "—"}</td>
                      <td className="p-3 text-center text-xs">{r.priority ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Holiday calendar">
        <div className="glass-card">
          {holidays.length === 0 ? (
            <EmptyState
              icon={<CalendarX className="w-6 h-6" />}
              title="No holidays in the calendar"
              description="Holidays are added in the sysadmin gate configuration."
            />
          ) : (
            <div className="divide-y divide-border">
              {holidays.map((h) => (
                <div key={h.id} className="p-3 flex items-center gap-3">
                  <CalendarX className="w-4 h-4 text-text-muted shrink-0" />
                  <p className="flex-1 text-sm text-text-primary">{h.name}</p>
                  <p className="text-xs font-mono text-text-muted">
                    {new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <LifefulCalendarAgenda
        selectedDateLabel={new Date().toISOString().slice(0, 10)}
        isToday={true}
        items={rules.slice(0, 6).map((r) => ({
          id: r.id,
          title: r.name,
          category: r.policy ?? "gate_rule",
          timeRange:
            r.start_time || r.end_time
              ? `${r.start_time ?? "—"}–${r.end_time ?? "—"}`
              : null,
          location: r.gate_id ?? "All Gates",
          status: "active",
        }))}
        quickLinks={[
          { label: "Gate Config", href: "/sysadmin/gates" },
          { label: "Maintenance", href: "/sysadmin/maintenance" },
        ]}
      />
    </div>
  );
}

export default function SysadminGateSchedulePage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SysadminGateScheduleInner />
    </AuthGuard>
  );
}
