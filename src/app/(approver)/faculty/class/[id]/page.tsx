"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiResource } from "@/hooks/useApiResource";
import { Loader2, GraduationCap, User } from "lucide-react";

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
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
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
      {details ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Class
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
            Year {details.year} &middot; {details.section}
            {details.name ? ` · ${details.name}` : ""}
            {details.capacity != null ? ` · cap ${details.capacity}` : ""}
          </p>
        </div>
      ) : null}

      {/* Desktop table / mobile cards */}
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden min-w-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Student</th>
              <th className="text-left px-3 py-2 font-bold">Roll</th>
              <th className="text-left px-3 py-2 font-bold">Year / Sec</th>
              <th className="text-left px-3 py-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {students.map((s) => (
              <tr
                key={s.id}
                className={selected === s.id ? "bg-[var(--action-primary)]/10" : "hover:bg-[var(--bg-elevated)]"}
              >
                <td className="px-3 py-2 text-[var(--text-primary)] font-medium">{s.name}</td>
                <td className="px-3 py-2 text-[var(--text-muted)] font-mono">{s.roll}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">
                  {s.year != null ? `Y${s.year}` : "—"} / {s.section || "—"}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/person?roll=${encodeURIComponent(s.roll)}`}
                    onClick={() => setSelected(s.id)}
                    className="text-xs font-semibold text-[var(--action-primary)] hover:underline"
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
            className={`rounded-xl border p-3 min-w-0 ${selected === s.id ? "border-[var(--action-primary)]/40 bg-[var(--action-primary)]/5" : "border-[var(--border)] bg-[var(--bg-surface)]"}`}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  {s.roll} · {s.year != null ? `Y${s.year}` : "—"} / {s.section || "—"}
                </p>
              </div>
              <Link
                href={`/person?roll=${encodeURIComponent(s.roll)}`}
                onClick={() => setSelected(s.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--action-primary)] shrink-0"
              >
                <User className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </div>
        ))}
      </div>
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
