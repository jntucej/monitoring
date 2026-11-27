"use client";

import { Suspense, useState, lazy } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { useToast } from "@/components/ui/toast";
import { Loader2, GraduationCap, User, Users } from "lucide-react";
import {
  AttendanceStatusBoard,
  type RosterPayload,
  type RosterStudent,
} from "@/components/faculty/AttendanceStatusBoard";
import { StudentPicker, type PickerStudent } from "@/components/faculty/StudentPicker";

const FacultyRosterPanel = lazy(() => import("@/components/faculty/FacultyRosterPanel"));

/* /api/classes/[id]/students response */
interface StudentRow {
  id: string;
  name: string;
  roll: string;
  year: number | null;
  section: string | null;
}
interface StudentsResponse {
  success: boolean;
  data: StudentRow[];
}

/* /api/classes/[id] response (camelCase ClassRow) */
interface ClassDetails {
  success: boolean;
  data: {
    id: string;
    departmentId: string;
    year: number;
    section: string;
    name: string | null;
    capacity: number | null;
  };
}

/**
 * Class roster drilldown — G5.
 *
 * Fetches the class details + roster for [id]. Desktop: table; mobile:
 * stacked cards (no horizontal scroll). Each student links to the person
 * view. 404/403 from the API surfaces as an EmptyState.
 */
function ClassRosterInner() {
  const params = useParams<{ id: string }>();
  const classId = typeof params?.id === "string" ? params.id : "";
  const [selected, setSelected] = useState<string | null>(null);

  const {
    data: cls,
    loading: clsLoading,
    error: clsError,
  } = useApiResource<ClassDetails>(`/api/classes/${encodeURIComponent(classId)}`, {
    ttlMs: 30_000,
  });
  const {
    data: roster,
    loading: rosterLoading,
    error: rosterError,
  } = useApiResource<StudentsResponse>(
    `/api/classes/${encodeURIComponent(classId)}/students`,
    { ttlMs: 30_000 },
  );

  const students = roster?.data ?? [];
  const details = cls?.data;

  // Board 1: class attendance roster (real per-student present/absent/unmarked
  // + period). Drives the StatusBoard + StudentPicker below via a single
  // page-level inspector (one drawer, never stacked).
  const {
    data: rosterRaw,
    loading: attRosterLoading,
    error: attRosterError,
    refresh: attRosterRefresh,
  } = useApiResource<{ success: boolean; data: RosterPayload }>(
    `/api/faculty/attendance/roster?classId=${encodeURIComponent(classId)}&period=this-month`,
    { ttlMs: 15_000 },
  );
  const attRoster = rosterRaw?.data ?? null;

  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { addToast } = useToast();

  const inspectStudent = (s: RosterStudent) => {
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
  const refreshRoster = () => {
    clearCache();
    void attRosterRefresh();
  };
  const pickerStudents: PickerStudent[] = (attRoster?.students ?? []).map((s) => ({
    id: s.id, name: s.name, roll: s.roll, section: details?.section,
  }));

  if (clsError || rosterError) {
    return (
      <EmptyState
        title="Could not load this class"
        description={String(clsError ?? rosterError)}
      />
    );
  }

  if (details && (!details || details.id === "")) {
    return <EmptyState title="Class not found" description="This class does not exist." />;
  }

  if (clsLoading || rosterLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
        Loading roster&hellip;
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students in this class"
        description="The roster is empty for this class."
      />
    );
  }

  return (
    <div className="space-y-4 p-2 min-w-0">
      <ContextSituationBar
        roleLabel="Faculty · Roster"
        purpose="Review enrolled students, profile summaries, and roll identifiers for this class."
        why="Inspecting individual class rosters ensures accurate attendance recording and direct student communication."
        contextLabel={details ? `Year ${details.year} · ${details.section}` : "Class Roster"}
        statusTone="info"
        statusPill={`${students.length} students`}
        statusSummary={`Enrolled student roster for Year ${details?.year ?? ""} ${details?.section ?? ""}. Select a student to inspect.`}
        primaryAction={{ label: "View Attendance", href: `/faculty/attendance/${classId}` }}
        secondaryActions={[
          { label: "My Classes", href: "/faculty/my-classes" },
          { label: "Directory", href: "/faculty/student-directory" },
        ]}
      />
      {/* Attendance analytics panel */}
      <Suspense fallback={<PageLoading />}>
        <FacultyRosterPanel classId={classId} />
      </Suspense>

      {details ? (
        <div className="surface-card bg-bg-surface p-3 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Class
          </p>
          <p className="text-sm font-semibold text-text-primary mt-1">
            Year {details.year} &middot; {details.section}
            {details.name ? ` · ${details.name}` : ""}
            {details.capacity != null ? ` · cap ${details.capacity}` : ""}
          </p>
        </div>
      ) : null}

      {/* Desktop table / mobile cards */}
      <div className="hidden md:block rounded-xl border border-border bg-bg-surface overflow-hidden min-w-0">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Student</th>
              <th className="text-left px-3 py-2 font-bold">Roll</th>
              <th className="text-left px-3 py-2 font-bold">Year / Sec</th>
              <th className="text-left px-3 py-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => (
              <tr
                key={s.id}
                className={selected === s.id ? "bg-action-primary/10" : "hover:bg-bg-elevated"}
              >
                <td className="px-3 py-2 text-text-primary font-medium">{s.name}</td>
                <td className="px-3 py-2 text-text-muted font-mono">{s.roll}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {s.year != null ? `Y${s.year}` : "—"} / {s.section || "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/person?roll=${encodeURIComponent(s.roll)}`}
                    onClick={() => setSelected(s.id)}
                    className="text-xs font-semibold text-action-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2 min-w-0">
        {students.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border p-3 min-w-0 ${selected === s.id ? "border-action-primary/40 bg-action-primary/5" : "border-border bg-bg-surface"}`}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{s.name}</p>
                <p className="text-xs text-text-muted font-mono">
                  {s.roll} · {s.year != null ? `Y${s.year}` : "—"} / {s.section || "—"}
                </p>
              </div>
              <Link
                href={`/person?roll=${encodeURIComponent(s.roll)}`}
                onClick={() => setSelected(s.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-action-primary shrink-0"
              >
                <User className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Board 1 — attendance status board + student picker (real roster) */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Attendance Status
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="surface-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-elev-2 min-h-8"
        >
          Select student
        </button>
      </div>

      <AttendanceStatusBoard
        data={attRoster}
        loading={attRosterLoading}
        error={attRosterError}
        canMark
        classId={classId}
        onInspect={inspectStudent}
        onMutated={() => {
          refreshRoster();
          addToast({ message: "Attendance updated.", variant: "success" });
        }}
        onMutationError={(msg) => addToast({ message: msg, variant: "error" })}
      />

      <StudentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        students={pickerStudents}
        onSelect={(s) => {
          setPickerOpen(false);
          const real = attRoster?.students.find((r) => r.id === s.id);
          inspectStudent(
            real ?? { id: s.id, name: s.name, roll: s.roll, present: 0, absent: 0, unmarked: 0, pct: 0 },
          );
        }}
      />
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function ClassRosterPage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ClassRosterInner />
      </Suspense>
    </AuthGuard>
  );
}
