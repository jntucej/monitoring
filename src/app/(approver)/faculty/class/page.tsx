"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiResource } from "@/hooks/useApiResource";
import { GraduationCap, ArrowRight } from "lucide-react";

/* /api/faculty/my-classes response */
interface MyClassRow {
  id: string;
  departmentId: string;
  year: number;
  section: string;
  name: string | null;
  capacity: number | null;
  subjectCodes?: string[];
}
interface MyClassesResponse {
  success: boolean;
  data: MyClassRow[];
}

function FacultyClassIndexInner() {
  const [role, setRole] = useState<"class_teacher" | "all">("class_teacher");

  const {
    data,
    loading,
    error,
  } = useApiResource<MyClassesResponse>(
    `/api/faculty/my-classes?role=${role === "all" ? "all" : "class_teacher"}`,
    { ttlMs: 30_000 },
  );

  const classes = data?.data ?? [];

  if (error) {
    return <EmptyState title="Could not load classes" description={String(error)} />;
  }

  if (loading && !data) {
    return <PageLoading />;
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No classes assigned"
        description="You have no classes assigned yet. Check back later or contact your department head."
      />
    );
  }

  return (
    <div className="space-y-3 p-2 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" /> My Classes
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setRole("class_teacher")}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
              role === "class_teacher"
                ? "border-action-primary text-action-primary bg-action-primary/10"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            Taught
          </button>
          <button
            onClick={() => setRole("all")}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
              role === "all"
                ? "border-action-primary text-action-primary bg-action-primary/10"
                : "border-border text-text-muted hover:text-text-primary"
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/faculty/class/${encodeURIComponent(c.id)}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg-surface p-3 hover:border-action-primary/40 hover:bg-bg-elevated transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                Year {c.year} &middot; {c.section}
                {c.name ? ` · ${c.name}` : ""}
              </p>
              <p className="text-[10px] text-text-muted font-mono">
                {c.capacity != null ? `cap ${c.capacity}` : "—"}
                {c.subjectCodes?.length ? ` · ${c.subjectCodes.join(", ")}` : ""}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function FacultyClassIndexPage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <FacultyClassIndexInner />
      </Suspense>
    </AuthGuard>
  );
}
