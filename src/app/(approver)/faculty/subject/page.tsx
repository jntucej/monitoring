"use client";

/**
 * Subject Faculty console — the subject-scoped scope picker.
 *
 * Mirrors the HOD mount pattern: AuthGuard (faculty, admin, sysadmin) +
 * Suspense/PageLoading wrapping a RoleConsole shell driven by the
 * `subject_faculty` console config.
 *
 * Resolution (GET /api/faculty/my-classes?role=subject_faculty):
 *   - 0 classes            → EmptyState "Not assigned to any class as subject faculty"
 *   - >1 class             → class+subject chip picker; selection persists in the
 *                            URL (?class_id=&subject=) so the feed can deep-link
 *   - 1 class              → auto-select the first subject, render the feed
 *
 * Board is attendance-first: a vertical feed of today's period attendance for
 * the selected class+subject (roster + today present/absent via
 * /api/faculty/my-class/[id]). No KPI cards, no charts, no horizontal scroll.
 * Subject faculty has no permission-approval rights, so no approval queue.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import type { MyClass, ClassOverview } from "@/contracts/classes";
import type { PermissionItem } from "@/components/approver/PermissionRow";

interface MyClassResponse {
  success: boolean;
  data: MyClass[];
  total?: number;
}

/**
 * Attendance-first feed for the selected class+subject.
 *
 * Prefers the my-class overview (roster + today present/absent). Because there
 * is no dedicated "today's period attendance for class+subject" feed API, the
 * permission queue is surfaced as a read-only fallback when the my-class
 * overview is unavailable — subject faculty cannot approve.
 */
