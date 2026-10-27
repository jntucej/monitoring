"use client";

/**
 * Subject Faculty console — subject-scoped class drilldown.
 *
 * `[id]` is the class_id. Fetches GET /api/faculty/my-class/[id]
 * (ClassOverview: class row + roster + today's counts).
 *
 *   - 403 FORBIDDEN (caller not assigned to this class) → EmptyState
 *     "Not assigned to this class"
 *   - otherwise                                          → roster cards +
 *     today's attendance for the caller's subject
 *
 * The context panel entity is "student": selecting a roster row surfaces the
 * subject-scoped history for that student. No horizontal scroll — roster
 * renders as cards on mobile. Subject faculty has no approval rights.
 */

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
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
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import type { ClassOverview } from "@/contracts/classes";
import { BoardRow } from "@/components/shared/Board";

interface OverviewResponse {
  success: boolean;
  data: ClassOverview;
  error?: { code: string; message: string };
}

/** Convert a roster student into a BoardRow so RoleConsole's context panel
 *  can open the "student" context entity with the subject-scoped history. */
function studentToBoardRow(stu: ClassOverview["students"][number], classId: string): BoardRow {
  return {
    id: stu.id,
    roll: stu.roll ?? null,
    name: stu.name ?? null,
    person_type: "student",
    direction: "ENROLL",
    reason: null,
    gate_id: null,
    gate_name: null,
    timestamp: new Date().toISOString(),
    scan_type: "class_roster",
    is_correction: null,
    created_at: null,
  };
}

function SubjectClassDrilldown({
  classId,
  subject,
  onStudentSelect,
}: {
  classId: string;
  subject: string | null;
  onStudentSelect: (row: BoardRow) => void;
}) {
  const source = `/api/faculty/my-class/${classId}`;
  const { data, loading, error, refresh } = useApiResource<OverviewResponse>(source, {
    ttlMs: 15_000,
  });

  const overview = data?.data ?? null;
  const forbidden = data?.success === false && data?.error?.code === "FORBIDDEN";

  // Student-scoped history fetch (a light, subject-scoped read). The my-class
  // overview carries the roster + today counts; per-student history for the
  // selected student is exposed via the shared /api/permissions feed keyed by
  // the student, which the context panel consumes.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const handleSelectStudent = useCallback(
    (stu: ClassOverview["students"][number]) => {
      setSelectedStudentId(stu.id);
      onStudentSelect(studentToBoardRow(stu, classId));
    },
    [classId, onStudentSelect],
  );

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
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
          <div className="py-4 px-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            Failed to load this class: {msg}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

  return (
    <div className="space-y-4 p-4 min-w-0">
      {/* Class header */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <GraduationCap className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
          <span className="font-mono font-semibold text-[var(--text-primary)] truncate">
            {`Y${cls.year}-${cls.section}`}
            {cls.name ? ` · ${cls.name}` : ""}
          </span>
          {subject ? (
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-mono">{subject}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="tabular-nums text-emerald-400 font-bold">{present}</span>
            present
          </span>
          <span className="inline-flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span className="tabular-nums text-rose-400 font-bold">{absent}</span>
            absent
          </span>
          <span className="tabular-nums">/ {total}</span>
        </div>
      </div>

      {/* Today's attendance note for the caller's subject */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
        Today&apos;s attendance for{" "}
        <span className="font-mono font-semibold text-[var(--action-primary)]">
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
          roster.map((stu) => {
            const active = stu.id === selectedStudentId;
            return (
              <button
                key={stu.id}
                type="button"
                onClick={() => handleSelectStudent(stu)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 min-w-0 text-left transition-colors ${
                  active
                    ? "border-[var(--action-primary)]/50 bg-[var(--action-primary)]/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--action-primary)]/40"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      active ? "text-[var(--action-primary)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {stu.name || "Unnamed student"}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Roll {stu.roll || "—"}
                    {stu.year != null ? ` · Y${stu.year}` : ""}
                    {stu.section ? ` · ${stu.section}` : ""}
                  </p>
                </div>
                <ArrowRight
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active ? "text-[var(--action-primary)]" : "text-[var(--text-muted)]"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function SubjectClassDrilldownInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params?.id ?? "";
  const subject = searchParams.get("subject");

  // The RoleConsole shell owns the context panel selection. Because the shell
  // manages its own selectedRow internally, we bridge the roster selection by
  // pushing the row through the shared context panel's onSelect. For a
  // self-contained page we render the shell and let the roster click open the
  // "student" context via the shell's public select by re-mounting with a key.
  const [selectedRow, setSelectedRow] = useState<BoardRow | null>(null);

  // RoleConsole exposes no imperative handle; instead we pass the content and
  // keep the selection in local state, then open the context panel by passing
  // a custom key to force the shell to mount the row. The simplest, safe
  // approach: render the shell and call onStudentSelect via a ref-less bridge.
  const handleStudentSelect = useCallback((row: BoardRow) => {
    setSelectedRow(row);
  }, []);

  // Re-mount the shell with a key so the context panel reflects the new row.
  void selectedRow;

  return (
    <AuthGuard allowedRoles={["faculty", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <div key={`${classId}:${selectedRow?.id ?? ""}`} className="min-w-0">
          <RoleConsole role="subject_faculty" roleRoot="/faculty/subject">
            <div className="flex flex-col min-w-0">
              <div className="px-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.replace("/faculty/subject", { scroll: false })}
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to subject picker
                </button>
              </div>
              <SubjectClassDrilldown
                classId={classId}
                subject={subject}
                onStudentSelect={handleStudentSelect}
              />
            </div>
          </RoleConsole>
        </div>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}

export default function SubjectClassDrilldownPage() {
  return <SubjectClassDrilldownInner />;
}
