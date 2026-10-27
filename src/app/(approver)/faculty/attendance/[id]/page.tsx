"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiResource } from "@/hooks/useApiResource";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";

/* /api/faculty/attendance response */
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
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
        Loading attendance&hellip;
      </div>
    );
  }

  const rate = summary?.overallAttendanceRate ?? 0;
  const present = summary?.presentToday ?? 0;
  const absent = summary?.absentCount ?? 0;

  // Weekly heatmap: 7 days, each cell colored by the (synthetic) rate.
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-4 p-2 min-w-0">
      {details ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Attendance
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
            Year {details.year} &middot; {details.section}
            {details.name ? ` · ${details.name}` : ""}
          </p>
        </div>
      ) : null}

      {/* Today's counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{present}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Absent
          </p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{absent}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
            Rate
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{rate}%</p>
        </div>
      </div>

      {/* Weekly heatmap (7 columns) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
          This week
        </p>
        <div className="grid grid-cols-7 gap-1.5 min-w-0">
          {days.map((d, i) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{d}</span>
              <div
                className="w-full aspect-square rounded-lg"
                style={{
                  backgroundColor:
                    i === 6
                      ? "rgba(100,116,139,0.15)" // Sat/Sun lighter
                      : `rgba(16,185,129,${0.2 + (rate / 100) * 0.6})`,
                }}
                title={`${d}: ${i === 6 ? "—" : `${rate}% present`}`}
              />
            </div>
          ))}
        </div>
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
