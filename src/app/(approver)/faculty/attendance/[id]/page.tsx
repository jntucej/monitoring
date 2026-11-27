"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { useToast } from "@/components/ui/toast";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import {
  AttendanceStatusBoard,
  type RosterPayload,
  type RosterStudent,
} from "@/components/faculty/AttendanceStatusBoard";
import {
  AttendanceDateRatioPanel,
  type PeriodKey,
  PERIODS,
} from "@/components/faculty/AttendanceDateRatioPanel";
import { WeeklyTimetableGrid, type UpcomingSession } from "@/components/faculty/WeeklyTimetableGrid";
import { StudentPicker, type PickerStudent } from "@/components/faculty/StudentPicker";

/* /api/faculty/attendance response */
interface HeatmapDay {
  date: string;
  dayLabel: string;
  status: "ON_TIME" | "LATE" | "INSIDE" | "ABSENT" | "WEEKEND";
  inTime: string | null;
  outTime: string | null;
  hours: number;
}
interface FacultyRecord {
  id: string;
  attendanceRate: number;
  attendanceHeatmap: HeatmapDay[];
}
interface FacultyAttendance {
  success: boolean;
  summary: {
    totalFaculty: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    lateArrivals: number;
    absentCount: number;
    overallAttendanceRate: number;
  };
  records: FacultyRecord[];
}

/**
 * Class attendance view — G5.
 *
 * [id] is the class id. Fetches the class details + today's faculty
 * attendance summary. Renders today's present/absent counts + a simple
 * weekly heatmap (7 columns). No horizontal scroll; cards stack on mobile.
 */
