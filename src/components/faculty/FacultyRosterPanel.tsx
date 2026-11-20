"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  Pencil,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EditableField } from "@/components/shared/EditableField";
import { RaiseIssueButton } from "@/components/shared/RaiseIssueButton";
import { ScheduleStrip, type ScheduleItem } from "@/components/shared/ScheduleStrip";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface RosterStudent {
  id: string;
  name: string;
  uniqueId: string;
  present: number;
  absent: number;
  unmarked: number;
  total: number;
  pct: number;
}

interface RosterPayload {
  data: {
    classId: string;
    classLabel: string;
    period: string;
    summary: {
      total: number;
      present: number;
      absent: number;
      unmarked: number;
      pct: number;
      lastMonthPct: number | null;
    };
    students: RosterStudent[];
    upcoming: Array<{
      date: string;
      timeIn: string | null;
      timeOut: string | null;
    }>;
    disputes: Array<{
      id: string;
      studentName: string;
      date: string;
      reason: string;
      status: string;
    }>;
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

function StudentRow({
  student,
  onEditPresent,
  onEditAbsent,
}: {
  student: RosterStudent;
  onEditPresent: (id: string, val: string, reason: string) => Promise<void>;
  onEditAbsent: (id: string, val: string, reason: string) => Promise<void>;
}) {
  const tone =
    student.pct >= 75 ? "text-emerald-500" : student.pct >= 60 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
      {/* Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Users className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{student.name}</p>
          <p className="text-xs text-text-muted">{student.uniqueId}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs text-emerald-500 tabular-nums">
            <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
            {student.present}
          </p>
          <p className="text-xs text-rose-500 tabular-nums">
            <XCircle className="h-3 w-3 inline mr-0.5" />
            {student.absent}
          </p>
        </div>
        <div className={cn("text-lg font-bold tabular-nums w-12 text-right", tone)}>
          {student.pct}%
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export function FacultyRosterPanel({ classId }: { classId: string }) {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();

  const [data, setData] = useState<RosterPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/faculty/attendance/roster?classId=${classId}&period=${period.key === "all-time" ? "all-time" : period.key}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) {
        throw new Error(body?.message ?? "Failed to load roster");
      }
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [classId, period.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEditPresent = async (studentId: string, val: string, reason: string) => {
    await fetch(`/api/faculty/attendance/roster/${studentId}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ field: "present", value: val, reason }),
    });
    setEditingStudent(null);
    void load();
  };

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.students.map((s) => ({
        name: s.name,
        uniqueId: s.uniqueId,
        present: s.present,
        absent: s.absent,
        pct: s.pct,
      })),
      [
        { key: "name", header: "Name" },
        { key: "uniqueId", header: "UID" },
        { key: "present", header: "Present" },
        { key: "absent", header: "Absent" },
        { key: "pct", header: "Percent" },
      ],
      `roster_${data.classLabel?.replace(/\s/g, "_") ?? "class"}.csv`
    );
  };

  const upcomingItems: ScheduleItem[] = (data?.upcoming ?? []).map((u, i) => ({
    id: `${u.date}-${i}`,
    title: `${data?.classLabel ?? "Class"}`,
    subtitle: u.timeIn ? `${u.timeIn}–${u.timeOut}` : undefined,
    start: `${u.date}T${u.timeIn ?? "09:00:00"}`,
    end: `${u.date}T${u.timeOut ?? "10:00:00"}`,
  }));

  return (
    <WidgetBoundary name="FacultyRosterPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {data?.classLabel ?? "Class Roster"}
              </h2>
              <p className="text-xs text-text-muted">
                {data ? `${data.students.length} students` : "Loading…"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data}
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        {/* Period picker */}
        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Data */}
        {data && !loading && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-5 py-3">
              <div className="flex items-center gap-4">
                <DeltaBadge
                  value={data.summary.pct}
                  reference={data.summary.lastMonthPct}
                  label="vs last month"
                />
                <span className="text-2xl font-bold text-text-primary tabular-nums">
                  {data.summary.pct}%
                </span>
                <span className="text-xs text-text-muted">
                  {data.summary.present}p · {data.summary.absent}a · {data.summary.unmarked}u
                </span>
              </div>
              <span className="text-xs text-text-muted">{data.period}</span>
            </div>

            {/* Upcoming */}
            {upcomingItems.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Next classes</p>
                <ScheduleStrip items={upcomingItems} />
              </div>
            )}

            {/* Disputes */}
            {data.disputes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Dispute queue</p>
                <div className="space-y-1.5">
                  {data.disputes.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 rounded-lg bg-rose-500/5 border border-rose-500/15 px-3 py-2 text-xs"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="font-medium text-text-primary">{d.studentName}</span>
                      <span className="text-text-secondary flex-1 truncate">{d.reason}</span>
                      <span className="text-text-muted tabular-nums shrink-0">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student list */}
            <div className="space-y-1.5">
              {data.students.length === 0 ? (
                <EmptyState title="No students in this class" />
              ) : (
                data.students.map((s) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    onEditPresent={(sid, val, reason) => handleEditPresent(sid, val, reason)}
                    onEditAbsent={(sid, val, reason) => handleEditPresent(sid, val, reason)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default FacultyRosterPanel;