function AttendanceFeed({
  classId,
  subject,
}: {
  classId: string | null;
  subject: string | null;
}) {
  const overviewSource = classId ? `/api/faculty/my-class/${classId}` : null;
  const { data: overviewData, loading: overviewLoading, error: overviewError, refresh } =
    useApiResource<{ success: boolean; data: ClassOverview }>(overviewSource, { ttlMs: 15_000 });

  // Read-only permission fallback (PENDING only, no approve/reject affordances).
  const permSource = "/api/permissions?status=PENDING";
  const { data: permData, loading: permLoading } = useApiResource<{
    success?: boolean;
    data: PermissionItem[];
    total?: number;
  }>(permSource, { ttlMs: 15_000 });

  const overview = overviewData?.data ?? null;
  const permissionItems: PermissionItem[] = useMemo(
    () => (permData && Array.isArray(permData.data) ? permData.data : []),
    [permData],
  );

  if (!classId) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        Select a class and subject to see today&apos;s attendance.
      </div>
    );
  }

  if (overviewLoading && !overview) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading today&apos;s attendance&hellip;
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="space-y-3 p-4 min-w-0">
        <div className="py-4 px-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg">
          Attendance overview unavailable: {overviewError}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <Users className="w-3.5 h-3.5" />
          <span>
            Showing the read-only pending queue for your subject as a fallback
            (subject faculty cannot approve).
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-auto rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Retry
          </button>
        </div>
        <PermissionFallback items={permissionItems} loading={permLoading} subject={subject} />
      </div>
    );
  }

  // Primary: roster + today's attendance.
  const roster = overview?.students ?? [];
  const present = overview?.todayPresent ?? 0;
  const absent = overview?.todayAbsent ?? 0;
  const total = overview?.totalStudents ?? roster.length;

  return (
    <div className="space-y-4 p-4 min-w-0">
      {/* Today summary line (not KPI cards) */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {overview?.classRow
              ? `Y${overview.classRow.year}-${overview.classRow.section}`
              : classId}
          </span>
        </span>
        {subject ? (
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold text-[var(--action-primary)]">{subject}</span>
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="tabular-nums text-emerald-400 font-bold">{present}</span>
          <span>present</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="tabular-nums text-rose-400 font-bold">{absent}</span>
          <span>absent</span>
        </span>
        <span className="tabular-nums">/ {total} students</span>
      </div>

      {/* Roster vertical feed — cards, no horizontal scroll */}
      <div className="grid grid-cols-1 gap-2">
        {roster.length === 0 ? (
          <EmptyState
            title="No students in this class"
            description="The roster is empty for the selected class."
          />
        ) : (
          roster.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {s.name || "Unnamed student"}
                </p>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Roll {s.roll || "—"}
                  {s.year != null ? ` · Y${s.year}` : ""}
                  {s.section ? ` · ${s.section}` : ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Read-only fallback: pending permissions for the subject's workflow. */
function PermissionFallback({
  items,
  loading,
  subject,
}: {
  items: PermissionItem[];
  loading: boolean;
  subject: string | null;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading&hellip;
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending items"
        description={`No pending ${subject ?? "subject"} requests are visible to you right now.`}
      />
    );
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id || item.ticket_number}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold text-[var(--action-primary)]">
              {item.ticket_number}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.workflow_type}</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {item.student?.name || "Unknown student"}
          </p>
        </div>
      ))}
    </div>
  );
}

/** The subject picker UI: chips for class+subject pairs, persisted in the URL. */
function SubjectPicker({
  classes,
  selectedClassId,
  selectedSubject,
  onSelect,
}: {
  classes: MyClass[];
  selectedClassId: string | null;
  selectedSubject: string | null;
  onSelect: (classId: string, subject: string) => void;
}) {
  // One chip per (class, subject) pair. A class with no subjectCodes gets a
  // single "class teacher" chip.
  const chips = useMemo(() => {
    const out: Array<{ classId: string; subject: string; label: string; className: string }> = [];
    for (const c of classes) {
      const className = `Y${c.year}-${c.section}`;
      const codes = c.subjectCodes && c.subjectCodes.length > 0 ? c.subjectCodes : ["teacher"];
      for (const code of codes) {
        out.push({
          classId: c.id,
          subject: code,
          label: code === "teacher" ? `${className} · Class` : `${className} · ${code}`,
          className,
        });
      }
    }
    return out;
  }, [classes]);

  return (
    <div className="space-y-3 p-4 min-w-0">
      <p className="text-xs text-[var(--text-muted)]">
        Select your class and subject to view today&apos;s attendance:
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = chip.classId === selectedClassId && chip.subject === selectedSubject;
          return (
            <button
              key={`${chip.classId}:${chip.subject}`}
              type="button"
              onClick={() => onSelect(chip.classId, chip.subject)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-[var(--action-primary)]/50 bg-[var(--action-primary)]/15 text-[var(--action-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--action-primary)]/40"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubjectFacultyInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: myClassData, loading, error } = useApiResource<MyClassResponse>(
    "/api/faculty/my-classes?role=subject_faculty",
    { ttlMs: 30_000 },
  );

  const classes = useMemo<MyClass[]>(() => {
    if (!myClassData || !myClassData.success) return [];
    return Array.isArray(myClassData.data) ? myClassData.data : [];
  }, [myClassData]);

  // URL-persisted selection.
  const urlClassId = searchParams.get("class_id") ?? null;
  const urlSubject = searchParams.get("subject") ?? null;

  const [selectedClassId, setSelectedClassId] = useState<string | null>(urlClassId);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(urlSubject);

  // Sync from URL on mount / on external navigation.
  // (useEffect would be ideal, but a light re-sync on param change is enough.)
  const classId = urlClassId ?? selectedClassId;
  const subject = urlSubject ?? selectedSubject;

  const handleSelect = useCallback(
    (classId: string, subj: string) => {
      setSelectedClassId(classId);
      setSelectedSubject(subj);
      const params = new URLSearchParams();
      params.set("class_id", classId);
      params.set("subject", subj);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  // Auto-select when exactly one class (and one subject) — no picker shown.
  const autoSelect = useMemo(() => {
    if (classes.length === 1) {
      const c = classes[0];
      const subj = c.subjectCodes && c.subjectCodes.length > 0 ? c.subjectCodes[0] : "teacher";
      return { classId: c.id, subject: subj };
    }
    return null;
  }, [classes]);

  // Kick the auto-select in an effect (not during render) so we don't mutate
  // the URL mid-render and trigger a hydration mismatch. Only when no URL
  // selection has been provided yet.
  useEffect(() => {
    if (!loading && !error && autoSelect && !urlClassId) {
      handleSelect(autoSelect.classId, autoSelect.subject);
    }
  }, [loading, error, autoSelect, urlClassId, handleSelect]);

  const content = (
    <div className="min-w-0">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your assignments&hellip;
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="py-4 px-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            Failed to load your class assignments: {error}
          </div>
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="Not assigned to any class as subject faculty"
          description="Your department head can assign you to a class and subject. You will see attendance here once you are assigned."
        />
      ) : (
        <>
          {/* Picker only when there is more than one class. */}
          {classes.length > 1 && !classId ? (
            <WidgetBoundary title="Subject scope picker">
              <SubjectPicker
                classes={classes}
                selectedClassId={classId}
                selectedSubject={subject}
                onSelect={handleSelect}
              />
            </WidgetBoundary>
          ) : null}

          {classId ? (
            <>
              {classes.length > 1 ? (
                <div className="flex items-center justify-between gap-3 px-4 pt-4 text-xs text-[var(--text-muted)]">
                  <span>
                    Viewing{" "}
                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                      {classes.find((c) => c.id === classId)
                        ? `Y${classes.find((c) => c.id === classId)!.year}-${classes.find((c) => c.id === classId)!.section}`
                        : classId}
                    </span>{" "}
                    · {subject || "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassId(null);
                      setSelectedSubject(null);
                      router.replace(pathname, { scroll: false });
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" /> Change
                  </button>
                </div>
              ) : null}

              <AttendanceFeed classId={classId} subject={subject} />

              {/* Link to the subject-scoped drilldown for this class. */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() =>
                    router.replace(`${pathname}/${classId}?subject=${encodeURIComponent(subject ?? "")}`, {
                      scroll: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  Open full class drilldown &rarr;
                </button>
              </div>
            </>
          ) : autoSelect ? (
            /* Auto-select is pending: single class, no URL selection yet. */
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Selecting&hellip;
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  return (
    <AuthGuard allowedRoles={["faculty", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <RoleConsole role="subject_faculty" roleRoot="/faculty/subject">
          {content}
        </RoleConsole>
        <DevContactStrip />
      </Suspense>
    </AuthGuard>
  );
}

export default function SubjectFacultyPage() {
  return <SubjectFacultyInner />;
}