function ClassAttendanceInner() {
  const params = useParams<{ id: string }>();
  const classId = typeof params?.id === "string" ? params.id : "";

  const {
    data: cls,
    loading: clsLoading,
    error: clsError,
  } = useApiResource<{ success: boolean; data: { id: string; year: number; section: string; name: string | null } }>(
    `/api/classes/${encodeURIComponent(classId)}`,
    { ttlMs: 30_000 },
  );

  const {
    data: att,
    loading: attLoading,
    error: attError,
  } = useApiResource<FacultyAttendance>("/api/faculty/attendance", { ttlMs: 30_000 });

  // Class roster (Board 1 data source: per-student present/absent/unmarked +
  // period + upcoming sessions). Refetched on period change.
  const [period, setPeriod] = useState<PeriodKey>("this-month");
  const periodParam = PERIODS.find((p) => p.key === period)?.param ?? "this-month";
  const {
    data: rosterRaw,
    loading: rosterLoading,
    error: rosterError,
    refresh: rosterRefresh,
  } = useApiResource<{ success: boolean; data: RosterPayload }>(
    `/api/faculty/attendance/roster?classId=${encodeURIComponent(classId)}&period=${periodParam}`,
    { ttlMs: 15_000 },
  );
  const roster = rosterRaw?.data ?? null;

  // Single page-level inspector controller — roster rows, picker selections
  // and session taps all route through it (one drawer, never stacked).
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { addToast } = useToast();

  const summary = att?.summary;
  const details = cls?.data;

  // Build inspector payloads from real roster rows / sessions.
  const inspectRosterStudent = (s: RosterStudent) => {
    inspect({
      kind: "student",
      title: s.name,
      subtitle: `${s.roll} · ${s.pct}% present`,
      sections: [
        {
          title: "Attendance",
          content: (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-bg-elev-1 p-2 text-center"><div className="font-mono text-text-primary">{s.present}</div><div className="text-text-muted">present</div></div>
              <div className="rounded-lg bg-bg-elev-1 p-2 text-center"><div className="font-mono text-text-primary">{s.absent}</div><div className="text-text-muted">absent</div></div>
              <div className="rounded-lg bg-bg-elev-1 p-2 text-center"><div className="font-mono text-text-primary">{s.unmarked}</div><div className="text-text-muted">unmarked</div></div>
            </div>
          ),
        },
      ],
      detailHref: `/person?roll=${encodeURIComponent(s.roll)}`,
      detailLabel: "Open student record",
    });
  };
  const inspectSession = (sess: UpcomingSession) => {
    inspect({
      kind: "session",
      title: `Session · ${sess.date}`,
      subtitle: `${sess.timeIn ?? "–"}${sess.timeOut ? `–${sess.timeOut}` : ""}`,
      sections: [
        {
          title: "Details",
          content: (
            <div className="text-xs text-text-secondary space-y-1">
              <p>Date: {sess.date}</p>
              <p>Window: {sess.timeIn ?? "—"} to {sess.timeOut ?? "—"}</p>
            </div>
          ),
        },
      ],
    });
  };

  const refreshRoster = () => {
    clearCache();
    void rosterRefresh();
  };
  const pickerStudents: PickerStudent[] = (roster?.students ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    roll: s.roll,
    section: details?.section,
  }));

  if (clsError || attError) {
    return (
      <EmptyState
        title="Could not load attendance"
        description={String(clsError ?? attError)}
      />
    );
  }

  if (clsLoading || attLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
        Loading attendance&hellip;
      </div>
    );
  }

  const rate = summary?.overallAttendanceRate ?? 0;
  const present = summary?.presentToday ?? 0;
  const absent = summary?.absentCount ?? 0;
  const delayed = summary?.lateArrivals ?? 0;

  // Real last-7-days attendance: aggregate each faculty record's
  // attendanceHeatmap (last 7 entries) so the heatmap shows genuine
  // per-day rates derived from movement_logs, not a single repeated number.
  const heatmapDays = buildLastSevenDays(att?.records ?? []);

  function buildLastSevenDays(
    records: FacultyRecord[],
  ): Array<{ label: string; rate: number | null; present: number; total: number }> {
    if (records.length === 0) return [];
    // Each record's attendanceHeatmap is most-recent-last; the trailing 7
    // entries cover the last 7 days. Average the real per-day statuses.
    const out: Array<{ label: string; rate: number | null; present: number; total: number }> = [];
    for (let day = 6; day >= 0; day--) {
      let presentCount = 0;
      let counted = 0;
      let label = "";
      for (const r of records) {
        const cell = r.attendanceHeatmap[r.attendanceHeatmap.length - 1 - day];
        if (!cell) continue;
        label = cell.dayLabel;
        counted += 1;
        // WEEKEND days carry no presence signal; skip them from the rate.
        if (cell.status === "ABSENT" || cell.status === "WEEKEND") continue;
        presentCount += 1;
      }
      const denom = records.length; // total faculty assigned
      out.push({
        label,
        rate: denom > 0 ? Math.round((presentCount / denom) * 100) : null,
        present: presentCount,
        total: counted,
      });
    }
    return out;
  }

  const hasWeeklyData = heatmapDays.some((d) => d.rate !== null && d.present > 0);

  return (
    <div className="space-y-4 p-2 min-w-0">
      <ContextSituationBar
        roleLabel="Faculty · Attendance"
        purpose="Monitor class presence rates and daily check-in counts for assigned students."
        why="Tracking daily roll call preserves reliable attendance benchmarks and flags students nearing low-attendance debarment."
        contextLabel={details ? `Year ${details.year} · ${details.section}` : "Class Attendance"}
        statusTone={rate < 75 ? "warn" : "ok"}
        statusPill={`${rate}% attendance`}
        statusSummary={`${present} present, ${absent} absent recorded today.`}
        primaryAction={{ label: "Class Roster", href: `/faculty/class/${classId}` }}
        secondaryActions={[
          { label: "My Classes", href: "/faculty/my-classes" },
          { label: "Overview", href: "/faculty" },
        ]}
      />
      {details ? (
        <div className="surface-card bg-bg-surface p-3 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Attendance
          </p>
          <p className="text-sm font-semibold text-text-primary mt-1">
            Year {details.year} &middot; {details.section}
            {details.name ? ` · ${details.name}` : ""}
          </p>
        </div>
      ) : null}

      {/* Today's counts — present / absent / delayed / rate */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
        <div className="surface-card bg-emerald-500/5 p-3 min-w-0">
          <p className="text-xs uppercase font-bold tracking-wider text-action-success flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </p>
          <p className="text-2xl font-bold text-action-success mt-1">{present}</p>
        </div>
        <div className="surface-card bg-rose-500/5 p-3 min-w-0">
          <p className="text-xs uppercase font-bold tracking-wider text-action-danger flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Absent
          </p>
          <p className="text-2xl font-bold text-action-danger mt-1">{absent}</p>
        </div>
        <div className="surface-card bg-amber-500/5 p-3 min-w-0">
          <p className="text-xs uppercase font-bold tracking-wider text-action-warning flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Delayed
          </p>
          <p className="text-2xl font-bold text-action-warning mt-1">{delayed}</p>
        </div>
        <div className="surface-card bg-bg-surface p-3 min-w-0">
          <p className="text-xs uppercase font-bold tracking-wider text-text-muted">
            Rate
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1">{rate}%</p>
        </div>
      </div>

      {/* Last-7-days heatmap — real per-day presence from movement_logs */}
      <div className="surface-card bg-bg-surface p-3 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Last 7 days
        </p>
        {hasWeeklyData ? (
          <div className="grid grid-cols-7 gap-1.5 min-w-0">
            {heatmapDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-text-muted font-mono">
                  {d.label ? d.label.split(" ")[0] : "—"}
                </span>
                <div
                  className="w-full aspect-square rounded-lg"
                  style={{
                    backgroundColor:
                      d.rate === null
                        ? "rgba(100,116,139,0.15)"
                        : `rgba(16,185,129,${0.2 + (d.rate / 100) * 0.6})`,
                  }}
                  title={`${d.label || "Day"}: ${
                    d.rate === null ? "no data" : `${d.rate}% present (${d.present})`
                  }`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-text-muted min-h-8">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            No attendance records in the last 7 days.
          </div>
        )}
      </div>

      {/* Board 1 — roster-driven widgets (real /api/faculty/attendance/roster) */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Roster &amp; Schedule
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="surface-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-elev-2 min-h-8"
        >
          Select student
        </button>
      </div>

      <AttendanceDateRatioPanel
        data={roster}
        loading={rosterLoading}
        error={rosterError}
        period={period}
        onPeriodChange={setPeriod}
        onInspectStudent={inspectRosterStudent}
      />

      <AttendanceStatusBoard
        data={roster}
        loading={rosterLoading}
        error={rosterError}
        canMark
        classId={classId}
        onInspect={inspectRosterStudent}
        onMutated={() => {
          refreshRoster();
          addToast({ message: "Attendance updated.", variant: "success" });
        }}
        onMutationError={(msg) => addToast({ message: msg, variant: "error" })}
      />

      <WeeklyTimetableGrid sessions={roster?.upcoming ?? []} onInspectSession={inspectSession} />

      {/* Single inspector + student picker (mutually exclusive overlays) */}
      <StudentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        students={pickerStudents}
        onSelect={(s) => {
          setPickerOpen(false);
          // Use the real roster row (has present/absent/unmarked counts) when
          // available; fall back to the picker's minimal shape otherwise.
          const real = roster?.students.find((r) => r.id === s.id);
          inspectRosterStudent(real ?? {
            id: s.id,
            name: s.name,
            roll: s.roll,
            present: 0,
            absent: 0,
            unmarked: 0,
            pct: 0,
          });
        }}
      />
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function ClassAttendancePage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ClassAttendanceInner />
      </Suspense>
    </AuthGuard>
  );
}
