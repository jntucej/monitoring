"use client";

/**
 * ClassRoster — 1.12 extracted roster component for the faculty subject drilldown.
 *
 * Renders the class header (year/section + today's counts) and the roster as a
 * responsive card grid (no horizontal scroll). Selecting a student calls
 * `onSelect` with that student's row; the parent owns the selection state so
 * the RoleConsole shell never re-mounts on a roster click.
 */

import { useCallback } from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiResource } from "@/hooks/useApiResource";
import type { ClassOverview } from "@/contracts/classes";

interface OverviewResponse {
  success: boolean;
  data: ClassOverview;
  error?: { code: string; message: string };
}

export function ClassRoster({
  classId,
  subject,
  onSelect,
}: {
  classId: string;
  subject: string | null;
  onSelect: (studentId: string) => void;
}) {
  const source = `/api/faculty/my-class/${classId}`;
  const { data, loading, error, refresh } = useApiResource<OverviewResponse>(source, {
    ttlMs: 15_000,
  });

  const overview = data?.data ?? null;
  const forbidden = data?.success === false && data?.error?.code === "FORBIDDEN";

  const handleSelect = useCallback(
    (stu: ClassOverview["students"][number]) => {
      onSelect(stu.id);
    },
    [onSelect],
  );

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading class&hellip;
      </div>
    );
  }

  if (forbidden || (data && !data.success && !loading)) {
    const msg = data?.error?.message || "You are not assigned to this class";
    return (
      <div className="p-4 space-y-3">
        {forbidden ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Not assigned to this class"
            description={msg}
          />
        ) : (
          <div className="py-4 px-3 text-xs text-action-warning bg-amber-400/10 border border-amber-400/20 rounded-lg">
            Failed to load this class: {msg}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-3 rounded-md border border-border bg-bg-elevated px-2 py-0.5 text-[11px] text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!overview) {
    return (
      <EmptyState
        title="No class data"
        description="The class overview is empty or unavailable."
      />
    );
  }

  const roster = overview.students;
  const present = overview.todayPresent;
  const absent = overview.todayAbsent;
  const total = overview.totalStudents;
  const cls = overview.classRow;

  void error;

  return (
    <div className="space-y-4 p-4 min-w-0">
      {/* Class header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-4 h-4 text-action-primary shrink-0" />
          <span className="font-mono font-semibold text-text-primary truncate">
            {`Y${cls.year}-${cls.section}`}
            {cls.name ? ` · ${cls.name}` : ""}
          </span>
          {subject ? (
            <span className="inline-flex items-center gap-1 text-text-muted">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-mono">{subject}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-text-muted">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-action-success" />
            <span className="tabular-nums text-action-success font-bold">{present}</span> present
          </span>
          <span className="inline-flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-action-danger" />
            <span className="tabular-nums text-action-danger font-bold">{absent}</span> absent
          </span>
          <span className="tabular-nums">/ {total}</span>
        </div>
      </div>

      {/* Today's attendance note for the caller's subject */}
      <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-[11px] text-text-muted">
        Today&apos;s attendance for{" "}
        <span className="font-mono font-semibold text-action-primary">
          {subject ?? "your subject"}
        </span>
        : {present} present, {absent} absent of {total} students.
      </div>

      {/* Roster — cards, no horizontal scroll */}
      <div className="grid grid-cols-1 gap-2">
        {roster.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No students in this class"
            description="The roster is empty for the selected class."
          />
        ) : (
          roster.map((stu) => (
            <button
              key={stu.id}
              type="button"
              onClick={() => handleSelect(stu)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2 min-w-0 text-left hover:border-action-primary/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-text-primary">
                  {stu.name || "Unnamed student"}
                </p>
                <p className="text-[11px] font-mono text-text-muted">
                  Roll {stu.roll || "—"}
                  {stu.year != null ? ` · Y${stu.year}` : ""}
                  {stu.section ? ` · ${stu.section}` : ""}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-text-muted" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export { PageLoading };
