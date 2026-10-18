"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock, CalendarX,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gates/schedule", { headers: getAuthHeaders() });
      const body = await res.json();
      setRules((body?.data?.rules ?? []) as RuleRow[]);
      setHolidays((body?.data?.holidays ?? []) as HolidayRow[]);
    } catch (e) {
      console.error("gate-schedule", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
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
                  <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-3 text-left">Rule</th>
                    <th className="p-3 text-left">Gate</th>
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-left">Window</th>
                    <th className="p-3 text-left">Policy</th>
                    <th className="p-3 text-center">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                      <td className="p-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">{r.gate_id ?? "all"}</td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">
                        {r.day_of_week != null ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][r.day_of_week] : "—"}
                      </td>
                      <td className="p-3 font-mono text-xs text-[var(--text-muted)]">
                        {r.start_time ? `${r.start_time}–${r.end_time ?? ""}` : "—"}
                      </td>
                      <td className="p-3 text-xs text-[var(--text-muted)] capitalize">{r.policy ?? "—"}</td>
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
            <div className="divide-y divide-[var(--border)]">
              {holidays.map((h) => (
                <div key={h.id} className="p-3 flex items-center gap-3">
                  <CalendarX className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <p className="flex-1 text-sm text-[var(--text-primary)]">{h.name}</p>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    {new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>
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
