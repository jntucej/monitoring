"use client";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { Suspense, useCallback } from "react";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
=======
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { useApiResource } from "@/hooks/useApiResource";
import type { MyClass } from "@/contracts/classes";
import { Loader2, BookOpen, PencilLine } from "lucide-react";

/* my-classes response shape */
interface MyClassesResponse {
  success: boolean;
  data: MyClass[];
}

/**
 * Faculty console root (class-teacher scope).
 *
 * Resolves the caller's class scope from GET /api/faculty/my-classes?role=class_teacher:
 *   - 0 rows → EmptyState "Not assigned as class teacher"
 *   - 1 row  → no picker, hardcode that class as the scope
 *   - >1 rows → scope picker (year × section chips) persisted in ?class_id=
 *
 * When a class is resolved, the main column shows the KanbanBoard of the
 * HOD-stage permission queue for that class. All KPI cards / charts /
 * section quick-links are removed to keep the console lean.
 */
function FacultyInner() {
  const searchParams = useSearchParams();
  const selectedClassId = searchParams.get("class_id");

  const {
    data: myClasses,
    loading,
    error,
  } = useApiResource<MyClassesResponse>("/api/faculty/my-classes?role=class_teacher", {
    ttlMs: 30_000,
  });

  const classes = myClasses?.data ?? [];

  if (error) {
    return (
      <div className="p-6 text-sm text-rose-400">
        Failed to load class scope: {error}
      </div>
    );
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
        Resolving your class&hellip;
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="Not assigned as class teacher"
        description="You have no class assigned. Ask your HOD to assign you to a class."
      />
    );
  }

  // Resolve the active class: explicit ?class_id= wins, else the single class.
  const activeClass =
    classes.find((c) => c.id === selectedClassId) ??
    (classes.length === 1 ? classes[0] : null);

  // Kanban board of the HOD-stage permission queue scoped to this class.
  const boardSource = activeClass
    ? `/api/permissions?status=PENDING&stage=hod&class_id=${activeClass.id}`
    : "/api/permissions?status=PENDING&stage=hod";

  return (
<<<<<<< HEAD
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
=======
    <div className="space-y-4 p-2 min-w-0">
      {classes.length > 1 ? (
        /* Scope picker: year × section chips, persisted in URL */
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
            <PencilLine className="w-3.5 h-3.5" /> Your classes
          </p>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {classes.map((c) => {
              const isActive = activeClass?.id === c.id;
              return (
                <a
                  key={c.id}
                  href={`/faculty?class_id=${c.id}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] border border-[var(--action-primary)]/30"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                  }`}
                >
                  Year {c.year} &middot; {c.section}
                  {c.name ? ` · ${c.name}` : ""}
                </a>
              );
            })}
          </div>
        </div>
      ) : activeClass ? (
        /* Single resolved class banner */
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Your class
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
            Year {activeClass.year} &middot; {activeClass.section}
            {activeClass.name ? ` · ${activeClass.name}` : ""}
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
          </p>
        </div>
      ) : null}

      {/* Kanban board of the HOD-stage permission queue for the resolved class */}
      <KanbanBoard
        source={boardSource}
        itemKey="permission"
        columns={["PENDING", "APPROVED", "REJECTED"]}
        onSelect={() => {}}
      />
    </div>
  );
}

export default function FacultyPage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <FacultyInner />
      </Suspense>
    </AuthGuard>
  );
}
