"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useApiResource } from "@/hooks/useApiResource";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";

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

  const summary = att?.summary;
  const details = cls?.data;

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

      {/* Today's counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
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
